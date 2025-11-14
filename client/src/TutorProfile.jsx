// TutorProfile.jsx - Fixed and improved UI version
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

const TutorProfile = () => {
  const [profile, setProfile] = useState({
    userID: '',
    firstName: '',
    lastName: '',
    email: '',
    biography: '',
    qualifications: '',
    major: '',
    year: '',
    subjects: []
  });

  const [subjects, setSubjects] = useState([]);
  const [isEditing, setIsEditing] = useState(true); // Start in editing mode
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get all subjects for selection
        const subjectsRes = await axios.get('http://localhost:8000/api/subjects', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSubjects(subjectsRes.data);
        
        // Get tutor profile
        try {
          const profileRes = await axios.get('http://localhost:8000/api/tutor/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          const userData = profileRes.data;
          setProfile({
            userID: userData.userID || '',
            firstName: userData.userFirstName || '',
            lastName: userData.userLastName || '',
            email: userData.userEmail || '',
            biography: userData.tutorBiography || '',
            qualifications: userData.tutorQualifications || '',
            major: userData.tutorMajor || '',
            year: userData.tutorYear || '',
            subjects: userData.tutorSubjects || []
          });
          
          if (userData.tutorSubjects && userData.tutorSubjects.length > 0) {
            setSelectedSubjects(userData.tutorSubjects);
          }
        } catch (profileErr) {
          console.error('Error fetching profile details:', profileErr);
          
          // If we can't get profile, get basic user info
          const userRes = await axios.get('http://localhost:8000/api/user/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          const userData = userRes.data.user;
          setProfile({
            userID: userData.userID || '',
            firstName: userData.userFirstName || '',
            lastName: userData.userLastName || '',
            email: userData.userEmail || '',
            biography: '',
            qualifications: '',
            major: '',
            year: '',
            subjects: []
          });
          
          setError('Failed to load complete profile data. Please fill in your details.');
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };
  
  // Toggle subject selection
  const toggleSubject = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
    
    // Also update the profile object
    setProfile(prev => {
      const newSubjects = prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId];
      
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        biography: profile.biography,
        qualifications: profile.qualifications,
        major: profile.major,
        year: profile.year,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : profile.subjects
      };
      
      await axios.put('http://localhost:8000/api/tutor/profile', updatedProfile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile', err);
      setError('Failed to update profile: ' + (err.response?.data?.message || err.message));
      setTimeout(() => setError(''), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="page-header">
          <BugIcon className="header-bug-icon" />
          <h2 className="h2">Loading profile...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="card">
        <div className="page-header">
          <BugIcon className="header-bug-icon" />
          <h1 className="h2">Tutor Profile</h1>
        </div>
        
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
        
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="form-row two">
              <div className="input-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled
                />
              </div>
            </div>
            
            <div className="form-row two">
              <div className="input-group">
                <label htmlFor="major">Major</label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={profile.major}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="year">Year</label>
                <select
                  id="year"
                  name="year"
                  value={profile.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </div>
            
            <div className="input-group">
              <label>Subjects</label>
              <div className="subject-selector">
                {subjects.map(subject => (
                  <div 
                    key={subject.subjectID}
                    className={`subject-chip ${selectedSubjects.includes(subject.subjectID) ? 'selected' : ''}`}
                    onClick={() => toggleSubject(subject.subjectID)}
                  >
                    {subject.subjectName}
                    {selectedSubjects.includes(subject.subjectID) && (
                      <span className="checkmark">✓</span>
                    )}
                  </div>
                ))}
              </div>
              {selectedSubjects.length === 0 && (
                <p className="subject-warning">Please select at least one subject</p>
              )}
            </div>
            
            <div className="input-group">
              <label htmlFor="biography">Biography</label>
              <textarea
                id="biography"
                name="biography"
                rows="3"
                value={profile.biography}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="qualifications">Qualifications</label>
              <textarea
                id="qualifications"
                name="qualifications"
                rows="3"
                value={profile.qualifications}
                onChange={handleChange}
                required
              />
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                className="btn primary"
                disabled={selectedSubjects.length === 0}
              >
                <BugIcon className="btn-bug-icon" /> Save Profile
              </button>
              {!error && <button type="button" className="btn ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </button>}
            </div>
          </form>
        ) : (
          <div className="profile-view">
            <div className="profile-header">
              <div>
                <h2>{profile.firstName} {profile.lastName}</h2>
                <div className="profile-email">{profile.email}</div>
              </div>
              <button className="btn primary" onClick={() => setIsEditing(true)}>
                <BugIcon className="btn-bug-icon" /> Edit Profile
              </button>
            </div>
            
            <div className="profile-details">
              <div className="profile-section">
                <h3>Academic Info</h3>
                <div><strong>Major:</strong> {profile.major || 'Not specified'}</div>
                <div><strong>Year:</strong> {profile.year || 'Not specified'}</div>
              </div>
              
              <div className="profile-section">
                <h3>Subjects</h3>
                {profile.subjects && profile.subjects.length > 0 ? (
                  <div className="subjects-list">
                    {profile.subjects.map((subjectId) => {
                      const subject = subjects.find(s => s.subjectID === subjectId);
                      return subject ? (
                        <span key={subject.subjectID} className="subject-tag">{subject.subjectName}</span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p>No subjects specified</p>
                )}
              </div>
              
              <div className="profile-section">
                <h3>Biography</h3>
                <p>{profile.biography || 'No biography specified'}</p>
              </div>
              
              <div className="profile-section">
                <h3>Qualifications</h3>
                <p>{profile.qualifications || 'No qualifications specified'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorProfile;