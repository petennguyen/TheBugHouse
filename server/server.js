// server/server.js - Use correct capitalized table names
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
  host: 'localhost',
  user: 'root',
  password: 'bughouse123',
  database: 'BugHouse'
};

const pool = mysql.createPool(dbConfig);

// ✅ POST /api/auth/complete-signup - Complete signup after Firebase client verification
app.post('/api/auth/complete-signup', async (req, res) => {
  const { firebaseUID, name, email, role } = req.body;
  
  console.log(`🔍 COMPLETE SIGNUP: ${firebaseUID}`);
  
  try {
    // Check if user already exists in database
    const [existingUsers] = await pool.execute(
      'SELECT userID FROM System_User WHERE firebaseUID = ? OR userEmail = ?',
      [firebaseUID, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'User already exists in database' 
      });
    }

    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Insert into System_User table
    const [userResult] = await pool.execute(
      'INSERT INTO System_User (userFirstname, userLastname, userEmail, userPassword, userRole, firebaseUID) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, 'firebase_managed', role, firebaseUID]
    );

    const systemUserID = userResult.insertId;
    console.log('✅ User inserted into System_User with ID:', systemUserID);

    // Insert into role-specific table
    if (role === 'student') {
      await pool.execute(
        'INSERT INTO Student (System_User_userID, studentIDCard, studentLearningGoals) VALUES (?, ?, ?)',
        [systemUserID, `ID${systemUserID.toString().padStart(3, '0')}`, 'General Studies']
      );
      console.log('✅ Student record created');
    } else if (role === 'tutor') {
      await pool.execute(
        'INSERT INTO Tutor (System_User_userID, tutorBiography, tutorQualifications) VALUES (?, ?, ?)',
        [systemUserID, 'New tutor biography', 'Qualifications to be updated']
      );
      console.log('✅ Tutor record created');
    }

    // Generate login token
    const loginToken = jwt.sign(
      { email: email, role: role, userID: systemUserID, firebaseUID: firebaseUID },
      'secretKey',
      { expiresIn: '2h' }
    );

    res.json({ 
      message: 'Signup completed successfully!',
      token: loginToken,
      role: role,
      userID: systemUserID
    });

  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({ 
      message: 'Failed to complete signup: ' + error.message
    });
  }
});

// ✅ POST /api/auth/login - Login existing users
app.post('/api/auth/login', async (req, res) => {
  const { email, firebaseUID } = req.body;

  try {
    // Check System_User table for existing users
    const [users] = await pool.execute(
      'SELECT userID, userFirstname, userLastname, userEmail, userRole, firebaseUID FROM System_User WHERE userEmail = ? OR firebaseUID = ?',
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
      'secretKey',
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

// ✅ POST /api/auth/login-database-first - Login using direct database check
app.post('/api/auth/login-database-first', async (req, res) => {
  const { email, password } = req.body;
  
  console.log(`🔍 DATABASE-FIRST LOGIN: ${email}`);

  try {
    // Direct database check (no Firebase)
    const [users] = await pool.execute(
      'SELECT userID, userFirstname, userLastname, userEmail, userRole FROM System_User WHERE userEmail = ? AND userPassword = ?',
      [email, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      { email: user.userEmail, role: user.userRole, userID: user.userID, isTestUser: true },
      'secretKey',
      { expiresIn: '2h' }
    );

    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      role: user.userRole,
      userID: user.userID
    });

  } catch (error) {
    console.error('Database login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Database error: ' + error.message
    });
  }
});

// ✅ GET /api/auth/check-user - Check if user exists in database
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

// ✅ Start the server
app.listen(8000, () => {
  console.log('Server running on port 8000');
  console.log('✅ Server ready for client-side Firebase Auth');
});