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

// ---- Admin endpoints ----
app.get('/api/admin/availableTutors', authRequired, requireRole('Admin'), async (req, res) => {
  const { date, subjectId } = req.query;
  
  try {
    let query = `
      SELECT DISTINCT
        su.userID as tutorUserID,
        su.userFirstName AS tutorFirstName,
        su.userLastName AS tutorLastName,
        su.userEmail AS tutorEmail,
        ta.subjects
      FROM System_User su
      JOIN Tutor t ON t.System_User_userID = su.userID
      LEFT JOIN Tutor_Availability ta ON ta.Tutor_System_User_userID = su.userID
      WHERE su.userRole = 'Tutor'
    `;
    
    const params = [];
    
    // Filter by day of week if date is provided
    if (date) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      query += ' AND (ta.dayOfWeek = ? OR ta.dayOfWeek IS NULL)';
      params.push(dayOfWeek);
    }
    
    // Filter by subject if provided - FIX THE LENGTH CHECK HERE:
    if (subjectId) {
      const [subjectRows] = await pool.execute(
        'SELECT subjectName FROM Academic_Subject WHERE subjectID = ?',
        [subjectId]
      );
      
      // Fix: Check if subjectRows exists and has length
      if (subjectRows && subjectRows.length > 0) {
        query += ' AND (ta.subjects LIKE ? OR ta.subjects IS NULL)';
        params.push(`%${subjectRows[0].subjectName}%`);
      }
    }
    
    query += ' ORDER BY su.userLastName, su.userFirstName';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (e) {
    console.error('Available tutors error:', e);
    res.status(500).json({ message: 'Failed to load available tutors' });
  }
});

// Get all tutors (simplified version)
app.get('/api/admin/tutors', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        su.userID as tutorUserID,
        su.userFirstName AS tutorFirstName,
        su.userLastName AS tutorLastName,
        su.userEmail AS tutorEmail,
        t.tutorBiography,
        t.tutorQualifications
      FROM System_User su
      JOIN Tutor t ON t.System_User_userID = su.userID
      WHERE su.userRole = 'Tutor'
      ORDER BY su.userLastName, su.userFirstName
    `);
    res.json(rows);
  } catch (e) {
    console.error('Get tutors error:', e);
    res.status(500).json({ message: 'Failed to load tutors' });
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

// Create timeslot
app.post('/api/admin/timeslots', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleId, subjectId, tutorId, startTime, endTime } = req.body;
  
  if (!scheduleId || !subjectId || !tutorId || !startTime || !endTime) {
    return res.status(400).json({ message: 'All fields required' });
  }
  
  try {
    await pool.execute(
      'INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID, timeslotStartTime, timeslotEndTime) VALUES (?, ?, ?, ?, ?)',
      [scheduleId, subjectId, tutorId, startTime, endTime]
    );
    
    res.json({ message: 'Timeslot created successfully' });
  } catch (e) {
    console.error('Create timeslot error:', e);
    res.status(500).json({ message: 'Failed to create timeslot' });
  }
});

// Get all schedules
app.get('/api/admin/schedules', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        ds.scheduleID,
        ds.scheduleDate,
        su.userFirstName AS adminFirstName,
        su.userLastName AS adminLastName,
        COUNT(t.timeslotID) as timeslotCount
      FROM Daily_Schedule ds
      JOIN Administrator a ON a.System_User_userID = ds.Administrator_System_User_userID
      JOIN System_User su ON su.userID = a.System_User_userID
      LEFT JOIN Timeslot t ON t.Daily_Schedule_scheduleID = ds.scheduleID
      GROUP BY ds.scheduleID, ds.scheduleDate, su.userFirstName, su.userLastName
      ORDER BY ds.scheduleDate DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error('Get schedules error:', e);
    res.status(500).json({ message: 'Failed to load schedules' });
  }
});

// Get timeslots for a specific schedule
app.get('/api/admin/schedules/:scheduleId/timeslots', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleId } = req.params;
  
  try {
    const [rows] = await pool.execute(`
      SELECT 
        t.timeslotID,
        t.timeslotStartTime,
        t.timeslotEndTime,
        sub.subjectName,
        su.userFirstName AS tutorFirstName,
        su.userLastName AS tutorLastName,
        CASE WHEN ts.sessionID IS NOT NULL THEN 1 ELSE 0 END as isBooked
      FROM Timeslot t
      JOIN Academic_Subject sub ON sub.subjectID = t.Academic_Subject_subjectID
      JOIN System_User su ON su.userID = t.Tutor_System_User_userID
      LEFT JOIN Tutor_Session ts ON ts.Timeslot_timeslotID = t.timeslotID 
                                 AND ts.Timeslot_Daily_Schedule_scheduleID = t.Daily_Schedule_scheduleID
      WHERE t.Daily_Schedule_scheduleID = ?
      ORDER BY t.timeslotStartTime, sub.subjectName
    `, [scheduleId]);
    res.json(rows);
  } catch (e) {
    console.error('Get timeslots error:', e);
    res.status(500).json({ message: 'Failed to load timeslots' });
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

// Complete signup for Firebase users (add this if missing)
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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});