require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL Database Connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
   port: process.env.DB_PORT || 3306,
};

const pool = mysql.createPool(dbConfig);
// ---- Auth helpers (paste after: const pool = mysql.createPool(dbConfig);) ----
function getTokenFromHeader(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function authRequired(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me_now');
    req.user = decoded; // { email, role, userID, ... }
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
    await pool.execute('INSERT INTO Academic_Subject (subjectName) VALUES (?) ON DUPLICATE KEY UPDATE subjectName=VALUES(subjectName)', [subjectName]);
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
    // If signInTime is null -> set NOW(); else set signOut NOW()
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

// ---- Tutor availability ----
app.get('/api/availability/mine', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT availabilityID, dayOfWeek, startTime, endTime
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
  const { dayOfWeek, startTime, endTime } = req.body || {};
  if (!dayOfWeek || !startTime || !endTime) return res.status(400).json({ message: 'dayOfWeek, startTime, endTime required' });
  try {
    await pool.execute(
      `INSERT INTO Tutor_Availability (Tutor_System_User_userID, dayOfWeek, startTime, endTime)
       VALUES (?, ?, ?, ?)`,
      [req.user.userID, dayOfWeek, startTime, endTime]
    );
    res.json({ message: 'Availability added' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to add availability' });
  }
});

app.delete('/api/availability/:id', authRequired, requireRole('Tutor'), async (req, res) => {
  try {
    const [r] = await pool.execute(
      `DELETE FROM Tutor_Availability WHERE availabilityID = ? AND Tutor_System_User_userID = ?`,
      [req.params.id, req.user.userID]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Availability removed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to remove availability' });
  }
});

// ---- Admin: create a daily schedule (for yourself) ----
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

// ---- Admin: generate timeslots for a tutor on a schedule ----
// Body: { scheduleID, subjectID, tutorUserID, start: "09:00", end: "12:00", durationMinutes: 60 }
app.post('/api/timeslots/generate', authRequired, requireRole('Admin'), async (req, res) => {
  const { scheduleID, subjectID, tutorUserID, start, end, durationMinutes } = req.body || {};
  if (!scheduleID || !subjectID || !tutorUserID || !start || !end || !durationMinutes) {
    return res.status(400).json({ message: 'scheduleID, subjectID, tutorUserID, start, end, durationMinutes required' });
  }
  try {
    // Build time blocks
    const [dsRows] = await pool.execute('SELECT scheduleID FROM Daily_Schedule WHERE scheduleID = ?', [scheduleID]);
    if (dsRows.length === 0) return res.status(404).json({ message: 'Schedule not found' });

    const toMinutes = (t) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const mStart = toMinutes(start);
    const mEnd = toMinutes(end);
    const n = Math.max(0, Math.floor((mEnd - mStart) / Number(durationMinutes)));

    const values = [];
    for (let i = 0; i < n; i++) {
      // One timeslot per block
      values.push([scheduleID, subjectID, tutorUserID]);
    }
    if (!values.length) return res.json({ message: 'No slots generated (check times)' });

    // Insert n rows; timeslotID is AUTO_INCREMENT; we’re not storing exact time-of-day on Timeslot table (you can expand schema later)
    const [result] = await pool.query(
      'INSERT INTO Timeslot (Daily_Schedule_scheduleID, Academic_Subject_subjectID, Tutor_System_User_userID) VALUES ?',
      [values]
    );

    res.json({ message: `Generated ${values.length} timeslots`, inserted: values.length, firstInsertId: result.insertId });
  } catch (e) {
    console.error('generate timeslots error', e);
    res.status(500).json({ message: 'Failed to generate timeslots' });
  }
});

app.get('/api/analytics/overview', authRequired, requireRole('Admin'), async (req, res) => {
  try {
    const [[{ totalSessions }]] = await pool.execute('SELECT COUNT(*) AS totalSessions FROM Tutor_Session');
    const [[{ totalStudents }]] = await pool.execute('SELECT COUNT(*) AS totalStudents FROM Student');
    const [[{ totalTutors }]] = await pool.execute('SELECT COUNT(*) AS totalTutors FROM Tutor');
    const [avgRows] = await pool.execute('SELECT AVG(sessionRating) AS avgRating FROM Tutor_Session WHERE sessionRating IS NOT NULL');
    const avgRating = avgRows[0]?.avgRating ?? null;
    res.json({ totalSessions, totalStudents, totalTutors, avgRating });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load analytics' });
  }
});


// ✅ POST /api/auth/complete-signup - Complete signup after Firebase client verification
app.post('/api/auth/complete-signup', async (req, res) => {
  const { firebaseUID, name, email, role } = req.body;
  
  console.log('📝 Complete signup request:', { firebaseUID, name, email, role });
  
  try {
    // ✅ Use lowercase table name (system_user not System_User)
    const [existingUsers] = await pool.execute(
      'SELECT userID FROM System_User WHERE userEmail = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        message: 'User already exists in database'
      });
    }


    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';
    
    console.log('💾 Inserting user into database:', { firstName, lastName, email, role });
    

    const [insertResult] = await pool.execute(
      'INSERT INTO System_User (userFirstName, userLastName, userEmail, userPassword, userRole, firebaseUID) VALUES (?, ?, ?, ?, ?, ?)', // ✅ Changed from system_user
      [firstName, lastName, email, 'firebase_auth', role, firebaseUID]
    );
    
    const userID = insertResult.insertId;
    console.log('✅ User inserted with ID:', userID);
    
    // Insert into role-specific table
    if (role.toLowerCase() === 'student') {
      await pool.execute(
        'INSERT INTO student (System_User_userID, studentIDCard, studentLearningGoals) VALUES (?, ?, ?)',
        [userID, 'TBD', 'General tutoring']
      );
      console.log('✅ Student record created');
    } else if (role.toLowerCase() === 'tutor') {
      await pool.execute(
        'INSERT INTO tutor (System_User_userID, tutorBiography, tutorQualifications) VALUES (?, ?, ?)',
        [userID, 'New tutor', 'To be updated']
      );
      console.log('✅ Tutor record created');
    }
    

    const token = jwt.sign(
  { email, role, userID, firebaseUID },
  process.env.JWT_SECRET || 'change_me_now',
  { expiresIn: '2h' }
);
    
    console.log('✅ Complete signup successful for:', email);
    
    res.json({
      message: 'User setup completed successfully',
      token: token,
      role: role,
      userID: userID
    });
    
  } catch (error) {
    console.error('❌ Complete signup error:', error);
    console.error('❌ Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    res.status(500).json({
      message: 'Database error during signup completion',
      error: error.message,
      details: error.sqlMessage || 'Unknown database error'
    });
  }
});

// ✅ POST /api/auth/login - Login existing users
app.post('/api/auth/login', async (req, res) => {
  const { email, firebaseUID } = req.body;

  try {
    // Check System_User table for existing users
    const [users] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole, firebaseUID FROM System_User WHERE userEmail = ? OR firebaseUID = ?',
      [email, firebaseUID]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'User not found. Please sign up first.' 
      });
    }

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
  { email: user.userEmail, role: user.userRole, userID: user.userID, firebaseUID: user.firebaseUID },
  process.env.JWT_SECRET || 'change_me_now',
  { expiresIn: '2h' }
);

    res.json({ 
      message: 'Login successful',
      token, 
      role: user.userRole,
      userID: user.userID
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.' 
    });
  }
});


