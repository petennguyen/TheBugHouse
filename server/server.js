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

// ---- Session booking endpoints ----

// Book from existing timeslot
app.post('/api/sessions/book', authRequired, requireRole('Student'), async (req, res) => {
  const { timeslotID, scheduleID } = req.body;
  
  if (!timeslotID || !scheduleID) {
    return res.status(400).json({ message: 'timeslotID and scheduleID required' });
  }
  
  try {
    // Check if timeslot exists and is not already booked
    const [timeslotCheck] = await pool.execute(
      'SELECT t.*, sub.subjectID FROM Timeslot t JOIN Academic_Subject sub ON sub.subjectID = t.Academic_Subject_subjectID WHERE t.timeslotID = ? AND t.Daily_Schedule_scheduleID = ?',
      [timeslotID, scheduleID]
    );
    
    if (timeslotCheck.length === 0) {
      return res.status(404).json({ message: 'Timeslot not found' });
    }
    
    // Check if already booked
    const [existingSession] = await pool.execute(
      'SELECT sessionID FROM Tutor_Session WHERE Timeslot_timeslotID = ? AND Timeslot_Daily_Schedule_scheduleID = ?',
      [timeslotID, scheduleID]
    );
    
    if (existingSession.length > 0) {
      return res.status(409).json({ message: 'Timeslot already booked' });
    }
    
    const timeslot = timeslotCheck[0];
    
    // Create session
    await pool.execute(
      'INSERT INTO Tutor_Session (Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, Student_System_User_userID) VALUES (?, ?, ?, ?, ?)',
      [timeslotID, scheduleID, timeslot.subjectID, timeslot.Tutor_System_User_userID, req.user.userID]
    );
    
    res.json({ message: 'Session booked successfully' });
  } catch (e) {
    console.error('Book session error:', e);
    res.status(500).json({ message: 'Failed to book session' });
  }
});

// Book from tutor availability
app.post('/api/sessions/book-from-availability', authRequired, requireRole('Student'), async (req, res) => {
  const { tutorID, dayOfWeek, startTime, date, subjectID, sessionLength } = req.body;
  
  if (!tutorID || !dayOfWeek || !startTime || !date || !subjectID || !sessionLength) {
    return res.status(400).json({ message: 'All fields required: tutorID, dayOfWeek, startTime, date, subjectID, sessionLength' });
  }
  
  try {
    // Check if tutor is available on this day/time
    const [availabilityCheck] = await pool.execute(
      'SELECT * FROM Tutor_Availability WHERE Tutor_System_User_userID = ? AND dayOfWeek = ? AND startTime <= ? AND endTime >= ?',
      [tutorID, dayOfWeek, startTime, startTime]
    );
    
    if (availabilityCheck.length === 0) {
      return res.status(404).json({ message: 'Tutor not available at this time' });
    }
    
    // Check if schedule exists for this date, create if not
    let scheduleID;
    const [existingSchedule] = await pool.execute(
      'SELECT scheduleID FROM Daily_Schedule WHERE scheduleDate = ?',
      [date]
    );
    
    if (existingSchedule.length > 0) {
      scheduleID = existingSchedule[0].scheduleID;
    } else {
      // Create new schedule (need an admin user ID - use first admin)
      const [adminUser] = await pool.execute(
        'SELECT System_User_userID FROM Administrator LIMIT 1'
      );
      
      if (adminUser.length === 0) {
        return res.status(500).json({ message: 'No admin user found to create schedule' });
      }
      
      const [scheduleResult] = await pool.execute(
        'INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate) VALUES (?, ?)',
        [adminUser[0].System_User_userID, date]
      );
      scheduleID = scheduleResult.insertId;
    }
    
    // Calculate end time based on session length
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + sessionLength * 60000);
    const endTime = endDateTime.toTimeString().slice(0, 5);
    
    // Create timeslot
    const [timeslotResult] = await pool.execute(
      'INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime) VALUES (?, ?, ?, ?, ?)',
      [scheduleID, subjectID, tutorID, startTime, endTime]
    );
    
    const timeslotID = timeslotResult.insertId;
    
    // Create session
    await pool.execute(
      'INSERT INTO Tutor_Session (Timeslot_timeslotID, Timeslot_Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, Student_System_User_userID) VALUES (?, ?, ?, ?, ?)',
      [timeslotID, scheduleID, subjectID, tutorID, req.user.userID]
    );
    
    res.json({ 
      message: 'Session booked successfully from availability',
      timeslotID,
      scheduleID
    });
  } catch (e) {
    console.error('Book from availability error:', e);
    res.status(500).json({ message: 'Failed to book session from availability' });
  }
});

