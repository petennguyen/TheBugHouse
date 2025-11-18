require('dotenv').config();

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || 'bughouse123';
process.env.DB_NAME = process.env.DB_NAME || 'BugHouse';

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

// ---- SendGrid ----
let sgMail = null;
try {
  sgMail = require('@sendgrid/mail');
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } else {
    console.warn('SENDGRID_API_KEY missing – email features disabled in dev.');
  }
} catch {
  console.warn('@sendgrid/mail not installed – email features disabled in dev.');
}

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: false,
  })
);
app.use(express.json());

// ---- Firebase Admin ----
const admin = require('firebase-admin');
let serviceAccount;
try {
  serviceAccount = require('./firebaseAdmin/serviceAccountKey.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (e) {
  console.warn(
    'firebaseAdmin/serviceAccountKey.json missing – Firebase Admin features disabled in dev.'
  );
}

// ✅ MySQL Database Connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};
const pool = mysql.createPool(dbConfig);

// === JWT config ===
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// ---- Auth helpers ----
function getTokenFromHeader(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function authRequired(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me_now');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('authRequired error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

app.use((req, res, next) => {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me_now');
      req.user = decoded;
    } catch (e) {
    }
  }
  next();
});

try {
  const tutorAppRouter = require('./routes/tutorApplication');
  app.use('/api', tutorAppRouter);
} catch (e) {
  console.warn('Could not mount tutor application routes:', e && e.message ? e.message : e);
}

// ---- Subjects ----
app.get('/api/subjects', authRequired, async (req, res) => {
  try {
    let [rows] = await pool.execute('SHOW COLUMNS FROM Academic_Subject LIKE "subjectCode"');
    let query;
    if (rows.length > 0) {
      query = 'SELECT subjectID, subjectName, subjectCode FROM Academic_Subject ORDER BY subjectName';
    } else {
      query = 'SELECT subjectID, subjectName FROM Academic_Subject ORDER BY subjectName';
    }
    [rows] = await pool.execute(query);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load subjects' });
  }
});
app.post('/api/subjects', authRequired, requireRole('Admin'), async (req, res) => {
  const { subjectName } = req.body || {};
  if (!subjectName) return res.status(400).json({ message: 'subjectName required' });
  try {
    await pool.execute(
      'INSERT INTO Academic_Subject (subjectName) VALUES (?) ON DUPLICATE KEY UPDATE subjectName=VALUES(subjectName)',
      [subjectName]
    );
    res.json({ message: 'Subject upserted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to save subject' });
  }
});
app.delete('/api/subjects/:id', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM Academic_Subject WHERE subjectID = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to delete subject' });
  }
});

// ---- Session booking ----
app.post('/api/sessions/book', authRequired, requireRole('Student'), async (req, res) => {
  const { timeslotID, scheduleID } = req.body;
  if (!timeslotID || !scheduleID) {
    return res.status(400).json({ message: 'timeslotID and scheduleID required' });
  }
  try {
    const [conf] = await pool.execute(
      `
      SELECT tl.timeslotID, tl.Daily_Schedule_scheduleID, tl.Academic_Subject_subjectID,
             tl.Tutor_System_User_userID
      FROM Timeslot tl
      LEFT JOIN Tutor_Session sess
        ON sess.Timeslot_timeslotID = tl.timeslotID
       AND sess.Timeslot_Daily_Schedule_scheduleID = tl.Daily_Schedule_scheduleID
      WHERE tl.timeslotID = ? AND tl.Daily_Schedule_scheduleID = ? AND sess.sessionID IS NULL
      `,
      [timeslotID, scheduleID]
    );
    if (conf.length === 0)
      return res.status(409).json({ message: 'Timeslot is no longer available' });

    const row = conf[0];
    await pool.execute(
      `
      INSERT INTO Tutor_Session
        (Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
         Tutor_System_User_userID, Student_System_User_userID, sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
      `,
      [
        row.timeslotID,
        row.Daily_Schedule_scheduleID,
        row.Academic_Subject_subjectID,
        row.Tutor_System_User_userID,
        req.user.userID,
      ]
    );
    res.json({ message: 'Booked!' });
  } catch (e) {
    console.error('book session error', e);
    res.status(500).json({ message: 'Failed to book session' });
  }
});

app.post('/api/sessions/:sessionID/check-in', authRequired, requireRole('Student'), async (req, res) => {
  const { sessionID } = req.params;
  
  try {
    const [[session]] = await pool.execute(
      `SELECT sessionID, sessionSignInTime FROM Tutor_Session 
       WHERE sessionID = ? AND Student_System_User_userID = ?`,
      [sessionID, req.user.userID]
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.sessionSignInTime) {
      return res.status(400).json({ message: 'Already checked in' });
    }
    
    await pool.execute(
      `UPDATE Tutor_Session 
       SET sessionSignInTime = NOW(3) 
       WHERE sessionID = ?`,
      [sessionID]
    );
    
    res.json({ message: 'Checked in successfully' });
  } catch (e) {
    console.error('Check-in error:', e);
    res.status(500).json({ message: 'Failed to check in' });
  }
});



// --- MIGRATION: Add 'subjects' column to Tutor_Availability if missing ---
async function ensureSubjectsColumn() {
  try {
    const [cols] = await pool.execute("SHOW COLUMNS FROM Tutor_Availability LIKE 'subjects'");
    if (cols.length === 0) {
      await pool.execute("ALTER TABLE Tutor_Availability ADD COLUMN subjects VARCHAR(255) DEFAULT NULL");
      console.log("Added 'subjects' column to Tutor_Availability");
    }
  } catch (e) {
    console.error('Migration error (subjects column):', e);
  }
}
ensureSubjectsColumn();

app.get('/api/availability/mine', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT availabilityID, dayOfWeek, startTime, endTime, subjects
       FROM Tutor_Availability WHERE Tutor_System_User_userID = ? ORDER BY FIELD(dayOfWeek,'Mon','Tue','Wed','Thu','Fri','Sat','Sun'), startTime`,
      [req.user.userID]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load availability' });
  }
});

app.post('/api/availability', authRequired, requireRole('Tutor'), async (req, res) => {
  const { dayOfWeek, startTime, endTime, subjects } = req.body || {};
  if (!dayOfWeek || !startTime || !endTime) return res.status(400).json({ message: 'dayOfWeek, startTime, endTime required' });
  let subjectsStr = null;
  if (Array.isArray(subjects) && subjects.length > 0) {
    const placeholders = subjects.map(() => '?').join(',');
    const [subRows] = await pool.execute(`SELECT subjectName FROM Academic_Subject WHERE subjectID IN (${placeholders})`, subjects);
    subjectsStr = subRows.map(r => r.subjectName).join(', ');
  }
  try {
    await pool.execute(
      `INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime, subjects)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.userID, dayOfWeek, startTime, endTime, subjectsStr]
    );
    res.json({ message: 'Availability added' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to add availability' });
  }
});

app.post('/api/sessions/book-from-availability', authRequired, requireRole('Student'), async (req, res) => {
  const { tutorID, dayOfWeek, startTime, date, subjectID, sessionLength } = req.body;
  if (!tutorID || !dayOfWeek || !startTime || !date || !subjectID || !sessionLength) {
    return res
      .status(400)
      .json({ message: 'All fields required: tutorID, dayOfWeek, startTime, date, subjectID, sessionLength' });
  }
  try {
    const [availabilityCheck] = await pool.execute(
      'SELECT * FROM Tutor_Availability WHERE Tutor_System_User_userID = ? AND dayOfWeek = ? AND startTime <= ? AND endTime >= ?',
      [tutorID, dayOfWeek, startTime, startTime]
    );
    if (availabilityCheck.length === 0) {
      return res.status(404).json({ message: 'Tutor not available at this time' });
    }
    let scheduleID;
    const [existingSchedule] = await pool.execute(
      'SELECT scheduleID FROM Daily_Schedule WHERE scheduleDate = ?',
      [date]
    );
    if (existingSchedule.length > 0) {
      scheduleID = existingSchedule[0].scheduleID;
    } else {
      const [adminUser] = await pool.execute('SELECT System_User_userID FROM Administrator LIMIT 1');
      if (adminUser.length === 0) {
        return res.status(500).json({ message: 'No admin user found to create schedule' });
      }
      const [scheduleResult] = await pool.execute(
        'INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate) VALUES (?, ?)',
        [adminUser[0].System_User_userID, date]
      );
      scheduleID = scheduleResult.insertId;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + sessionLength * 60000);
    const endTime = endDateTime.toTimeString().slice(0, 5);

    const [timeslotResult] = await pool.execute(
      'INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime) VALUES (?, ?, ?, ?, ?)',
      [scheduleID, subjectID, tutorID, startTime, endTime]
    );
    const timeslotID = timeslotResult.insertId;

    await pool.execute(
      'INSERT INTO Tutor_Session (Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, Student_System_User_userID) VALUES (?, ?, ?, ?, ?)',
      [timeslotID, scheduleID, subjectID, tutorID, req.user.userID]
    );

    res.json({
      message: 'Session booked successfully from availability',
      timeslotID,
      scheduleID,
    });
  } catch (e) {
    console.error('Book from availability error:', e);
    res.status(500).json({ message: 'Failed to book session from availability' });
  }
});

// ---- Available timeslots (filter by date & subject) ----
app.get('/api/timeslots/available', authRequired, async (req, res) => {
  const { date, subjectId } = req.query;
  if (!date || !subjectId) return res.status(400).json({ message: 'date and subjectId required' });
  try {
    const [rows] = await pool.execute(
      `
      SELECT 
        t.timeslotID,
        t.timeslotStartTime,
        t.timeslotEndTime,
        ds.scheduleID,
        ds.scheduleDate,
        sub.subjectName,
        su.userFirstName AS tutorFirstName,
        su.userLastName AS tutorLastName,
        CASE WHEN ts.sessionID IS NOT NULL THEN 1 ELSE 0 END as isBooked
      FROM Timeslot t
      JOIN Daily_Schedule ds ON ds.scheduleID = t.Daily_Schedule_scheduleID
      JOIN Academic_Subject sub ON sub.subjectID = t.Academic_Subject_subjectID
      JOIN System_User su ON su.userID = t.Tutor_System_User_userID
      LEFT JOIN Tutor_Session ts ON ts.Timeslot_timeslotID = t.timeslotID 
                                 AND ts.Timeslot_Daily_Schedule_scheduleID = t.Daily_Schedule_scheduleID
      WHERE ds.scheduleDate = ? 
        AND t.Academic_Subject_subjectID = ?
        AND ts.sessionID IS NULL
      ORDER BY t.timeslotStartTime
      `,
      [date, subjectId]
    );
    res.json(rows);
  } catch (e) {
    console.error('Available timeslots error:', e);
    res.status(500).json({ message: 'Failed to load available timeslots' });
  }
});

// ---- My sessions ----
app.get('/api/sessions/mine', authRequired, async (req, res) => {
  try {
    let query = '';
    let params = [];

    if (req.user.role === 'Student') {
      query = `
        SELECT
          sess.sessionID, ds.scheduleDate,
          subj.subjectName,
          tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, 
          sess.sessionFeedback, sess.sessionRating,
          sess.sessionStatus
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID 
                         AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
        WHERE sess.Student_System_User_userID = ?
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
      params = [req.user.userID];
    } else if (req.user.role === 'Tutor') {
      query = `
        SELECT
          sess.sessionID, ds.scheduleDate,
          subj.subjectName,
          ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, 
          sess.sessionFeedback, sess.sessionRating,
          sess.sessionStatus
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID 
                         AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User ssu ON ssu.userID = sess.Student_System_User_userID
        WHERE sess.Tutor_System_User_userID = ?
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
      params = [req.user.userID];
    } else {
      query = `
        SELECT
          sess.sessionID, ds.scheduleDate, subj.subjectName,
          tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
          ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, 
          sess.sessionFeedback, sess.sessionRating,
          sess.sessionStatus
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID 
                         AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
        JOIN System_User ssu ON ssu.userID = sess.Student_System_User_userID
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (e) {
    console.error('mine sessions error', e);
    res.status(500).json({ message: 'Failed to load sessions' });
  }
});

// ---- Student calendar ----
app.get('/api/student/calendar', authRequired, requireRole('Student'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        sess.sessionID,
        ds.scheduleDate,
        tl.timeslotStartTime,
        tl.timeslotEndTime,
        subj.subjectName,
        tsu.userFirstName AS tutorFirstName,
        tsu.userLastName  AS tutorLastName,
        sess.sessionSignInTime,
        sess.sessionSignOutTime,
        sess.sessionStatus
      FROM Tutor_Session sess
      JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID
                       AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
      JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
      JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
      JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
      WHERE sess.Student_System_User_userID = ?
      ORDER BY ds.scheduleDate, tl.timeslotStartTime, sess.sessionID
      `,
      [req.user.userID]
    );

    const events = rows.map((r) => {
      const dateStr =
        r.scheduleDate instanceof Date
          ? r.scheduleDate.toISOString().slice(0, 10)
          : String(r.scheduleDate).slice(0, 10);

      const title = `${r.subjectName} with ${r.tutorFirstName} ${r.tutorLastName}`;
      const ext = {
        subject: r.subjectName,
        tutorName: `${r.tutorFirstName} ${r.tutorLastName}`,
        status: r.sessionStatus || '',
        sessionSignInTime: r.sessionSignInTime,
        sessionSignOutTime: r.sessionSignOutTime,
      };

      if (r.timeslotStartTime && r.timeslotEndTime) {
        const startHHMM = String(r.timeslotStartTime).slice(0, 5);
        const endHHMM   = String(r.timeslotEndTime).slice(0, 5);
        return {
          id: r.sessionID,
          title,
          start: `${dateStr}T${startHHMM}`,
          end:   `${dateStr}T${endHHMM}`,
          allDay: false,
          extendedProps: ext,
        };
      }

      // Fallback all-day
      return {
        id: r.sessionID,
        title,
        start: dateStr,
        end: dateStr,
        allDay: true,
        extendedProps: ext,
      };
    });

    res.json(events);
  } catch (e) {
    console.error('student calendar error', e);
    res.status(500).json({ message: 'Failed to load calendar' });
  }
});


