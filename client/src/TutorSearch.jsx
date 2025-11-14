// TutorSearch.jsx - Improved version
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
        const subjectsRes = await axios.get('http://localhost:8000/api/subjects', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSubjects(subjectsRes.data);
        
        // Get all tutors initially
        const tutorsRes = await axios.get('http://localhost:8000/api/tutors', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
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
        const tutorsRes = await axios.get(`http://localhost:8000/api/tutors?subject=${subject}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTutors(tutorsRes.data);
      } else {
        // If no subject selected, get all tutors
        const tutorsRes = await axios.get('http://localhost:8000/api/tutors', {
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
    try {
      const res = await axios.get(`http://localhost:8000/api/tutors/${tutorID}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedTutor(res.data);
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
          <div className="tutors-grid">
            {tutors.map(tutor => (
              <div key={tutor.tutorUserID} className="tutor-card">
                <div className="tutor-card-header">
                  <h3>{tutor.userFirstName} {tutor.userLastName}</h3>
                  
                  {tutor.averageRating != null && (
                    <div className="tutor-rating">
                      <span className="rating-stars">
                        {'★'.repeat(Math.round(tutor.averageRating))}
                        {'☆'.repeat(5 - Math.round(tutor.averageRating))}
                      </span>
                      <span className="rating-value">
                        ({typeof tutor.averageRating === 'number' ? tutor.averageRating.toFixed(1) : 'N/A'})
                      </span>
                    </div>
                  )}
                </div>
                
                {tutor.subjects && tutor.subjects.length > 0 && (
                  <div className="tutor-subjects">
                    {tutor.subjects.map(subject => (
                      <span key={subject.subjectID} className="subject-tag">
                        {subject.subjectName}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="tutor-bio-preview">
                  {tutor.tutorBiography && tutor.tutorBiography.length > 100 
                    ? `${tutor.tutorBiography.substring(0, 100)}...` 
                    : tutor.tutorBiography || 'No biography available'}
                </div>
                
                <button 
                  className="btn primary view-profile-btn" 
                  onClick={() => viewTutorProfile(tutor.tutorUserID)}
                >
                  <BugIcon className="btn-bug-icon" /> View Profile
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No tutors found matching your criteria.</p>
        )}
      </div>
      
      {/* Tutor profile modal */}
      {selectedTutor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button className="modal-close" onClick={closeProfile}>×</button>
            
            <div className="tutor-profile">
              <div className="profile-header-with-icon">
                <BugIcon className="profile-bug-icon" />
                <h2>{selectedTutor.userFirstName} {selectedTutor.userLastName}</h2>
              </div>
              
              {selectedTutor.tutorMajor && selectedTutor.tutorYear && (
                <div className="tutor-academic-info">
                  {selectedTutor.tutorMajor}, {selectedTutor.tutorYear}
                </div>
              )}
              
              {selectedTutor.subjects && selectedTutor.subjects.length > 0 && (
                <div className="profile-section">
                  <h3>Subjects</h3>
                  <div className="subjects-list">
                    {selectedTutor.subjects.map(subject => (
                      <span key={subject.subjectID} className="subject-tag">
                        {subject.subjectName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTutor.tutorBiography && (
                <div className="profile-section">
                  <h3>Biography</h3>
                  <p>{selectedTutor.tutorBiography}</p>
                </div>
              )}
              
              {selectedTutor.tutorQualifications && (
                <div className="profile-section">
                  <h3>Qualifications</h3>
                  <p>{selectedTutor.tutorQualifications}</p>
                </div>
              )}
              
              {selectedTutor.availability && selectedTutor.availability.length > 0 && (
                <div className="profile-section">
                  <h3>Availability</h3>
                  <ul className="availability-list">
                    {selectedTutor.availability.map((slot, index) => (
                      <li key={index}>
                        {slot.dayOfWeek}: {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="profile-actions">
                <a 
                  href={`/book?tutor=${selectedTutor.tutorUserID}`} 
                  className="btn primary"
                >
                  <BugIcon className="btn-bug-icon" /> Book a Session
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorSearch;