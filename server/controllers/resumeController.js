// server/controllers/resumeController.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const Resume = require('../models/Resume');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: extract text from PDF buffer
async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

// Helper: extract text from DOCX buffer
async function extractDocxText(buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  // Strip HTML tags to get plain text
  return result.value.replace(/<[^>]*>/g, ' ');
}

// Simple ATS scoring based on keyword overlap
function calculateAtsScore(resumeText, jobDescription) {
  const resumeWords = new Set(resumeText.toLowerCase().match(/\b\w+\b/g) || []);
  const jobWords = jobDescription.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueJobWords = [...new Set(jobWords)];
  const matches = uniqueJobWords.filter(word => resumeWords.has(word));
  const score = Math.round((matches.length / uniqueJobWords.length) * 100);
  return { score, matchCount: matches.length, totalKeywords: uniqueJobWords.length, matches };
}

// Generate improvement suggestions via OpenAI
async function generateRecommendations(resumeText, jobDescription) {
  const prompt = `You are an expert career coach. Given the following resume text and a job description, provide 5-7 concise, actionable improvement suggestions to increase ATS compatibility and better align the resume with the job requirements. Return the suggestions as a JSON array of strings.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // adjust as needed
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    const content = response.choices[0].message.content.trim();
    // Attempt to parse JSON array
    let suggestions;
    try {
      suggestions = JSON.parse(content);
    } catch (e) {
      // Fallback: split by newlines
      suggestions = content.split(/\n\s*/).filter(Boolean);
    }
    return suggestions;
  } catch (err) {
    console.error('OpenAI error:', err);
    return ['Unable to generate suggestions at this time.'];
  }
}

// Controller handler
exports.analyzeResume = async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Resume file is required.' });
    }
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const filePath = path.join(req.file.destination, req.file.filename);
    const buffer = fs.readFileSync(filePath);
    let resumeText = '';
    if (req.file.mimetype === 'application/pdf') {
      resumeText = await extractPdfText(buffer);
    } else if (
      req.file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      resumeText = await extractDocxText(buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or DOCX.' });
    }

    // ATS scoring
    const { score, matches, totalKeywords } = calculateAtsScore(resumeText, jobDescription);

    // recommendations via OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing');
      return res.status(500).json({ error: 'OpenAI API Key is missing. Please add it to server/.env' });
    }

    const recommendations = await generateRecommendations(resumeText, jobDescription);

    // Save to DB
    let resumeId = null;
    try {
      const resumeRecord = await Resume.create({
        originalFilename: req.file.originalname,
        jobDescription,
        parsedContent: resumeText,
        atsScore: score,
        matchSummary: `Matched ${matches.length} of ${totalKeywords} keywords`,
        recommendations,
      });
      resumeId = resumeRecord._id;
    } catch (dbErr) {
      console.warn('Could not save to MongoDB, but returning results anyway:', dbErr.message);
    }

    // Respond
    res.json({
      atsScore: score,
      matchSummary: `Matched ${matches.length} of ${totalKeywords} keywords`,
      recommendations,
      resumeId,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Server error during analysis.' });
  }
};
