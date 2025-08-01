const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mysql = require('mysql2/promise'); // Add MySQL

const app = express();
app.use(cors());
app.use(express.json());

const pendingUsers = new Map();

// ✅ MySQL Database Connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'bughouse123', //  MySQL password
  database: 'BugHouse'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// ✅ Dummy user data (for testing existing users) - Keep for backwards compatibility
const users = [
  { email: "student@example.com", password: "1234", role: "student" },
  { email: "admin@example.com", password: "admin", role: "admin" },
];

// // Email transporter configuration
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'your-email@gmail.com', // Replace with your email
//     pass: 'your-app-password'     // Replace with your app password
//   }
// });

// ✅ POST /api/auth/signup - New user registration
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate school email domain
  const allowedDomains = ['mavs.uta.edu']; 
  const emailDomain = email.split('@')[1];
  
  if (!allowedDomains.includes(emailDomain)) {
    return res.status(400).json({ 
      message: 'Please use your UTA address' 
    });
  }

  try {
    // Check if user already exists in database
    const [existingUsers] = await pool.execute(
      'SELECT * FROM Student WHERE studentEmail = ? UNION SELECT * FROM Tutor WHERE tutorEmail = ? UNION SELECT * FROM Administrator WHERE adminEmail = ?',
      [email, email, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'An account with this email already exists' 
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Store pending user (expires in 1 hour)
    pendingUsers.set(verificationToken, {
      name,
      email,
      password,
      role,
      expiresAt: Date.now() + 3600000 // 1 hour
    });

    // Send verification email 
    //Not working yet*
    const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Verify Your BugHouse Account',
      html: `
        <h2>Welcome to BugHouse!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for creating an account. Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ 
      message: 'Account created! Please check your email to verify your account.' 
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Failed to create account. Please try again.' 
    });
  }
});

// ✅ POST /api/auth/verify-email - Email verification
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  
  const userData = pendingUsers.get(token);
  
  if (!userData) {
    return res.status(400).json({ 
      message: 'Invalid or expired verification link' 
    });
  }
  
  if (Date.now() > userData.expiresAt) {
    pendingUsers.delete(token);
    return res.status(400).json({ 
      message: 'Verification link has expired. Please sign up again.' 
    });
  }

  try {
    // Save verified user to database based on role
    if (userData.role === 'student') {
      // Get next available ID
      const [maxId] = await pool.execute('SELECT MAX(studentID) as maxId FROM Student');
      const nextId = (maxId[0].maxId || 0) + 1;

      await pool.execute(
        'INSERT INTO Student (studentID, studentName, studentEmail, password, Administrator_adminID) VALUES (?, ?, ?, ?, ?)',
        [nextId, userData.name, userData.email, userData.password, 1] // Default admin ID = 1
      );
    } else if (userData.role === 'tutor') {
      // Get next available ID
      const [maxId] = await pool.execute('SELECT MAX(tutorID) as maxId FROM Tutor');
      const nextId = (maxId[0].maxId || 0) + 1;

      await pool.execute(
        'INSERT INTO Tutor (tutorID, tutorName, tutorEmail, password, Administrator_adminID, tutorBiography, tutorQualifications) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nextId, userData.name, userData.email, userData.password, 1, 'New tutor', 'To be updated']
      );
    }

    // Remove from pending
    pendingUsers.delete(token);
    
    // Generate login token
    const loginToken = jwt.sign(
      { email: userData.email, role: userData.role },
      'secretKey',
      { expiresIn: '2h' }
    );

    res.json({ 
      message: 'Email verified successfully! You are now logged in.',
      token: loginToken,
      role: userData.role
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      message: 'Failed to save user to database. Please try again.' 
    });
  }
});

// ✅ POST /api/auth/login - Updated to check database
// Update query to match with our current schema
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check database for user
    const [students] = await pool.execute(
      'SELECT studentEmail as email, password, "student" as role FROM Student WHERE studentEmail = ? AND password = ?',
      [email, password]
    );

    const [tutors] = await pool.execute(
      'SELECT tutorEmail as email, password, "tutor" as role FROM Tutor WHERE tutorEmail = ? AND password = ?',
      [email, password]
    );

    const [admins] = await pool.execute(
      'SELECT adminEmail as email, password, "admin" as role FROM Administrator WHERE adminEmail = ? AND password = ?',
      [email, password]
    );

    let user = [...students, ...tutors, ...admins][0];

    if (!user) {
      // Fallback to dummy users for testing
      const dummyUser = users.find(u => u.email === email && u.password === password);
      if (!dummyUser) {
        return res.status(401).json({ 
          message: 'Invalid email or password' 
        });
      }
      user = dummyUser;
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, role: user.role },
      'secretKey',
      { expiresIn: '2h' }
    );

    res.json({ 
      message: 'Login successful',
      token, 
      role: user.role 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.' 
    });
  }
});

//Visit http://localhost:8000/test-db - should show "Database connected successfully!"
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
});