// ---- Tutor calendar ----
app.get('/api/tutor/calendar', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        sess.sessionID,
        sess.sessionStatus,
        sess.sessionSignInTime,
        sess.sessionSignOutTime,
        ds.scheduleDate,
        tl.timeslotStartTime,
        tl.timeslotEndTime,
        subj.subjectName,
        stu.userFirstName AS studentFirstName,
        stu.userLastName  AS studentLastName
      FROM Tutor_Session sess
      JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID
                       AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
      JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
      JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
      JOIN System_User stu ON stu.userID = sess.Student_System_User_userID
      WHERE sess.Tutor_System_User_userID = ?
      ORDER BY ds.scheduleDate, tl.timeslotStartTime, sess.sessionID
      `,
      [req.user.userID]
    );

        const events = rows.map((r) => {
          const dateStr =
            r.scheduleDate instanceof Date
              ? r.scheduleDate.toISOString().slice(0, 10)
              : String(r.scheduleDate).slice(0, 10);

          const title = `${r.subjectName} with ${r.studentFirstName} ${r.studentLastName}`;

          const baseExt = {
            subject: r.subjectName,
            studentName: `${r.studentFirstName} ${r.studentLastName}`,
            status: r.sessionStatus || '',
            sessionSignInTime: r.sessionSignInTime,
            sessionSignOutTime: r.sessionSignOutTime,
          };

          if (r.timeslotStartTime && r.timeslotEndTime) {
            const startHHMM = String(r.timeslotStartTime).slice(0, 5);
            const endHHMM   = String(r.timeslotEndTime).slice(0, 5);
            return {
              id: r.sessionID,
              title,
              start: `${dateStr}T${startHHMM}`,
              end:   `${dateStr}T${endHHMM}`,
              allDay: false,
              extendedProps: baseExt,
            };
          }

          return {
            id: r.sessionID,
            title,
            start: dateStr,
            end: dateStr,
            allDay: true,
            extendedProps: baseExt,
          };
        });


    res.json(events);
  } catch (e) {
    console.error('tutor calendar error', e);
    res.status(500).json({ message: 'Failed to load tutor calendar' });
  }
});

// ---- Student feedback ----
app.post('/api/sessions/:sessionID/feedback', authRequired, requireRole('Student'), async (req, res) => {
  const { sessionID } = req.params;
  const { feedback, rating } = req.body || {};
  try {
    const [r] = await pool.execute(
      `UPDATE Tutor_Session
       SET sessionFeedback = ?, sessionRating = ?
       WHERE sessionID = ? AND Student_System_User_userID = ?`,
      [feedback || null, rating ?? null, sessionID, req.user.userID]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Feedback saved' });
  } catch (e) {
    console.error('feedback error', e);
    res.status(500).json({ message: 'Failed to save feedback' });
  }
});

// --- Completed sessions ----

app.get('/api/sessions/completed', authRequired, async (req, res) => {
  try {
    let query = '';
    let params = [];
    if (req.user.role === 'Student') {
      query = `
        SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
          tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
        WHERE sess.Student_System_User_userID = ?
          AND sess.sessionSignInTime IS NOT NULL
          AND sess.sessionSignOutTime IS NOT NULL
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
      params = [req.user.userID];
    } else if (req.user.role === 'Tutor') {
      query = `
        SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
          ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User ssu ON ssu.userID = sess.Student_System_User_userID
        WHERE sess.Tutor_System_User_userID = ?
          AND sess.sessionSignInTime IS NOT NULL
          AND sess.sessionSignOutTime IS NOT NULL
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
      params = [req.user.userID];
    } else {
      query = `
        SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
          tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
          ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
        JOIN System_User ssu ON ssu.userID = sess.Student_System_User_userID
        WHERE sess.sessionSignInTime IS NOT NULL
          AND sess.sessionSignOutTime IS NOT NULL
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
    }
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (e) {
    console.error('completed sessions error', e);
    res.status(500).json({ message: 'Failed to load completed sessions' });
  }
});


// ---- Tutor attendance / status ----
app.post('/api/sessions/:sessionID/attended', authRequired, requireRole('Tutor'), async (req, res) => {
  const { sessionID } = req.params;
  try {
    const [[row]] = await pool.execute(
      `SELECT sessionSignInTime, sessionSignOutTime FROM Tutor_Session
       WHERE sessionID = ? AND Tutor_System_User_userID = ?`,
      [sessionID, req.user.userID]
    );
    if (!row) return res.status(404).json({ message: 'Session not found' });

    if (!row.sessionSignInTime) {
      await pool.execute(
        `UPDATE Tutor_Session SET sessionSignInTime = NOW(3) WHERE sessionID = ? AND Tutor_System_User_userID = ?`,
        [sessionID, req.user.userID]
      );
      return res.json({ message: 'Sign-in recorded' });
    } else if (!row.sessionSignOutTime) {
      await pool.execute(
        `UPDATE Tutor_Session SET sessionSignOutTime = NOW(3) WHERE sessionID = ? AND Tutor_System_User_userID = ?`,
        [sessionID, req.user.userID]
      );
      return res.json({ message: 'Sign-out recorded' });
    } else {
      return res.json({ message: 'Already signed in and out' });
    }
  } catch (e) {
    console.error('attended error', e);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

app.post('/api/sessions/:sessionID/status', authRequired, requireRole('Tutor'), async (req, res) => {
  const { sessionID } = req.params;
  const { status } = req.body;
  if (!['completed', 'no_show', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const [[session]] = await pool.execute(
      `SELECT sessionID, sessionSignInTime, sessionSignOutTime FROM Tutor_Session 
       WHERE sessionID = ? AND Tutor_System_User_userID = ?`,
      [sessionID, req.user.userID]
    );
    if (!session) return res.status(404).json({ message: 'Session not found' });

    let updateQuery = '';
    if (status === 'completed') {
      updateQuery = `
        UPDATE Tutor_Session 
        SET sessionSignInTime = COALESCE(sessionSignInTime, NOW(3)),
            sessionSignOutTime = NOW(3),
            sessionStatus = 'completed'
        WHERE sessionID = ?
      `;
    } else if (status === 'no_show') {
      updateQuery = `UPDATE Tutor_Session SET sessionStatus = 'no_show' WHERE sessionID = ?`;
    } else if (status === 'cancelled') {
      updateQuery = `UPDATE Tutor_Session SET sessionStatus = 'cancelled' WHERE sessionID = ?`;
    }
    await pool.execute(updateQuery, [sessionID]);
    res.json({ message: `Session marked as ${status}` });
  } catch (e) {
    console.error('Update status error:', e);
    res.status(500).json({ message: 'Failed to update session status' });
  }
});

// ---- Cancel session ----
app.delete('/api/sessions/:id', authRequired, async (req, res) => {
  const sessionID = Number(req.params.id);
  if (!sessionID) return res.status(400).json({ message: 'Invalid session id' });

  try {
    let where = 'sessionID = ?';
    const params = [sessionID];

    if (req.user.role === 'Student') {
      where += ' AND Student_System_User_userID = ?';
      params.push(req.user.userID);
    } else if (req.user.role === 'Tutor') {
      where += ' AND Tutor_System_User_userID = ?';
      params.push(req.user.userID);
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }

    const [r] = await pool.execute(`DELETE FROM Tutor_Session WHERE ${where}`, params);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Session not found or not permitted to cancel' });
    }
    res.json({ message: 'Session cancelled' });
  } catch (e) {
    console.error('cancel session error', e);
    res.status(500).json({ message: 'Failed to cancel session' });
  }
});

// ---- Tutor availability ----
app.get('/api/availability/mine', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT availabilityID, dayOfWeek, startTime, endTime, subjects FROM Tutor_Availability WHERE Tutor_System_User_userID = ? ORDER BY FIELD(dayOfWeek, "Mon","Tue","Wed","Thu","Fri","Sat","Sun"), startTime',
      [req.user.userID]
    );
    res.json(rows);
  } catch (e) {
    console.error('availability mine error', e);
    res.status(500).json({ message: 'Failed to load availability' });
  }
});

