// ...existing code...
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');


 
// load .env when present and set reasonable defaults for local development
try {
  require('dotenv').config();
} catch (e) {
  // ignore if dotenv isn't installed; defaults set below will be used
}

// Provide safe defaults so the file can be required without syntax/runtime errors
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || 'bughouse123';
// The canonical schema in database/sql/schema.sql creates `BugHouse`.
process.env.DB_NAME = process.env.DB_NAME || 'BugHouse';

// pool created here so this route file doesn't depend on a separate db helper module
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, // changed to DB_PASS to match server/server.js env usage
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// student: get own application status
router.get('/tutor/my-application', async (req, res) => {
  // Prefer authenticated user id (if auth middleware ran). Otherwise require x-user-id header.
  const userId = (req.user && req.user.userID) ? Number(req.user.userID) : (req.header('x-user-id') ? Number(req.header('x-user-id')) : null);
  if (!userId) return res.status(401).json({ message: 'Authentication required to fetch application status (provide token or x-user-id header)' });
  try {
    const [rows] = await pool.query(
      `SELECT applicationID, status, createdAt, updatedAt, adminNote FROM Tutor_Applications WHERE userID = ? ORDER BY createdAt DESC LIMIT 1`,
      [userId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No tutor application found for this user' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('fetch my-application error', err);
    return res.status(500).json({ message: 'Failed to fetch application status' });
  }
});


// storage in memory then write to uploads/resumes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF allowed'), false);
    cb(null, true);
  },
});

// student: submit application
router.post('/tutor-applications', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Resume (PDF) is required' });
  // Prefer authenticated user id (if auth middleware ran). Otherwise require x-user-id header.
  // Do NOT default to 1 (often an admin) — that caused applications to be attributed to Admin.
  const userId = (req.user && req.user.userID) ? Number(req.user.userID) : (req.header('x-user-id') ? Number(req.header('x-user-id')) : null);
  if (!userId) return res.status(401).json({ message: 'Authentication required to submit application (provide token or x-user-id header)' });

    // verify submitting user exists before creating files or DB rows
    try {
      const [userRows] = await pool.query('SELECT userID FROM System_User WHERE userID = ?', [userId]);
      if (!userRows || userRows.length === 0) {
        return res.status(400).json({ message: 'Submitting user not found' });
      }
    } catch (e) {
      console.error('user existence check failed', e);
      return res.status(500).json({ message: 'Failed to verify submitting user' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${userId}_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    // store relative path in DB (not absolute)
    const relativePath = path.join('uploads', 'resumes', filename);
    const fullPath = path.join(__dirname, '..', relativePath);
    await fs.writeFile(fullPath, req.file.buffer);

    const [result] = await pool.query(
      `INSERT INTO Tutor_Applications (userID, coverText, resumePath, resumeMime, resumeSize, status, createdAt)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, req.body.cover || null, relativePath, req.file.mimetype, req.file.size]
    );

    let insertId = null;
    if (result && typeof result.insertId === 'number') insertId = result.insertId;
    else if (Array.isArray(result) && result[0] && typeof result[0].insertId === 'number') insertId = result[0].insertId;
    return res.status(201).json({ applicationID: insertId });
  } catch (err) {
    console.error('submit tutor application error', err);
    return res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// admin: list applications
router.get('/admin/tutor-applications', async (req, res) => {
  //console.log('GET /admin/tutor-applications invoked, user header:', req.headers['x-user-id']);
  try {
    const [rows] = await pool.query(`
      SELECT ta.*, su.userFirstName, su.userLastName, su.userEmail
      FROM Tutor_Applications ta
      JOIN System_User su ON ta.userID = su.userID
      ORDER BY ta.createdAt DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// admin: stream resume file
router.get('/admin/tutor-applications/:id/resume', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT resumePath, resumeMime FROM Tutor_Applications WHERE applicationID = ?', [req.params.id]);
    const row = rows && rows[0];
    if (!row) return res.status(404).json({ message: 'Application not found' });

    // build absolute path from stored relative path
    const allowedBase = path.resolve(__dirname, '..', 'uploads', 'resumes');
    const absPath = path.resolve(__dirname, '..', row.resumePath || '');

    // prevent path traversal / disallowed locations
    if (!absPath.startsWith(allowedBase)) {
      console.warn('Attempt to access resume outside allowed directory:', absPath);
      return res.status(400).json({ message: 'Invalid resume path' });
    }

    // check file exists
    try {
      await fs.access(absPath);
    } catch (e) {
      return res.status(404).json({ message: 'Resume file not found on disk' });
    }

    const mime = row.resumeMime || 'application/pdf';
    const basename = path.basename(row.resumePath || absPath);

    res.setHeader('Content-Type', mime);
    // force download with original-ish filename
    res.setHeader('Content-Disposition', `attachment; filename="${basename}"`);

    return res.sendFile(absPath);
  } catch (err) {
    console.error('resume fetch error', err);
    return res.status(500).json({ message: 'Failed to fetch resume' });
  }
});

// admin: approve (promote to Tutor)
router.post('/admin/tutor-applications/:id/approve', async (req, res) => {
   const appId = req.params.id;
   const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [apps] = await conn.query('SELECT userID FROM Tutor_Applications WHERE applicationID = ? FOR UPDATE', [appId]);
      const app = apps && apps[0];
      if (!app) throw new Error('Application not found');
      await conn.query('UPDATE Tutor_Applications SET status = ?, adminNote = ?, updatedAt = NOW() WHERE applicationID = ?', ['approved', req.body.note || null, appId]);
      await conn.query('UPDATE System_User SET userRole = ? WHERE userID = ?', ['Tutor', app.userID]);
      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ message: err.message || 'Approve failed' });
    } finally {
      conn.release();
    }
  });
  
  // admin: reject
  router.post('/admin/tutor-applications/:id/reject', async (req, res) => {
    try {
    await pool.query('UPDATE Tutor_Applications SET status = ?, adminNote = ?, updatedAt = NOW() WHERE applicationID = ?', ['rejected', req.body.note || null, req.params.id]);
     res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Reject failed' });
    }
  });
  
  module.exports = router;