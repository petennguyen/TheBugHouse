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