app.post('/api/availability', authRequired, requireRole('Tutor'), async (req, res) => {
  const { dayOfWeek, startTime, endTime, subjects } = req.body;
  if (!dayOfWeek || !startTime || !endTime || !subjects?.length) {
    return res.status(400).json({ message: 'dayOfWeek, startTime, endTime, and subjects required' });
  try {
    const [subjectRows] = await pool.execute(
      `SELECT subjectCode, subjectName FROM Academic_Subject WHERE subjectID IN (${subjects.map(() => '?').join(',')})`,
      subjects
    );
    const subjectNames = subjectRows.map(row => `${row.subjectCode} - ${row.subjectName}`).join(', ');

    await pool.execute(
      'INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime, subjects) VALUES (?, ?, ?, ?, ?)',
      [req.user.userID, dayOfWeek, startTime, endTime, subjectNames]
    );
    res.json({ message: 'Availability added' });
  } catch (e) {
    console.error('availability add error', e);
    res.status(500).json({ message: 'Failed to add availability' });
  }
  }
});

app.get('/api/tutor/availability', async (req, res) => {
  const { dayOfWeek, subjectId } = req.query;
  try {
    let query = `
      SELECT 
        ta.availabilityID,
        ta.dayOfWeek, 
        ta.startTime, 
        ta.endTime,
        ta.subjects,
        su.userID as tutorUserID,
        su.userFirstName AS tutorFirstName, 
        su.userLastName AS tutorLastName
      FROM Tutor_Availability ta
      JOIN System_User su ON su.userID = ta.Tutor_System_User_userID
      WHERE 1=1
    `;
    const params = [];

    if (dayOfWeek) {
      query += ' AND ta.dayOfWeek = ?';
      params.push(dayOfWeek);
    }
    if (subjectId) {
      const [subjectRows] = await pool.execute(
        'SELECT subjectName FROM Academic_Subject WHERE subjectID = ?',
        [subjectId]
      );
      if (subjectRows && subjectRows.length > 0) {
        query += ' AND (ta.subjects LIKE ? OR ta.subjects IS NULL)';
        params.push(`%${subjectRows[0].subjectName}%`);
      }
    }
    query += ' ORDER BY su.userLastName, su.userFirstName, ta.startTime';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (e) {
    console.error('tutor availability error', e);
    res.status(500).json({ message: 'Failed to load tutor availability' });
  }
});

app.delete('/api/availability/:id', authRequired, requireRole('Tutor'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      'DELETE FROM Tutor_Availability WHERE availabilityID = ? AND Tutor_System_User_userID = ?',
      [id, req.user.userID]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Availability not found or not yours to delete' });
    }
    res.json({ message: 'Availability deleted successfully' });
  } catch (e) {
    console.error('Delete availability error:', e);
    res.status(500).json({ message: 'Failed to delete availability' });
  }
});

// ---- Authentication ----
app.get('/api/user/profile', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole FROM System_User WHERE userID = ?',
      [req.user.userID]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

app.post('/api/auth/login-database-first', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userPassword, userRole FROM System_User WHERE userEmail = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    if (user.userPassword !== password) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        userID: user.userID,
        email: user.userEmail,
        role: user.userRole,
        firstName: user.userFirstName,
        lastName: user.userLastName,
      },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({
      message: 'Login successful',
      token,
      user: {
        userID: user.userID,
        userFirstName: user.userFirstName,
        userLastName: user.userLastName,
        userEmail: user.userEmail,
        userRole: user.userRole,
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, firebaseUID } = req.body;
  if (!email || (!password && !firebaseUID)) {
    return res.status(400).json({ message: 'Email and either password or firebaseUID required' });
  }

  try {
    if (firebaseUID) {
      const [rows] = await pool.execute(
        'SELECT userID, userFirstName, userLastName, userEmail, userPassword, userRole, firebaseUID FROM System_User WHERE userEmail = ?',
        [email]
      );
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Please complete signup' });
      }
      const user = rows[0];

      if (!user.firebaseUID || user.firebaseUID === 'firebase_user') {
        await pool.execute('UPDATE System_User SET firebaseUID = ? WHERE userID = ?', [firebaseUID, user.userID]);
      } else if (user.firebaseUID !== firebaseUID) {
        return res.status(401).json({ message: 'Firebase UID mismatch' });
      }

      const token = jwt.sign(
        {
          userID: user.userID,
          email: user.userEmail,
          role: user.userRole,
          firstName: user.userFirstName,
          lastName: user.userLastName,
        },
        process.env.JWT_SECRET || 'change_me_now',
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        message: 'Login successful',
        success: true,
        token,
        role: user.userRole,
        userID: user.userID,
        user: {
          userID: user.userID,
          userFirstName: user.userFirstName,
          userLastName: user.userLastName,
          userEmail: user.userEmail,
          userRole: user.userRole,
        },
      });
    }

    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userPassword, userRole FROM System_User WHERE userEmail = ?',
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    if (user.userPassword !== password) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        userID: user.userID,
        email: user.userEmail,
        role: user.userRole,
        firstName: user.userFirstName,
        lastName: user.userLastName,
      },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      success: true,
      token,
      role: user.userRole,
      userID: user.userID,
      user: {
        userID: user.userID,
        userFirstName: user.userFirstName,
        userLastName: user.userLastName,
        userEmail: user.userEmail,
        userRole: user.userRole,
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { userFirstName, userLastName, userEmail, userPassword, userRole } = req.body;
  if (!userFirstName || !userLastName || !userEmail || !userPassword || !userRole) {
    return res.status(400).json({ message: 'All fields required' });
  }
  if (!['Admin', 'Tutor', 'Student'].includes(userRole)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const [existing] = await pool.execute(
      'SELECT userID FROM System_User WHERE userEmail = ?',
      [userEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole) VALUES (?, ?, ?, ?, ?)',
      [userFirstName, userLastName, userEmail, userPassword, userRole]
    );
    const userID = result.insertId;

    if (userRole === 'Admin') {
      await pool.execute('INSERT INTO Administrator (System_User_userID, accessLevel) VALUES (?, 1)', [userID]);
    } else if (userRole === 'Tutor') {
      await pool.execute('INSERT INTO Tutor (System_User_userID) VALUES (?)', [userID]);
    } else if (userRole === 'Student') {
      await pool.execute('INSERT INTO Student (System_User_userID) VALUES (?)', [userID]);
    }

    const token = jwt.sign(
      {
        userID,
        email: userEmail,
        role: userRole,
        firstName: userFirstName,
        lastName: userLastName,
      },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: { userID, userFirstName, userLastName, userEmail, userRole },
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/api/auth/complete-signup', async (req, res) => {
  const { firebaseUID, name, email, role } = req.body;
  if (!firebaseUID || !email || !role) {
    return res.status(400).json({ message: 'firebaseUID, email, and role required' });
  }

  const nameParts = (name || '').trim().split(/\s+/);
  const userFirstName = nameParts[0] || 'User';
  const userLastName = nameParts.slice(1).join(' ') || 'Name';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [exists] = await conn.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole, firebaseUID FROM System_User WHERE userEmail = ?',
      [email]
    );

    let userID;
    let finalRole = role;

    if (exists.length > 0) {
      const u = exists[0];
      userID = u.userID;
      finalRole = u.userRole || role;

      if (!u.firebaseUID || u.firebaseUID === 'firebase_user') {
        await conn.execute('UPDATE System_User SET firebaseUID = ? WHERE userID = ?', [firebaseUID, userID]);
      }

      if (finalRole === 'Admin') {
        await conn.execute(
          'INSERT IGNORE INTO Administrator (System_User_userID, accessLevel) VALUES (?, 1)',
          [userID]
        );
      } else if (finalRole === 'Tutor') {
        await conn.execute('INSERT IGNORE INTO Tutor (System_User_userID) VALUES (?)', [userID]);
      } else if (finalRole === 'Student') {
        await conn.execute('INSERT IGNORE INTO Student (System_User_userID) VALUES (?)', [userID]);
      }
    } else {
      const [ins] = await conn.execute(
        'INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole, firebaseUID) VALUES (?, ?, ?, ?, ?, ?)',
        [userFirstName, userLastName, email, 'firebase_user', role, firebaseUID]
      );
      userID = ins.insertId;

      if (role === 'Admin') {
        await conn.execute('INSERT INTO Administrator (System_User_userID, accessLevel) VALUES (?, 1)', [userID]);
      } else if (role === 'Tutor') {
        await conn.execute('INSERT INTO Tutor (System_User_userID) VALUES (?)', [userID]);
      } else if (role === 'Student') {
        await conn.execute('INSERT INTO Student (System_User_userID) VALUES (?)', [userID]);
      }
    }

    await conn.commit();

    const token = jwt.sign(
      { userID, email, role: finalRole, firstName: userFirstName, lastName: userLastName },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: 'Account completed successfully',
      success: true,
      token,
      role: finalRole,
      userID,
      user: { userID, userFirstName, userLastName, userEmail: email, userRole: finalRole },
    });
  } catch (e) {
    await conn.rollback();
    console.error('Complete signup error:', e);
    return res.status(500).json({ message: 'Failed to complete signup' });
  } finally {
    conn.release();
  }
});

app.post('/api/auth/send-verification', authRequired, async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ message: 'Firebase Admin not initialized' });
    }
    const email = req.user?.email || req.body?.email;
    if (!email) return res.status(400).json({ message: 'email required' });

    const actionCodeSettings = {
      url: (process.env.CLIENT_ORIGIN || 'http://localhost:3000') + '/login?message=verify-complete',
      handleCodeInApp: false,
    };

    const verifyLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
    res.json({ verifyLink });
  } catch (e) {
    console.error('send-verification error:', e);
    res.status(500).json({ message: 'Failed to send verification link', error: e.message });
  }
});

// ---- Admin & Analytics ----
app.get('/api/analytics/overview', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [sessionRows] = await pool.execute('SELECT COUNT(*) as totalSessions FROM Tutor_Session');
    const [studentRows] = await pool.execute('SELECT COUNT(*) as totalStudents FROM Student');
    const [tutorRows]   = await pool.execute('SELECT COUNT(*) as totalTutors FROM Tutor');
    const [ratingRows]  = await pool.execute('SELECT AVG(sessionRating) as avgRating FROM Tutor_Session WHERE sessionRating IS NOT NULL');
    res.json({
      totalSessions: sessionRows[0].totalSessions,
      totalStudents: studentRows[0].totalStudents,
      totalTutors: tutorRows[0].totalTutors,
      avgRating: ratingRows[0].avgRating || 0
    });
  } catch (e) {
    console.error('Analytics overview error:', e);
    res.status(500).json({ message: 'Failed to load analytics overview' });
  }
});

app.get('/api/admin/students', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        su.userID as studentUserID,
        su.userFirstName AS studentFirstName,
        su.userLastName AS studentLastName,
        su.userEmail AS studentEmail,
        s.studentIDCard,
        s.studentLearningGoals
      FROM System_User su
      JOIN Student s ON s.System_User_userID = su.userID
      WHERE su.userRole = 'Student'
      ORDER BY su.userLastName, su.userFirstName
    `);
    res.json(rows);
  } catch (e) {
    console.error('Get students error:', e);
    res.status(500).json({ message: 'Failed to load students' });
  }
});

app.post('/api/admin/schedules', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleDate } = req.body;
  if (!scheduleDate) return res.status(400).json({ message: 'scheduleDate required' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate) VALUES (?, ?)',
      [req.user.userID, scheduleDate]
    );
    res.json({ message: 'Schedule created successfully', scheduleId: result.insertId });
  } catch (e) {
    console.error('Create schedule error', e);
    res.status(500).json({ message: 'Failed to create schedule' });
  }
});

app.get('/api/admin/schedules', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [schedules] = await pool.execute(
      `SELECT scheduleID, scheduleDate 
         FROM Daily_Schedule 
        ORDER BY scheduleDate DESC`
    );
    if (schedules.length === 0) return res.json([]);

    const ids = schedules.map(s => s.scheduleID);

    const [timeslots] = await pool.query(
      `SELECT t.timeslotID, 
              t.Daily_Schedule_scheduleID AS scheduleID,
              t.Academic_Subject_subjectID AS subjectID, subj.subjectName,
              t.Tutor_System_User_userID AS tutorID, 
              CONCAT(u.userFirstName, ' ', u.userLastName) AS tutorName,
              t.timeslotStartTime,
              t.timeslotEndTime
        FROM Timeslot t
        JOIN Academic_Subject subj ON t.Academic_Subject_subjectID = subj.subjectID
        JOIN System_User u ON t.Tutor_System_User_userID = u.userID
        WHERE t.Daily_Schedule_scheduleID IN (?)`,
      [ids]
    );

    const timeslotIds = timeslots.map(t => t.timeslotID);
    let sessions = [];
    if (timeslotIds.length > 0) {
      [sessions] = await pool.query(
        `SELECT s.sessionID, s.Timeslot_timeslotID AS timeslotID, 
                s.Timeslot_Daily_Schedule_scheduleID AS scheduleID,
                s.Student_System_User_userID AS studentID,
                stu.userFirstName AS studentFirstName, stu.userLastName AS studentLastName,
                s.sessionSignInTime, s.sessionSignOutTime,
                s.sessionFeedback, s.sessionRating
           FROM Tutor_Session s
           JOIN System_User stu ON s.Student_System_User_userID = stu.userID
          WHERE s.Timeslot_Daily_Schedule_scheduleID IN (?)`,
        [ids]
      );
    }

    const timeslotsWithSessions = timeslots.map(t => ({
      ...t,
      sessions: sessions.filter(s => s.timeslotID === t.timeslotID && s.scheduleID === t.scheduleID)
    }));

    const schedulesWithSlots = schedules.map(s => ({
      ...s,
      timeslots: timeslotsWithSessions.filter(t => t.scheduleID === s.scheduleID)
    }));

    res.json(schedulesWithSlots);
  } catch (e) {
    console.error('Error Fetching Schedules', e);
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
});

app.get('/api/admin/availableTutors', authRequired, requireRole('Admin'), async (req, res) => {
  try { 
    const [rows] = await pool.execute(
      `SELECT userID, CONCAT(userFirstName, ' ', userLastName) AS name FROM System_User WHERE userRole = ?`,
      ['Tutor']
    );
    res.json(rows); 
  } catch (err) {
    console.error('Error fetching tutors:', err);
    res.status(500).json({ error: 'Failed to fetch tutors' });
  } 
});

// Admin: search/list tutors (supports ?search=)
app.get('/api/admin/tutors', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const q = (req.query.search || '').trim();
    let sql = `
      SELECT userID, userFirstName, userLastName, userEmail
      FROM System_User
      WHERE userRole = 'Tutor'
    `;
    const params = [];
    if (q) {
      sql += ` AND (CONCAT(userFirstName, ' ', userLastName) LIKE ? OR userEmail LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY userLastName, userFirstName LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(r => ({ userID: r.userID, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail })));
  } catch (err) {
    console.error('Error searching tutors:', err);
    res.status(500).json({ message: 'Failed to search tutors' });
  }
});

