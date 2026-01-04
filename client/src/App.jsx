import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (result) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jobDesc) {
      setError('Please provide both a resume file and a job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescription', jobDesc);
      const response = await axios.post('/api/resume/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'An unexpected error occurred. Make sure the server and MongoDB are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`success-bg ${showConfetti ? 'show' : ''}`}>
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="confetti" 
            style={{ 
              left: `${Math.random() * 100}vw`, 
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#38bdf8', '#818cf8', '#22c55e', '#f59e0b'][Math.floor(Math.random() * 4)]
            }} 
          />
        ))}
      </div>

      <div className="app-container">
        <h1 className="title">AI Resume Optimizer</h1>
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Resume (PDF or DOCX)</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                className="file-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label">Job Description</label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job requirements here to find the perfect match..."
              className="textarea"
            />
          </div>

          {error && <div className="error">{error}</div>}
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Analyzing with AI...' : 'Analyze Resume'}
          </button>
        </form>

        {result && (
          <div className="result-card">
            <div style={{ textAlign: 'center' }}>
              <div className="score-badge">{result.atsScore}%</div>
              <p className="match-summary">{result.matchSummary}</p>
            </div>
            
            <h3 className="suggestions-title">Actionable Recommendations</h3>
            <ul className="suggestions-list">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="suggestion-item">{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
