require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const admin = require("firebase-admin");
const serviceAccount = require("./firebaseAdmin/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
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

// === JWT config (extendable) ===
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
    req.user = decoded; // { email, role, userID, firebaseUID, ... }
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

// ---- Subjects ----
app.get('/api/subjects', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT subjectID, subjectName FROM Academic_Subject ORDER BY subjectName');
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

// ---- Available timeslots (filter by date & subject) ----
// GET /api/timeslots/available?date=YYYY-MM-DD&subjectId=#
app.get('/api/timeslots/available', authRequired, async (req, res) => {
  const { date, subjectId } = req.query;
  if (!date || !subjectId) return res.status(400).json({ message: 'date and subjectId required' });

  try {
    const [rows] = await pool.execute(
      `
      SELECT
        ds.scheduleDate,
        tl.Daily_Schedule_scheduleID AS scheduleID,
        tl.timeslotID,
        subj.subjectID,
        subj.subjectName,
        t.System_User_userID AS tutorUserID,
        su.userFirstName AS tutorFirstName,
        su.userLastName  AS tutorLastName
      FROM Timeslot tl
      JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
      JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
      JOIN Tutor t ON t.System_User_userID = tl.Tutor_System_User_userID
      JOIN System_User su ON su.userID = t.System_User_userID
      LEFT JOIN Tutor_Session sess
        ON sess.Timeslot_timeslotID = tl.timeslotID
       AND sess.Timeslot_Daily_Schedule_scheduleID = tl.Daily_Schedule_scheduleID
      WHERE ds.scheduleDate = ? AND subj.subjectID = ? AND sess.sessionID IS NULL
      ORDER BY su.userLastName, su.userFirstName, tl.timeslotID
      `,
      [date, subjectId]
    );
    res.json(rows);
  } catch (e) {
    console.error('available slots error', e);
    res.status(500).json({ message: 'Failed to load available timeslots' });
  }
});

// ---- Book a session (Student) ----
app.post('/api/sessions/book', authRequired, requireRole('Student'), async (req, res) => {
  const { timeslotID, scheduleID } = req.body || {};
  if (!timeslotID || !scheduleID) return res.status(400).json({ message: 'timeslotID and scheduleID required' });

  try {
    // 1) Confirm timeslot still available
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

    if (conf.length === 0) return res.status(409).json({ message: 'Timeslot is no longer available' });

    const row = conf[0];
    // 2) Create session
    await pool.execute(
      `
      INSERT INTO Tutor_Session
        (Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID,
         Tutor_System_User_userID, Student_System_User_userID, sessionSignInTime, sessionSignOutTime, sessionFeedback, sessionRating)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
      `,
      [row.timeslotID, row.Daily_Schedule_scheduleID, row.Academic_Subject_subjectID, row.Tutor_System_User_userID, req.user.userID]
    );

    res.json({ message: 'Booked!' });
  } catch (e) {
    console.error('book session error', e);
    res.status(500).json({ message: 'Failed to book session' });
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
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
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
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
        JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
        JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
        JOIN System_User ssu ON ssu.userID = sess.Student_System_User_userID
        WHERE sess.Tutor_System_User_userID = ?
        ORDER BY ds.scheduleDate DESC, sess.sessionID DESC
      `;
      params = [req.user.userID];
    } else {
      // Admin sees all
      query = `
        SELECT
          sess.sessionID, ds.scheduleDate, subj.subjectName,
          tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
          ssu.userFirstName AS studentFirstName, ssu.userLastName AS studentLastName,
          sess.sessionSignInTime, sess.sessionSignOutTime, sess.sessionFeedback, sess.sessionRating
        FROM Tutor_Session sess
        JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
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

// ---- Student calendar events (booked sessions) ----
app.get('/api/student/calendar', authRequired, requireRole('Student'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        sess.sessionID,
        ds.scheduleDate,
        subj.subjectName,
        tsu.userFirstName AS tutorFirstName,
        tsu.userLastName  AS tutorLastName,
        sess.sessionSignInTime,
        sess.sessionSignOutTime
      FROM Tutor_Session sess
      JOIN Timeslot tl ON tl.timeslotID = sess.Timeslot_timeslotID
                       AND tl.Daily_Schedule_scheduleID = sess.Timeslot_Daily_Schedule_scheduleID
      JOIN Daily_Schedule ds ON ds.scheduleID = tl.Daily_Schedule_scheduleID
      JOIN Academic_Subject subj ON subj.subjectID = tl.Academic_Subject_subjectID
      JOIN System_User tsu ON tsu.userID = sess.Tutor_System_User_userID
      WHERE sess.Student_System_User_userID = ?
      ORDER BY COALESCE(sess.sessionSignInTime, ds.scheduleDate), sess.sessionID
      `,
      [req.user.userID]
    );

    const events = rows.map((r) => {
      const title = `${r.subjectName} with ${r.tutorFirstName} ${r.tutorLastName}`;
      const ext = { subject: r.subjectName, tutorName: `${r.tutorFirstName} ${r.tutorLastName}` };

      if (r.sessionSignInTime && r.sessionSignOutTime) {
        return {
          id: r.sessionID,
          title,
          start: new Date(r.sessionSignInTime).toISOString(),
          end: new Date(r.sessionSignOutTime).toISOString(),
          allDay: false,
          extendedProps: ext,
        };
      }
      // Fallback: all-day on scheduleDate
      const d = new Date(r.scheduleDate);
      const startISO = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
      const endISO = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1)).toISOString();
      return {
        id: r.sessionID,
        title,
        start: startISO,
        end: endISO,
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

// ---- Student leaves feedback/rating ----
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

// ---- Tutor marks attendance (toggle sign-in/out) ----
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

// ---- NEW: Cancel a session (role-aware) ----
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
    } else if (req.user.role === 'Admin') {
      // Admin can cancel any session
    } else {
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
  }
  
  try {
    // Convert subject IDs to names for storage
    const [subjectRows] = await pool.execute(
      `SELECT subjectName FROM Academic_Subject WHERE subjectID IN (${subjects.map(() => '?').join(',')})`,
      subjects
    );
    const subjectNames = subjectRows.map(row => row.subjectName).join(',');
    
    await pool.execute(
      'INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime, subjects) VALUES (?, ?, ?, ?, ?)',
      [req.user.userID, dayOfWeek, startTime, endTime, subjectNames]
    );
    
    res.json({ message: 'Availability added' });
  } catch (e) {
    console.error('availability add error', e);
    res.status(500).json({ message: 'Failed to add availability' });
  }
});

// Update the student-facing availability endpoint
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
    
    // Filter by subject if specified
    if (subjectId) {
      const [subjectRow] = await pool.execute(
        'SELECT subjectName FROM Academic_Subject WHERE subjectID = ?',
        [subjectId]
      );
      
      if (subjectRow.length > 0) {
        query += ' AND (ta.subjects LIKE ? OR ta.subjects IS NULL)';
        params.push(`%${subjectRow[0].subjectName}%`);
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

// ---- Delete availability ----
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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