// Admin: tutor performance report
app.get('/api/admin/tutor-performance/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const tutorId = Number(req.params.id);
  if (!tutorId) return res.status(400).json({ message: 'Invalid tutor id' });
  try {
    const [[tutorRow]] = await pool.execute('SELECT userID, userFirstName, userLastName, userEmail FROM System_User WHERE userID = ? AND userRole = ?', [tutorId, 'Tutor']);
    if (!tutorRow) return res.status(404).json({ message: 'Tutor not found' });

    const [[{ totalSessions }]] = await pool.execute(
      `SELECT COUNT(*) AS totalSessions FROM Tutor_Session WHERE Tutor_System_User_userID = ?`,
      [tutorId]
    );

    const [[{ averageRating }]] = await pool.execute(
      `SELECT AVG(sessionRating) AS averageRating FROM Tutor_Session WHERE Tutor_System_User_userID = ? AND sessionRating IS NOT NULL`,
      [tutorId]
    );

    const [frequentSubjects] = await pool.execute(
      `SELECT sub.subjectName, COUNT(*) AS count
       FROM Tutor_Session ts
       JOIN Academic_Subject sub ON sub.subjectID = ts.Academic_Subject_subjectID
       WHERE ts.Tutor_System_User_userID = ?
       GROUP BY sub.subjectID, sub.subjectName
       ORDER BY count DESC
       LIMIT 10`,
      [tutorId]
    );

    const [reviews] = await pool.execute(
      `SELECT ts.sessionFeedback, ts.sessionRating, sub.subjectName, ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName, ds.scheduleDate
       FROM Tutor_Session ts
       JOIN Academic_Subject sub ON sub.subjectID = ts.Academic_Subject_subjectID
       JOIN System_User ssu ON ssu.userID = ts.Student_System_User_userID
       LEFT JOIN Timeslot t ON t.timeslotID = ts.Timeslot_timeslotID
       LEFT JOIN Daily_Schedule ds ON ds.scheduleID = t.Daily_Schedule_scheduleID
       WHERE ts.Tutor_System_User_userID = ? AND (ts.sessionFeedback IS NOT NULL OR ts.sessionRating IS NOT NULL)
       ORDER BY ds.scheduleDate DESC, ts.sessionID DESC
       LIMIT 200`,
      [tutorId]
    );

    res.json({
      tutor: { userID: tutorRow.userID, firstName: tutorRow.userFirstName, lastName: tutorRow.userLastName, email: tutorRow.userEmail },
      totalSessions: totalSessions || 0,
      averageRating: averageRating || null,
      frequentSubjects,
      reviews,
    });
  } catch (err) {
    console.error('Error building tutor performance report:', err);
    res.status(500).json({ message: 'Failed to load tutor performance' });
  }
});

app.post('/api/schedules/generate', authRequired, requireRole('Admin'), async (req, res) => {
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ message: 'date required (YYYY-MM-DD)' });
  try {
    const [r] = await pool.execute(
      `INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate)
       VALUES (?, ?)`,
      [req.user.userID, date]
    );
    res.json({ message: 'Schedule created', scheduleID: r.insertId });
  } catch (e) { 
    console.error('create schedule error', e);
    res.status(500).json({ message: 'Failed to create schedule' });
  } 
});

app.post('/api/timeslots/generate', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleID, subjectID, tutorUserID, start, end, durationMinutes } = req.body || {};
  if (!scheduleID || !subjectID || !tutorUserID || !start || !end || !durationMinutes) {
    return res.status(400).json({ message: 'scheduleID, subjectID, tutorUserID, start, end, durationMinutes required' });
  }
  try {
    const [dsRows] = await pool.execute('SELECT scheduleID FROM Daily_Schedule WHERE scheduleID = ?', [scheduleID]);
    if (dsRows.length === 0) return res.status(404).json({ message: 'Schedule not found' });

    const toMinutes = (t) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const toHHMM = (mins) => {
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      return `${hh}:${mm}:00`;
    };

    const mStart = toMinutes(start);
    const mEnd = toMinutes(end);
    const dur = Number(durationMinutes);

    const values = [];
    for (let t = mStart; t + dur <= mEnd; t += dur) {
      const slotStart = toHHMM(t);
      const slotEnd = toHHMM(t + dur);
      values.push([scheduleID, subjectID, tutorUserID, slotStart, slotEnd]);
    }

    if (!values.length) return res.json({ message: 'No slots generated (check times)' });

    const [result] = await pool.query(
      `INSERT INTO Timeslot 
       (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime) VALUES ?`,
      [values]
    );

    res.json({ message: `Generated ${values.length} timeslots`, inserted: values.length, firstInsertId: result.insertId });
  } catch (e) { 
    console.error('generate timeslots error', e);
    res.status(500).json({ message: 'Failed to generate timeslots' });
  } 
});