// ---- Available timeslots (filter by date & subject) ----
// GET /api/timeslots/available?date=YYYY-MM-DD&subjectId=#
app.get('/api/timeslots/available', authRequired, async (req, res) => {
  const { date, subjectId } = req.query;
  
  if (!date || !subjectId) {
    return res.status(400).json({ message: 'date and subjectId required' });
  }
  
  try {
    const [rows] = await pool.execute(`
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
    `, [date, subjectId]);
    
    res.json(rows);
  } catch (e) {
    console.error('Available timeslots error:', e);
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

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Checking for sessions to remind...');
  try {
    // Find sessions scheduled 24 hours from now
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

    for (const session of rows) {
      const tutorName = `${session.tutorFirstName} ${session.tutorLastName}`;
      await sendSessionReminder(
        session.studentEmail,
        session.scheduleDate,
        tutorName,
        session.subjectName
      );
    }
    console.log(`✅ Sent ${rows.length} reminders`);
  } catch (err) {
    console.error('Reminder cron error:', err);
  }
});

// ---- Email reminder endpoints ----

// Test SendGrid email
app.get('/api/test-email', async (req, res) => {
  try {
    const msg = {
      to: 'pgn4608@mavs.uta.edu',
      from: process.env.FROM_EMAIL || 'noreply@thebughouse.com',
      subject: 'Test Email from The Bug House',
      text: 'This is a test email from The Bug House tutoring system.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">The Bug House</h2>
          <p>This is a test email from The Bug House tutoring system.</p>
          <p>Best regards,<br>The Bug House Team</p>
        </div>
      `
    };
    
    await sgMail.send(msg);
    res.json({ message: 'Test email sent successfully!' });
  } catch (e) {
    console.error('SendGrid test error:', e);
    res.status(500).json({ 
      message: 'Failed to send test email', 
      error: e.message 
    });
  }
});

// Manually trigger reminder check (changed to GET)
app.get('/api/manual-reminder-check', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sess.sessionID, ds.scheduleDate, subj.subjectName,
              tsu.userFirstName AS tutorFirstName, tsu.userLastName AS tutorLastName,
              stu.userEmail AS studentEmail, stu.userFirstName AS studentFirstName
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
    for (const session of rows) {
      const tutorName = `${session.tutorFirstName} ${session.tutorLastName}`;
      await sendSessionReminder(
        session.studentEmail,
        session.scheduleDate,
        tutorName,
        session.subjectName
      );
      sent++;
    }
    res.json({ 
      message: `Manual reminder check complete. Sent ${sent} reminders.`,
      sessionsFound: rows.length,
      emailsSent: sent
    });
  } catch (err) {
    console.error('Manual reminder error', err);
    res.status(500).json({ error: err.message });
  }
});

// sendSessionReminder function
async function sendSessionReminder(studentEmail, scheduleDate, tutorName, subjectName) {
  const msg = {
    to: studentEmail,
    from: process.env.FROM_EMAIL || 'noreply@thebughouse.com',
    subject: '📚 Reminder: Tutoring Session Tomorrow',
    text: `Hi! This is a reminder for your upcoming tutoring session tomorrow (${scheduleDate}) for ${subjectName} with ${tutorName}. Please be on time.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #2563eb; margin-bottom: 20px; text-align: center;">🎓 Session Reminder</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">Hi there!</p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder that you have a tutoring session scheduled for <strong>tomorrow</strong>:
          </p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 8px 0; font-size: 16px;"><strong>📖 Subject:</strong> ${subjectName}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>📅 Date:</strong> ${scheduleDate}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>👨‍🏫 Tutor:</strong> ${tutorName}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">
              <strong>💡 Tip:</strong> Please arrive 5-10 minutes early and bring any materials you need for the session.
            </p>
          </div>
          
          <p style="margin-top: 30px; font-size: 16px;">
            Best regards,<br>
            <strong>The Bug House Team</strong>
          </p>
        </div>
      </div>
    `
  };
  
  try {
    await sgMail.send(msg);
    console.log(`✅ Reminder email sent to ${studentEmail}`);
  } catch (err) {
    console.error('SendGrid error:', err);
    throw err;
  }
}

// ---- Student calendar events (booked sessions) ----
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
        sess.sessionSignOutTime
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
      const title = `${r.subjectName} with ${r.tutorFirstName} ${r.tutorLastName}`;
      const ext = { subject: r.subjectName, tutorName: `${r.tutorFirstName} ${r.tutorLastName}` };

      // Use actual timeslot times instead of sign-in/out times
      if (r.timeslotStartTime && r.timeslotEndTime) {
        // Combine schedule date with timeslot times
        const scheduleDate = new Date(r.scheduleDate);
        const year = scheduleDate.getFullYear();
        const month = scheduleDate.getMonth();
        const day = scheduleDate.getDate();
        
        // Parse time strings (format: "HH:MM:SS" or "HH:MM")
        const [startHour, startMin] = r.timeslotStartTime.split(':').map(Number);
        const [endHour, endMin] = r.timeslotEndTime.split(':').map(Number);
        
        const startDateTime = new Date(year, month, day, startHour, startMin, 0);
        const endDateTime = new Date(year, month, day, endHour, endMin, 0);
        
        return {
          id: r.sessionID,
          title,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          allDay: false,
          extendedProps: ext,
        };
      }
      
      // Fallback: all-day if no timeslot times
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
    
    // Filter by subject if specified - FIX HERE TOO:
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

// ---- Authentication endpoints ----

// User profile endpoint
app.get('/api/user/profile', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole FROM System_User WHERE userID = ?',
      [req.user.userID]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Database-first login endpoint
app.post('/api/auth/login-database-first', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  
  try {
    // Find user in database
    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userPassword, userRole FROM System_User WHERE userEmail = ?',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    // In a real app, you'd hash and compare passwords
    // For now, assuming plain text comparison (NOT SECURE)
    if (user.userPassword !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      {
        userID: user.userID,
        email: user.userEmail,
        role: user.userRole,
        firstName: user.userFirstName,
        lastName: user.userLastName
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
        userRole: user.userRole
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Single unified login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password, firebaseUID } = req.body;
  
  if (!email || (!password && !firebaseUID)) {
    return res.status(400).json({ message: 'Email and either password or firebaseUID required' });
  }
  
  try {
    let query, params;
    
    if (firebaseUID) {
      // Firebase login - find by email and firebaseUID
      query = 'SELECT userID, userFirstName, userLastName, userEmail, userRole FROM System_User WHERE userEmail = ? AND firebaseUID = ?';
      params = [email, firebaseUID];
    } else {
      // Database login - find by email and password
      query = 'SELECT userID, userFirstName, userLastName, userEmail, userPassword, userRole FROM System_User WHERE userEmail = ?';
      params = [email];
    }
    
    const [rows] = await pool.execute(query, params);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    // If password login, check password
    if (password && user.userPassword !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      {
        userID: user.userID,
        email: user.userEmail,
        role: user.userRole,
        firstName: user.userFirstName,
        lastName: user.userLastName
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
        userRole: user.userRole
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { userFirstName, userLastName, userEmail, userPassword, userRole } = req.body;
  
  if (!userFirstName || !userLastName || !userEmail || !userPassword || !userRole) {
    return res.status(400).json({ message: 'All fields required' });
  }
  
  if (!['Admin', 'Tutor', 'Student'].includes(userRole)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  try {
    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT userID FROM System_User WHERE userEmail = ?',
      [userEmail]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole) VALUES (?, ?, ?, ?, ?)',
      [userFirstName, userLastName, userEmail, userPassword, userRole]
    );
    
    const userID = result.insertId;
    
    // Insert into role-specific table
    if (userRole === 'Admin') {
      await pool.execute(
        'INSERT INTO Administrator (System_User_userID, accessLevel) VALUES (?, 1)',
        [userID]
      );
    } else if (userRole === 'Tutor') {
      await pool.execute(
        'INSERT INTO Tutor (System_User_userID) VALUES (?)',
        [userID]
      );
    } else if (userRole === 'Student') {
      await pool.execute(
        'INSERT INTO Student (System_User_userID) VALUES (?)',
        [userID]
      );
    }
    
    // Create JWT token
    const token = jwt.sign(
      {
        userID,
        email: userEmail,
        role: userRole,
        firstName: userFirstName,
        lastName: userLastName
      },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        userID,
        userFirstName,
        userLastName,
        userEmail,
        userRole
      }
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ message: 'Signup failed' });
  }
});



// ---- Analytics endpoints ----
app.get('/api/analytics/overview', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    // Get total sessions
    const [sessionRows] = await pool.execute(
      'SELECT COUNT(*) as totalSessions FROM Tutor_Session'
    );
    
    // Get total students
    const [studentRows] = await pool.execute(
      'SELECT COUNT(*) as totalStudents FROM Student'
    );
    
    // Get total tutors  
    const [tutorRows] = await pool.execute(
      'SELECT COUNT(*) as totalTutors FROM Tutor'
    );
    
    // Get average rating
    const [ratingRows] = await pool.execute(
      'SELECT AVG(sessionRating) as avgRating FROM Tutor_Session WHERE sessionRating IS NOT NULL'
    );
    
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

// Get all students
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

// Create schedule
app.post('/api/admin/schedules', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleDate } = req.body;
  
  if (!scheduleDate) {
    return res.status(400).json({ message: 'scheduleDate required' });
  }
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO Daily_Schedule (Administrator_System_User_userID, scheduleDate) VALUES (?, ?)',
      [req.user.userID, scheduleDate]
    );
    
    res.json({ 
      message: 'Schedule created successfully',
      scheduleId: result.insertId 
    });
  } catch (e) {
    console.error('Create schedule error:', e);
    res.status(500).json({ message: 'Failed to create schedule' });
  }
});


// Admin: View Existing schedules
app.get('/api/admin/schedules', authRequired, requireRole('Admin'), async (req, res) => { 
  try 
  {
    // fetch schedules
    const [schedules] = await pool.execute(
      `SELECT scheduleID, scheduleDate 
         FROM Daily_Schedule 
        ORDER BY scheduleDate DESC`
    );
    if (schedules.length === 0) return res.json([]);

    const ids = schedules.map(s => s.scheduleID);

    // Fetch timeslots
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
    // Fetch Sessions
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

    // nest sessions inside timeslots
    const timeslotsWithSessions = timeslots.map(t => ({
      ...t,
      sessions: sessions.filter(s => s.timeslotID === t.timeslotID && s.scheduleID === t.scheduleID)
    }));

    // nest timeslots inside schedules
    const schedulesWithSlots = schedules.map(s => ({
      ...s,
      timeslots: timeslotsWithSessions.filter(t => t.scheduleID === s.scheduleID)
    }));

    res.json(schedulesWithSlots);
  } catch (e) 
  {
    console.error('Error Fetching Schedules', e);
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
});
// ---- Admin: get available tutors for schedule creation ----
app.get('/api/admin/availableTutors', authRequired, requireRole('Admin'), async (req, res) => {
  try { 
    const [rows] = await pool.execute(`SELECT userID, CONCAT(userFirstName, ' ', userLastName) AS name FROM System_User WHERE userRole = ?`,['Tutor']);
    res.json(rows); 
  } catch (err) {
    console.error('Error fetching tutors:', err);
    res.status(500).json({ error: 'Failed to fetch tutors' });
  } 
}); 
// ---- Admin: create a daily schedule ----
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
 
// ---- Admin: generate timeslots ----
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
    for (let t = mStart; t + dur <= mEnd; t += dur) 
    {
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

// Delete schedule
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

// Get feedback analytics
app.get('/api/admin/feedback-analytics', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    // Average rating by subject
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

    // Average rating by tutor
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

    // Recent feedback
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

    res.json({
      subjectRatings,
      tutorRatings,
      recentFeedback
    });
  } catch (e) {
    console.error('Feedback analytics error:', e);
    res.status(500).json({ message: 'Failed to load feedback analytics' });
  }
});

// Get session analytics
app.get('/api/admin/session-analytics', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    // Sessions by month
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

    // Sessions by subject
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

    res.json({
      monthlyStats,
      subjectStats
    });
  } catch (e) {
    console.error('Session analytics error:', e);
    res.status(500).json({ message: 'Failed to load session analytics' });
  }
});

// Complete signup for Firebase users (fix the missing userID)
app.post('/api/auth/complete-signup', async (req, res) => {
  const { firebaseUID, name, email, role } = req.body;
  
  if (!firebaseUID || !email || !role) {
    return res.status(400).json({ message: 'firebaseUID, email, and role required' });
  }
  
  try {
    // Split name into first/last
    const nameParts = name.split(' ');
    const userFirstName = nameParts[0] || 'User';
    const userLastName = nameParts.slice(1).join(' ') || 'Name';
    
    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole, firebaseUID) VALUES (?, ?, ?, ?, ?, ?)',
      [userFirstName, userLastName, email, 'firebase_user', role, firebaseUID]
    );
    
    const userID = result.insertId; 
    
    // Insert into role-specific table
    if (role === 'Admin') {
      await pool.execute('INSERT INTO Administrator (System_User_userID, accessLevel) VALUES (?, 1)', [userID]);
    } else if (role === 'Tutor') {
      await pool.execute('INSERT INTO Tutor (System_User_userID) VALUES (?)', [userID]);
    } else if (role === 'Student') {
      await pool.execute('INSERT INTO Student (System_User_userID) VALUES (?)', [userID]);
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userID, email, role, firstName: userFirstName, lastName: userLastName },
      process.env.JWT_SECRET || 'change_me_now',
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Account completed successfully',
      success: true,
      token,
      role,
      userID,
      user: { userID, userFirstName, userLastName, userEmail: email, userRole: role }
    });
  } catch (e) {
    console.error('Complete signup error:', e);
    res.status(500).json({ message: 'Failed to complete signup' });
  }
});

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM System_User');
    res.json({ 
      message: 'Database connection successful!', 
      userCount: rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Database test error:', e);
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: e.message 
    });
  }
});

// Get completed sessions (for dashboard)
app.get('/api/sessions/completed', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        sess.sessionID,
        sess.sessionSignInTime,
        sess.sessionSignOutTime,
        sess.sessionRating,
        sub.subjectName,
        stu.userFirstName AS studentFirstName,
        stu.userLastName AS studentLastName
      FROM Tutor_Session sess
      JOIN Academic_Subject sub ON sub.subjectID = sess.Academic_Subject_subjectID
      JOIN System_User stu ON stu.userID = sess.Student_System_User_userID
      WHERE sess.Tutor_System_User_userID = ?
        AND sess.sessionSignOutTime IS NOT NULL
      ORDER BY sess.sessionSignOutTime DESC
      LIMIT 10
    `, [req.user.userID]);
    
    res.json(rows);
  } catch (e) {
    console.error('Completed sessions error:', e);
    res.status(500).json({ message: 'Failed to load completed sessions' });
  }
});


// ---- Admin: Course Management Endpoints ----

// Get all courses/subjects
app.get('/api/admin/courses', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT subjectID, subjectName, subjectCode 
      FROM Academic_Subject 
      ORDER BY subjectName
    `);
    res.json(rows);
  } catch (e) {
    console.error('Get courses error:', e);
    res.status(500).json({ message: 'Failed to load courses' });
  }
});

// Add new course
app.post('/api/admin/courses', authRequired, requireRole('Admin'), async (req, res) => {
  const { courseCode, courseTitle } = req.body;
  
  if (!courseCode || !courseTitle) {
    return res.status(400).json({ message: 'Course code and title are required' });
  }
  
  try {
    // Check if course code already exists
    const [existing] = await pool.execute(
      'SELECT subjectID FROM Academic_Subject WHERE subjectCode = ?',
      [courseCode]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Course code already exists' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO Academic_Subject (subjectName, subjectCode) VALUES (?, ?)',
      [courseTitle, courseCode]
    );
    
    res.json({ 
      message: 'Course added successfully',
      subjectID: result.insertId,
      courseCode,
      courseTitle
    });
  } catch (e) {
    console.error('Add course error:', e);
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Course code already exists' });
    } else {
      res.status(500).json({ message: 'Failed to add course' });
    }
  }
});

// Update existing course
app.put('/api/admin/courses/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const { courseCode, courseTitle } = req.body;
  
  if (!courseCode || !courseTitle) {
    return res.status(400).json({ message: 'Course code and title are required' });
  }
  
  try {
    // Check if course exists
    const [existing] = await pool.execute(
      'SELECT subjectID FROM Academic_Subject WHERE subjectID = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if new course code conflicts with other courses
    const [codeConflict] = await pool.execute(
      'SELECT subjectID FROM Academic_Subject WHERE subjectCode = ? AND subjectID != ?',
      [courseCode, id]
    );
    
    if (codeConflict.length > 0) {
      return res.status(409).json({ message: 'Course code already exists for another course' });
    }
    
    const [result] = await pool.execute(
      'UPDATE Academic_Subject SET subjectName = ?, subjectCode = ? WHERE subjectID = ?',
      [courseTitle, courseCode, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json({ 
      message: 'Course updated successfully',
      subjectID: id,
      courseCode,
      courseTitle
    });
  } catch (e) {
    console.error('Update course error:', e);
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Course code already exists' });
    } else {
      res.status(500).json({ message: 'Failed to update course' });
    }
  }
});

// Delete course
app.delete('/api/admin/courses/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if course has active sessions or timeslots
    const [activeSessions] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM Tutor_Session ts 
      WHERE ts.Academic_Subject_subjectID = ?
    `, [id]);
    
    const [activeTimeslots] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM Timeslot t 
      WHERE t.Academic_Subject_subjectID = ?
    `, [id]);
    
    if (activeSessions[0].count > 0) {
      return res.status(409).json({ 
        message: `Cannot delete course: ${activeSessions[0].count} sessions exist for this course` 
      });
    }
    
    if (activeTimeslots[0].count > 0) {
      return res.status(409).json({ 
        message: `Cannot delete course: ${activeTimeslots[0].count} timeslots exist for this course` 
      });
    }
    
    const [result] = await pool.execute(
      'DELETE FROM Academic_Subject WHERE subjectID = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (e) {
    console.error('Delete course error:', e);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

// Get course statistics
app.get('/api/admin/courses/:id/stats', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const [courseInfo] = await pool.execute(
      'SELECT subjectName, subjectCode FROM Academic_Subject WHERE subjectID = ?',
      [id]
    );
    
    if (courseInfo.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const [sessionStats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalSessions,
        COUNT(CASE WHEN sessionSignInTime IS NOT NULL AND sessionSignOutTime IS NOT NULL THEN 1 END) as completedSessions,
        AVG(sessionRating) as avgRating,
        COUNT(CASE WHEN sessionRating IS NOT NULL THEN 1 END) as ratedSessions
      FROM Tutor_Session 
      WHERE Academic_Subject_subjectID = ?
    `, [id]);
    
    const [tutorCount] = await pool.execute(`
      SELECT COUNT(DISTINCT Tutor_System_User_userID) as tutorCount
      FROM Tutor_Session 
      WHERE Academic_Subject_subjectID = ?
    `, [id]);
    
    const [studentCount] = await pool.execute(`
      SELECT COUNT(DISTINCT Student_System_User_userID) as studentCount
      FROM Tutor_Session 
      WHERE Academic_Subject_subjectID = ?
    `, [id]);
    
    res.json({
      course: courseInfo[0],
      stats: {
        ...sessionStats[0],
        tutorCount: tutorCount[0].tutorCount,
        studentCount: studentCount[0].studentCount
      }
    });
  } catch (e) {
    console.error('Course stats error:', e);
    res.status(500).json({ message: 'Failed to load course statistics' });
  }
});

