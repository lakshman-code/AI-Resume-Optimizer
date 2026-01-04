// server/routes/resume.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyzeResume } = require('../controllers/resumeController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// POST /api/resume/analyze
router.post('/analyze', upload.single('resume'), analyzeResume);

module.exports = router;