app.delete('/api/admin/schedules/:scheduleId', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleId } = req.params;
  try {
    const [result] = await pool.execute(
      'DELETE FROM Daily_Schedule WHERE scheduleID = ?',
      [scheduleId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (e) {
    console.error('Delete schedule error:', e);
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
});
app.get('/api/admin/attendance-report', authRequired, requireRole('Admin'), async (req, res) => {
  try {
      const { startDate, endDate } = req.query;

      // Default: last 30 days
      const today = new Date();
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const defaultStart = past30.toISOString().slice(0, 10);
      const defaultEnd = today.toISOString().slice(0, 10);

      const [attendanceReport] = await pool.execute(
        ` SELECT 
            s.scheduleDate,
            a.subjectName,
            t.timeslotID,
            t.timeslotStartTime,
            t.timeslotEndTime,
            ts.sessionID,
            CONCAT(tutor.userFirstName, ' ', tutor.userLastName) AS tutorName,
            CONCAT(student.userFirstName, ' ', student.userLastName) AS studentName,
            ts.sessionSignInTime,
            ts.sessionSignOutTime,
            ts.sessionStatus
          FROM Daily_Schedule s
          JOIN Timeslot t 
            ON s.scheduleID = t.Daily_Schedule_scheduleID
          JOIN Academic_Subject a
            ON t.Academic_Subject_subjectID = a.subjectID
          LEFT JOIN Tutor_Session ts
            ON ts.Timeslot_timeslotID = t.timeslotID
            AND ts.Timeslot_Daily_Schedule_scheduleID = t.Daily_Schedule_scheduleID
          JOIN System_User tutor
            ON tutor.userID = t.Tutor_System_User_userID
          LEFT JOIN System_User student
            ON student.userID = ts.Student_System_User_userID
          WHERE s.scheduleDate BETWEEN ? AND ?
          ORDER BY s.scheduleDate ASC, t.timeslotStartTime ASC; `,
      [
        startDate || defaultStart,
        endDate || defaultEnd
      ]
      );

    res.json(attendanceReport);
  } catch (err) {
    console.error('Error fetching attendance report:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});
app.get('/api/admin/session-percentages', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const today = new Date();
    const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const defaultStart = past30.toISOString().slice(0, 10);
    const defaultEnd = today.toISOString().slice(0, 10);

    const [rows] = await pool.execute(
      `SELECT 
          a.subjectName,
          COUNT(*) AS sessionCount,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
      FROM Tutor_Session ts
      JOIN Academic_Subject a
        ON ts.Academic_Subject_subjectID = a.subjectID
      WHERE ts.sessionSignInTime BETWEEN ? AND ?
      GROUP BY a.subjectID, a.subjectName
      ORDER BY sessionCount DESC;
      `,
      [
        startDate || defaultStart,
        endDate || defaultEnd
      ]
    );

    res.json({
      labels: rows.map(r => r.subjectName),
      data: rows.map(r => r.sessionCount),
      percentages: rows.map(r => r.percentage)
    });

  } catch (err) {
    console.error('Error fetching session percentages:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});
app.get('/api/admin/subject-session-count', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const today = new Date();
    const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const defaultStart = past30.toISOString().slice(0, 10);
    const defaultEnd = today.toISOString().slice(0, 10);

    const [rows] = await pool.execute(
      `SELECT 
          a.subjectName,
          COUNT(*) AS sessionCount
      FROM Tutor_Session ts
      JOIN Academic_Subject a
        ON ts.Academic_Subject_subjectID = a.subjectID
      WHERE ts.sessionSignInTime BETWEEN ? AND ?
      GROUP BY a.subjectID, a.subjectName
      ORDER BY sessionCount DESC;`,
      [
        startDate || defaultStart,
        endDate || defaultEnd
      ]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching session totals:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});
app.get('/api/admin/tutor-average-ratings', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
          CONCAT(su.userFirstName, ' ', su.userLastName) AS tutorName,
          ROUND(AVG(ts.sessionRating), 2) AS avgRating,
          COUNT(ts.sessionRating) AS ratingCount
      FROM Tutor t
      JOIN System_User su 
          ON t.System_User_userID = su.userID
      LEFT JOIN Tutor_Session ts
          ON ts.Tutor_System_User_userID = t.System_User_userID
      WHERE ts.sessionRating IS NOT NULL
      GROUP BY 
          t.System_User_userID, 
          su.userFirstName, 
          su.userLastName
      HAVING COUNT(ts.sessionRating) > 0
      ORDER BY avgRating DESC;
    `);

    console.log("Tutor averages:", rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tutor average ratings:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});
app.get('/api/admin/feedback-analytics', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [subjectRatings] = await pool.execute(`
      SELECT 
        sub.subjectName,
        AVG(ts.sessionRating) as avgRating,
        COUNT(ts.sessionRating) as ratingCount
      FROM Academic_Subject sub
      LEFT JOIN Tutor_Session ts ON ts.Academic_Subject_subjectID = sub.subjectID
      WHERE ts.sessionRating IS NOT NULL
      GROUP BY sub.subjectID, sub.subjectName
      ORDER BY avgRating DESC
    `);

    const [tutorRatings] = await pool.execute(`
      SELECT 
        su.userFirstName,
        su.userLastName,
        AVG(ts.sessionRating) as avgRating,
        COUNT(ts.sessionRating) as ratingCount
      FROM System_User su
      JOIN Tutor_Session ts ON ts.Tutor_System_User_userID = su.userID
      WHERE ts.sessionRating IS NOT NULL
      GROUP BY su.userID, su.userFirstName, su.userLastName
      ORDER BY avgRating DESC
    `);

    const [recentFeedback] = await pool.execute(`
      SELECT 
        ts.sessionFeedback,
        ts.sessionRating,
        sub.subjectName,
        tsu.userFirstName AS tutorFirstName,
        tsu.userLastName AS tutorLastName,
        ssu.userFirstName AS studentFirstName,
        ssu.userLastName AS studentLastName,
        ds.scheduleDate
      FROM Tutor_Session ts
      JOIN Academic_Subject sub ON sub.subjectID = ts.Academic_Subject_subjectID
      JOIN System_User tsu ON tsu.userID = ts.Tutor_System_User_userID
      JOIN System_User ssu ON ssu.userID = ts.Student_System_User_userID
      JOIN Timeslot t ON t.timeslotID = ts.Timeslot_timeslotID
      JOIN Daily_Schedule ds ON ds.scheduleID = t.Daily_Schedule_scheduleID
      WHERE ts.sessionFeedback IS NOT NULL OR ts.sessionRating IS NOT NULL
      ORDER BY ds.scheduleDate DESC, ts.sessionID DESC
      LIMIT 20
    `);

    res.json({ subjectRatings, tutorRatings, recentFeedback });
  } catch (e) {
    console.error('Feedback analytics error', e);
    res.status(500).json({ message: 'Failed to load feedback analytics' });
  }
});

app.get('/api/admin/session-analytics', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [monthlyStats] = await pool.execute(`
      SELECT 
        DATE_FORMAT(ds.scheduleDate, '%Y-%m') as month,
        COUNT(ts.sessionID) as sessionCount,
        COUNT(CASE WHEN ts.sessionSignInTime IS NOT NULL THEN 1 END) as completedSessions
      FROM Daily_Schedule ds
      LEFT JOIN Timeslot t ON t.Daily_Schedule_scheduleID = ds.scheduleID
      LEFT JOIN Tutor_Session ts ON ts.Timeslot_timeslotID = t.timeslotID
      WHERE ds.scheduleDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(ds.scheduleDate, '%Y-%m')
      ORDER BY month DESC
    `);

    const [subjectStats] = await pool.execute(`
      SELECT 
        sub.subjectName,
        COUNT(ts.sessionID) as sessionCount,
        COUNT(CASE WHEN ts.sessionSignInTime IS NOT NULL THEN 1 END) as completedSessions
      FROM Academic_Subject sub
      LEFT JOIN Tutor_Session ts ON ts.Academic_Subject_subjectID = sub.subjectID
      GROUP BY sub.subjectID, sub.subjectName
      ORDER BY sessionCount DESC
    `);

    res.json({ monthlyStats, subjectStats });
  } catch (e) {
    console.error('Session analytics error', e);
    res.status(500).json({ message: 'Failed to load session analytics' });
  }
});

app.get('/api/admin/users', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT 
        su.userID,
        su.userFirstName,
        su.userLastName,
        su.userEmail,
        su.userRole,
        GROUP_CONCAT(DISTINCT ta.subjects SEPARATOR '||') AS subjects_concat
      FROM System_User su
      LEFT JOIN Tutor_Availability ta ON ta.Tutor_System_User_userID = su.userID
      GROUP BY su.userID
      ORDER BY su.userLastName, su.userFirstName
      `
    );

    const users = rows.map(r => {
      let subjects = [];
      if (r.subjects_concat) {
        subjects = r.subjects_concat
          .split('||')
          .flatMap(s => (s || '').split(',').map(x => x.trim()).filter(Boolean));
        subjects = Array.from(new Set(subjects));
      }
      return {
        userID: r.userID,
        userFirstName: r.userFirstName,
        userLastName: r.userLastName,
        email: r.userEmail,
        role: r.userRole,
        phone: null,
        createdAt: null,
        active: true,
        subjects,
      };
    });

    res.json(users);
  } catch (err) {
    console.error('Get admin users error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

app.patch('/api/admin/users/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  if (typeof updates.active === 'undefined') {
    return res.status(400).json({ message: 'No updatable fields provided. Supported: active' });
  }
  try {
    const [result] = await pool.execute(
      'UPDATE System_User SET active = ? WHERE userID = ?',
      [updates.active ? 1 : 0, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Patch admin user error:', err);
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(400).json({ message: "Database missing 'active' column on System_User. Add boolean `active` column or adjust endpoint." });
    }
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: 'Invalid user id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Tutor_Availability WHERE Tutor_System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Tutor WHERE System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Student WHERE System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Administrator WHERE System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Tutor_Session WHERE Student_System_User_userID = ? OR Tutor_System_User_userID = ?', [userId, userId]);

    const [result] = await conn.execute('DELETE FROM System_User WHERE userID = ?', [userId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: 'User not found' });
    }
    await conn.commit();
    conn.release();
    res.json({ message: 'User deleted' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Delete admin user error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// helper: check if a column exists (used to support optional subjectCode column)
async function columnExists(table, column) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbConfig.database, table, column]
    );
    return rows && rows[0] && rows[0].cnt > 0;
  } catch (e) {
    console.warn('columnExists check failed:', e && e.message ? e.message : e);
    return false;
  }
}

// ---- Admin: Courses CRUD ----
app.get('/api/admin/courses', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT subjectID, subjectName, subjectCode FROM Academic_Subject ORDER BY subjectName');
    const data = rows.map(r => ({ subjectID: r.subjectID, subjectName: r.subjectName, subjectCode: r.subjectCode }));
    res.json(data);
  } catch (e) {
    console.error('Get courses error:', e);
    res.status(500).json({ message: 'Failed to load courses' });
  }
});

app.post('/api/admin/courses', authRequired, requireRole('Admin'), async (req, res) => {
  const { courseCode, courseTitle } = req.body || {};
  if (!courseTitle || !courseTitle.trim()) return res.status(400).json({ message: 'courseTitle required' });

  try {
    const hasCode = await columnExists('Academic_Subject', 'subjectCode');
    let result;
    if (hasCode) {
      [result] = await pool.execute(
        'INSERT INTO Academic_Subject (subjectName, subjectCode) VALUES (?, ?)',
        [courseTitle.trim(), courseCode]
      );
    } else {
      [result] = await pool.execute(
        'INSERT INTO Academic_Subject (subjectName) VALUES (?)',
        [courseTitle.trim()]
      );
    }
    res.status(201).json({ message: 'Course created', subjectID: result.insertId });
  } catch (e) {
    console.error('Create course error:', e);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

app.put('/api/admin/courses/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const { courseCode, courseTitle } = req.body || {};
  if (!courseTitle || !courseTitle.trim()) return res.status(400).json({ message: 'courseTitle required' });

  try {
    const [exists] = await pool.execute('SELECT subjectID FROM Academic_Subject WHERE subjectID = ?', [id]);
    if (exists.length === 0) return res.status(404).json({ message: 'Course not found' });

    const hasCode = await columnExists('Academic_Subject', 'subjectCode');
    if (hasCode) {
      await pool.execute(
        'UPDATE Academic_Subject SET subjectName = ?, subjectCode = ? WHERE subjectID = ?',
        [courseTitle.trim(), courseCode || null, id]
      );
    } else {
      await pool.execute(
        'UPDATE Academic_Subject SET subjectName = ? WHERE subjectID = ?',
        [courseTitle.trim(), id]
      );
    }
    res.json({ message: 'Course updated' });
  } catch (e) {
    console.error('Update course error:', e);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

app.delete('/api/admin/courses/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM Academic_Subject WHERE subjectID = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (e) {
    console.error('Delete course error:', e);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// ---- Misc / Email / Cron / DB ----
async function sendSessionReminder(studentEmail, scheduleDate, tutorName, subjectName, timeslotStartTime, timeslotEndTime) {
  if (!sgMail || !process.env.SENDGRID_API_KEY) {
    console.log('Email disabled in dev; skipping send.');
    return;
  }
  // Format the date and time range
  let formattedDate = scheduleDate;
  let formattedTimeRange = '';
  try {
    const dateObj = new Date(scheduleDate);
    if (!isNaN(dateObj)) {
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      const datePart = dateObj.toLocaleDateString('en-US', options);
      // Format start and end time (assume timeslotStartTime and timeslotEndTime are 'HH:MM:SS' or 'HH:MM')
      function formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        let hour = parseInt(h, 10);
        const min = m.padStart(2, '0');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${hour}:${min} ${ampm}`;
      }
      const startTime = formatTime(timeslotStartTime);
      const endTime = formatTime(timeslotEndTime);
      formattedTimeRange = startTime && endTime ? `${startTime} - ${endTime}` : '';
      formattedDate = `${datePart}`;
    }
  } catch (e) {
    // fallback to original scheduleDate
  }
  const msg = {
    to: studentEmail,
    from: process.env.FROM_EMAIL || 'noreply@thebughouse.com',
    subject: '📚 Reminder: Tutoring Session Tomorrow',
    text: `Hi! Reminder: ${formattedDate} ${formattedTimeRange ? '(' + formattedTimeRange + ')' : ''} - ${subjectName} with ${tutorName}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #2563eb; margin-bottom: 20px; text-align: center;">🎓 Session Reminder</h2>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>📖 Subject:</strong> ${subjectName}</p>
            <p><strong>📅 Date:</strong> ${formattedDate}${formattedTimeRange ? ' (' + formattedTimeRange + ')' : ''}</p>
            <p><strong>👨‍🏫 Tutor:</strong> ${tutorName}</p>
          </div>
          <p>Best regards,<br><strong>The Bug House Team</strong></p>
        </div>
      </div>
    `,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    },
  };
  await sgMail.send(msg);
}

app.get('/api/test-email', async (req, res) => {
  try {
    if (!sgMail || !process.env.SENDGRID_API_KEY) {
      return res.status(200).json({ message: 'Email disabled in dev (no SENDGRID_API_KEY).' });
    }
    const msg = {
      to: 'pgn4608@mavsuta.edu',
      from: process.env.FROM_EMAIL || 'noreply@thebughouse.com',
      subject: 'Test Email from The Bug House',
      text: 'This is a test email from The Bug House tutoring system.',
      html: `<div><h2>The Bug House</h2><p>Test email.</p></div>`,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
        openTracking: { enable: false },
      },
    };
    await sgMail.send(msg);
    res.json({ message: 'Test email sent successfully!' });
  } catch (e) {
    console.error('SendGrid test error:', e);
    res.status(500).json({ message: 'Failed to send test email', error: e.message });
  }
});

app.get('/api/manual-reminder-check', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
              tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
              stu.userEmail AS studentEmail, stu.userFirstName AS studentFirstName,
              tl.timeslotStartTime, tl.timeslotEndTime
       FROM Tutor_Session sess
       JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID
                        AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
       JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
       JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
       JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
       JOIN System_User stu ON stu.userID = sess.Student_System_User_userID
       WHERE ds.scheduleDate = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
    );

    let sent = 0;
    for (const s of rows) {
      const tutorName = `${s.tutorFirstName} ${s.tutorLastName}`;
      await sendSessionReminder(
        s.studentEmail,
        s.scheduleDate,
        tutorName,
        s.subjectName,
        s.timeslotStartTime,
        s.timeslotEndTime
      );
      sent++;
    }
    res.json({ message: `Manual reminder check complete. Sent ${sent} reminders.`, sessionsFound: rows.length, emailsSent: sent });
  } catch (err) {
    console.error('Manual reminder error', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM System_User');
    res.json({ message: 'Database connection successful!', userCount: rows[0].count, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('Database test error:', e);
    res.status(500).json({ message: 'Database connection failed', error: e.message });
  }
});

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Checking for sessions to remind...');
  try {
    const [rows] = await pool.execute(
      `SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
              tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
              stu.userEmail AS studentEmail
       FROM Tutor_Session sess
       JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID
                        AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
       JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
       JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
       JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
       JOIN System_User stu ON stu.userID = sess.Student_System_User_userID
       WHERE ds.scheduleDate = DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
    );
    let sent = 0;
    for (const s of rows) {
      const tutorName = `${s.tutorFirstName} ${s.tutorLastName}`;
      await sendSessionReminder(s.studentEmail, s.scheduleDate, tutorName, s.subjectName);
      sent++;
    }
    console.log(`✅ Sent ${sent} reminders`);
  } catch (err) {
    console.error('Reminder cron error:', err);
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});