// ---- Admin: Manage users (list, toggle active, delete) ----

// GET all users (admin)
app.get('/api/admin/users', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    // Get basic user info and any tutor availability subject names (if present)
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
      // subjects_concat may contain comma-separated subject lists already stored in ta.subjects,
      // we used '||' as separator between rows so we need to split and flatten safely.
      let subjects = [];
      if (r.subjects_concat) {
        subjects = r.subjects_concat
          .split('||')
          .map(s => s || '')
          .flatMap(s => s.split(',').map(x => x.trim()).filter(Boolean));
        // unique
        subjects = Array.from(new Set(subjects));
      }
      return {
        userID: r.userID,
        userFirstName: r.userFirstName,
        userLastName: r.userLastName,
        email: r.userEmail,
        role: r.userRole,
        // best-effort fields expected by client
        phone: null,
        createdAt: null,
        active: true, // default (DB may not have an active column)
        subjects,
      };
    });

    res.json(users);
  } catch (err) {
    console.error('Get admin users error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// PATCH update user (e.g. toggle active) - admin only
app.patch('/api/admin/users/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  // Only allow toggling "active" via this endpoint for now
  if (typeof updates.active === 'undefined') {
    return res.status(400).json({ message: 'No updatable fields provided. Supported: active' });
  }

  try {
    // Try to perform update. If your System_User table doesn't have an 'active' column,
    // this will throw — catch and return a helpful error.
    const [result] = await pool.execute(
      'UPDATE System_User SET active = ? WHERE userID = ?',
      [updates.active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Patch admin user error:', err);
    // If column doesn't exist or other DB error, return 400 with hint
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(400).json({ message: "Database missing 'active' column on System_User. Add boolean `active` column or adjust endpoint." });
    }
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE user (admin) - cleans up role-specific records then user
app.delete('/api/admin/users/:id', authRequired, requireRole('Admin'), async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: 'Invalid user id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Remove tutor availability (safe), tutor role, student role, administrator role if present
    await conn.execute('DELETE FROM Tutor_Availability WHERE Tutor_System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Tutor WHERE System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Student WHERE System_User_userID = ?', [userId]);
    await conn.execute('DELETE FROM Administrator WHERE System_User_userID = ?', [userId]);

    // Delete any sessions where this user is student or tutor — optional, but better to avoid FK issues.
    await conn.execute('DELETE FROM Tutor_Session WHERE Student_System_User_userID = ? OR Tutor_System_User_userID = ?', [userId, userId]);

    // Finally delete the user
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


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ---- Student check-in endpoint ----
app.post('/api/sessions/:sessionID/check-in', authRequired, requireRole('Student'), async (req, res) => {
  const { sessionID } = req.params;
  
  try {
    // Verify session belongs to student
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
    
    // Record check-in time
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

// ---- Tutor update session status endpoint ----
app.post('/api/sessions/:sessionID/status', authRequired, requireRole('Tutor'), async (req, res) => {
  const { sessionID } = req.params;
  const { status } = req.body;
  
  if (!['completed', 'no_show', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  try {
    // Verify session belongs to tutor
    const [[session]] = await pool.execute(
      `SELECT sessionID, sessionSignInTime, sessionSignOutTime FROM Tutor_Session 
       WHERE sessionID = ? AND Tutor_System_User_userID = ?`,
      [sessionID, req.user.userID]
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    let updateQuery = '';
    let updateParams = [];
    
    if (status === 'completed') {
      // Mark as completed - set both sign-in and sign-out if not already set
      updateQuery = `
        UPDATE Tutor_Session 
        SET sessionSignInTime = COALESCE(sessionSignInTime, NOW(3)),
            sessionSignOutTime = NOW(3),
            sessionStatus = 'completed'
        WHERE sessionID = ?
      `;
      updateParams = [sessionID];
    } else if (status === 'no_show') {
      // Mark as no show
      updateQuery = `
        UPDATE Tutor_Session 
        SET sessionStatus = 'no_show'
        WHERE sessionID = ?
      `;
      updateParams = [sessionID];
    } else if (status === 'cancelled') {
      // Mark as cancelled
      updateQuery = `
        UPDATE Tutor_Session 
        SET sessionStatus = 'cancelled'
        WHERE sessionID = ?
      `;
      updateParams = [sessionID];
    }
    
    await pool.execute(updateQuery, updateParams);
    
    res.json({ message: `Session marked as ${status}` });
  } catch (e) {
    console.error('Update status error:', e);
    res.status(500).json({ message: 'Failed to update session status' });
  }
});

// ---- Update the "my sessions" endpoint to include status ----
// Replace the existing /api/sessions/mine endpoint with this updated version:

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
      // Admin sees all
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