app.post('/api/auth/login-database-first', async (req, res) => {
  const { email, password } = req.body;
 

  try {
    // First, test the connection
    console.log('🔍 Testing database connection...');
    
    // Try lowercase table name first
    const [users] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole FROM System_User WHERE userEmail = ? AND userPassword = ?', // ✅ Changed from system_user
      [email, password]
    );

    
  

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    const token = jwt.sign(
  { email: user.userEmail, role: user.userRole, userID: user.userID, isTestUser: true },
  process.env.JWT_SECRET || 'change_me_now',
  { expiresIn: '2h' }
);


    console.log(`LOGIN SUCCESSFUL for user: ${user.userEmail}`);

    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      role: user.userRole,
      userID: user.userID
    });

  } catch (error) {
    console.error('❌ DATABASE LOGIN ERROR:', error);
    console.error('❌ ERROR CODE:', error.code);
    console.error('❌ SQL MESSAGE:', error.sqlMessage);
    
    res.status(500).json({ 
      success: false,
      message: 'Database error: ' + error.message,
      details: error.sqlMessage || 'Unknown database error'
    });
  }
});


app.get('/api/auth/check-user/:firebaseUID', async (req, res) => {
  const { firebaseUID } = req.params;
  
  try {
    const [users] = await pool.execute(
      'SELECT userID, userRole FROM System_User WHERE firebaseUID = ?',
      [firebaseUID]
    );

    if (users.length > 0) {
      res.json({ 
        exists: true,
        role: users[0].userRole,
        userID: users[0].userID
      });
    } else {
      res.json({ 
        exists: false 
      });
    }

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ 
      message: 'Failed to check user' 
    });
  }
});

// ✅ Database test
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ message: 'Database connected successfully!' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/profile - returns profile based on JWT in Authorization header
app.get('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    // Verify token (use your JWT secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me_now');


    // Adjust this to match the claim you put into the token (email or uid)
    const email = decoded.email;
    if (!email) return res.status(400).json({ message: 'Invalid token payload' });

    const [rows] = await pool.execute(
      'SELECT userID, userFirstName, userLastName, userEmail, userRole FROM System_User WHERE userEmail = ?',
      [email]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('GET /api/user/profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// ✅ Start the server
app.listen(8000, () => {
  console.log('Server running on port 8000');
  console.log('✅ Server ready for client-side Firebase Auth');
});