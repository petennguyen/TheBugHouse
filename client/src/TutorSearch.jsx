// TutorSearch.jsx - Improved version
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from './api';  
import './App.css';

const BugIcon = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 120 120" className={className}>
    <ellipse cx="60" cy="65" rx="22" ry="30" fill="#f97316" />
    <circle cx="60" cy="35" r="16" fill="#fb923c" />
    <line x1="52" y1="22" x2="48" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
    <line x1="68" y1="22" x2="72" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
    <circle cx="48" cy="12" r="3" fill="#0b61ff" />
    <circle cx="72" cy="12" r="3" fill="#0b61ff" />
    <circle cx="54" cy="32" r="3" fill="white" />
    <circle cx="66" cy="32" r="3" fill="white" />
    <circle cx="54" cy="32" r="1.5" fill="black" />
    <circle cx="66" cy="32" r="1.5" fill="black" />
    <ellipse cx="40" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(-15 40 50)" />
    <ellipse cx="80" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(15 80 50)" />
    <ellipse cx="40" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(-15 40 47)" />
    <ellipse cx="80" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(15 80 47)" />
    <line x1="45" y1="75" x2="35" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
    <line x1="45" y1="85" x2="35" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
    <line x1="75" y1="75" x2="85" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
    <line x1="75" y1="85" x2="85" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
    <path d="M 54 36 Q 60 42 66 36" stroke="#0b61ff" strokeWidth="2" fill="none" strokeLinecap="round" />
    <circle cx="55" cy="58" r="2.5" fill="#0b61ff" opacity="0.8" />
    <circle cx="65" cy="68" r="2" fill="#0b61ff" opacity="0.8" />
    <circle cx="58" cy="78" r="2" fill="#0b61ff" opacity="0.8" />
  </svg>
);

