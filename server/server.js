const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Dummy user data (for testing)
const users = [
  { email: "student@example.com", password: "1234", role: "student" },
  { email: "admin@example.com", password: "admin", role: "admin" },
];

// ✅ POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Find matching user
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // ✅ Generate JWT token
  const token = jwt.sign(
    { email: user.email, role: user.role },
    'secretKey', // 🔐 Replace with env var in production
    { expiresIn: '2h' }
  );

  res.json({ token, role: user.role });
});

// ✅ Start the server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
