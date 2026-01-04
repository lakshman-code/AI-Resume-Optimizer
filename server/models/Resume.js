const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  originalFilename: { type: String, required: true },
  jobDescription: { type: String, required: true },
  parsedContent: { type: String, required: true },
  atsScore: { type: Number, required: true },
  matchSummary: { type: String },
  recommendations: [{ type: String }], // List of improvements
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Resume", resumeSchema);