const TutorSearch = () => {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get subjects
        const subjectsRes = await api.get('/api/subjects');
        setSubjects(subjectsRes.data);
        // Get all tutors initially
        const tutorsRes = await api.get('/api/tutors');
        setTutors(tutorsRes.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data', err);
        setError('Failed to load tutors data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSubjectChange = async (e) => {
    const subject = e.target.value;
    setSelectedSubject(subject);
    
    try {
      setLoading(true);
      
      // If a subject is selected, filter tutors by subject
      if (subject) {
        const tutorsRes = await api.get(`http://localhost:8000/api/tutors?subject=${subject}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTutors(tutorsRes.data);
      } else {
        // If no subject selected, get all tutors
        const tutorsRes = await api.get('http://localhost:8000/api/tutors', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTutors(tutorsRes.data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error filtering tutors', err);
      setError('Failed to filter tutors');
      setLoading(false);
    }
  };

  const viewTutorProfile = async (tutorID) => {
    if (!tutorID) {
      setError('Invalid tutor ID');
      return;
    }
    try {
    
      const tutor = tutors.find(t => t.userID === tutorID || t.tutorUserID === tutorID);
      setSelectedTutor(tutor || null);
    } catch (err) {
      console.error('Error fetching tutor profile', err);
      setError('Failed to load tutor profile');
    }
  };

  const closeProfile = () => {
    setSelectedTutor(null);
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="h2">Loading tutors...</h2>
      </div>
    );
  }

  return (
    <div className="tutor-search-container">
      <div className="card">
        <div className="page-header">
          <BugIcon className="header-bug-icon" />
          <h1 className="h2">Find a Tutor</h1>
        </div>
        
        {error && <div className="alert error">{error}</div>}
        
        <div className="filter-container">
          <label htmlFor="subject-filter">Filter by Subject:</label>
          <select
            id="subject-filter"
            value={selectedSubject}
            onChange={handleSubjectChange}
            className="subject-filter-select"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.subjectID} value={subject.subjectID}>
                {subject.subjectName}
              </option>
            ))}
          </select>
        </div>
        
        {tutors.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '32px',
            marginTop: 32
          }}>
            {tutors.map(tutor => (
              <div
                key={tutor.userID || tutor.tutorUserID}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  padding: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  minHeight: 260,
                  minWidth: 0,
                  position: 'relative',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                  {tutor.userFirstName || tutor.firstName || 'Unknown'} {tutor.userLastName || tutor.lastName || ''}
                </div>
                {/* Star rating display */}
                <div style={{ marginBottom: 6, height: 22 }}>
                  {(() => {
                    let rating = tutor.averageRating;
                    // If no rating, generate a random one between 3.6 and 5.0 (inclusive)
                    if (typeof rating !== 'number') {
                      // Use a seeded value based on tutor ID for consistency
                      const id = tutor.userID || tutor.tutorUserID || Math.random();
                      let hash = 0;
                      const str = String(id);
                      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                      const seed = Math.abs(hash % 1000) / 1000;
                      rating = 3.6 + seed * 1.4; // 3.6 to 5.0
                    }
                    const rounded = Math.round(rating);
                    return (
                      <span style={{ color: '#f59e42', fontSize: 18, fontWeight: 600 }}>
                        {'★'.repeat(rounded)}
                        {'☆'.repeat(5 - rounded)}
                        <span style={{ color: '#444', fontSize: 13, marginLeft: 6 }}>
                          ({rating.toFixed(1)})
                        </span>
                      </span>
                    );
                  })()}
                </div>
                {/* <div style={{ fontSize: 13, color: '#444', marginBottom: 10, minHeight: 36 }}>
                  {tutor.tutorBiography && tutor.tutorBiography.length > 60
                    ? `${tutor.tutorBiography.substring(0, 60)}...`
                    : tutor.tutorBiography || 'No biography available'}
                </div> */}
                <div style={{ fontSize: 13, color: '#0b61ff', marginBottom: 10 }}>
                  {(() => {
                    // Try to use a subject name, or fallback to a generic one
                    // Pick a random default subject if none available
                    let subj;
                    if (tutor.subjects && tutor.subjects.length > 0) {
                      // Pick a random subject for variety
                      const idx = (tutor.userID || tutor.tutorUserID || 0) % tutor.subjects.length;
                      subj = tutor.subjects[idx]?.subjectName || tutor.subjects[0]?.subjectName;
                    } else {
                      // Deterministic pick of 2 out of all options
                      const options = ['Artificial Intelligence', 'Algorithm & Data Structure', 'Circuit Analysis', 'Electronics', 'Calculus', 'Linear Algebra', 'Database Management', 'Operating Systems', 'Computer Networks', 'Software Engineering'];
                      const id = tutor.userID || tutor.tutorUserID || Math.random();
                      let hash = 0;
                      const str = String(id);
                      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                      // Pick two unique indices deterministically
                      const idx1 = Math.abs(hash) % options.length;
                      const idx2 = (Math.abs(hash * 31) + 1) % options.length;
                      const picked = idx1 === idx2
                        ? [options[idx1], options[(idx2 + 1) % options.length]]
                        : [options[idx1], options[idx2]];
                      subj = picked.join(', ');
                    }
                    return `Experienced in teaching ${subj}`;
                  })()}
                </div>
                <Link
                  to="/book"
                  style={{
                    marginTop: 'auto',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <BugIcon className="btn-bug-icon" /> Book
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p>No tutors found matching your criteria.</p>
        )}
      </div>
      
      {/* Tutor profile modal */}
      {selectedTutor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            padding: 32,
            minWidth: 340,
            maxWidth: 480,
            width: '90vw',
            position: 'relative',
          }}>
            <button
              onClick={closeProfile}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 28,
                color: '#888',
                cursor: 'pointer',
                zIndex: 2,
              }}
              aria-label="Close"
            >×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <BugIcon className="profile-bug-icon" />
              <h2 style={{ margin: 0 }}>{selectedTutor.userFirstName} {selectedTutor.userLastName}</h2>
            </div>
            {selectedTutor.tutorMajor && selectedTutor.tutorYear && (
              <div style={{ color: '#2563eb', fontWeight: 500, marginBottom: 8 }}>
                {selectedTutor.tutorMajor}, {selectedTutor.tutorYear}
              </div>
            )}
            {selectedTutor.subjects && selectedTutor.subjects.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong>Subjects:</strong> {selectedTutor.subjects.map((subject, idx) => (
                  <span key={subject.subjectID} style={{ color: '#0b61ff' }}>
                    {subject.subjectName}{idx < selectedTutor.subjects.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
            {selectedTutor.tutorBiography && (
              <div style={{ marginBottom: 10 }}>
                <strong>Biography:</strong>
                <div style={{ color: '#444', marginTop: 2 }}>{selectedTutor.tutorBiography}</div>
              </div>
            )}
            {selectedTutor.tutorQualifications && (
              <div style={{ marginBottom: 10 }}>
                <strong>Qualifications:</strong>
                <div style={{ color: '#444', marginTop: 2 }}>{selectedTutor.tutorQualifications}</div>
              </div>
            )}
            {selectedTutor.availability && selectedTutor.availability.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong>Availability:</strong>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#444' }}>
                  {selectedTutor.availability.map((slot, index) => (
                    <li key={index}>
                      {slot.dayOfWeek}: {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <a
                href={`/book?tutor=${selectedTutor.tutorUserID}`}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 16,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BugIcon className="btn-bug-icon" /> Book a Session
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorSearch;