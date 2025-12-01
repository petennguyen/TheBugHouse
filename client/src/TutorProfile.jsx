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
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered subjects for search in edit mode
  const filteredSubjects = subjects.filter(subject =>
    (subject.subjectName + ' ' + (subject.subjectCode || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          const profileRes = await axios.get('http://localhost:8000/api/user/profile', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const userData = profileRes.data.user || profileRes.data;
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
              {/* Subject selection logic from TutorAvailability */}
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm || ''}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    marginBottom: 8
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects(filteredSubjects.map(s => s.subjectID))}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects([])}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  background: 'white',
                  maxHeight: 220,
                  overflowY: 'auto',
                  marginBottom: 8
                }}>
                  {filteredSubjects.length === 0 && searchTerm && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                      No subjects found matching "{searchTerm}"
                    </div>
                  )}
                  {filteredSubjects.map((subject, index) => {
                    const isSelected = selectedSubjects.includes(subject.subjectID);
                    const displayName = subject.subjectCode ? `${subject.subjectCode} - ${subject.subjectName}` : subject.subjectName;
                    return (
                      <label
                        key={subject.subjectID}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          padding: '10px 16px',
                          borderBottom: index < filteredSubjects.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: isSelected ? '#f0f9ff' : 'transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: 20,
                          height: 20,
                          border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                          borderRadius: 4,
                          background: isSelected ? '#2563eb' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? '#1e40af' : '#374151'
                          }}>
                            {displayName}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSubjects(prev => prev.includes(subject.subjectID)
                              ? prev.filter(id => id !== subject.subjectID)
                              : [...prev, subject.subjectID]);
                            setProfile(prev => {
                              const newSubjects = prev.subjects.includes(subject.subjectID)
                                ? prev.subjects.filter(id => id !== subject.subjectID)
                                : [...prev.subjects, subject.subjectID];
                              return { ...prev, subjects: newSubjects };
                            });
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    );
                  })}
                </div>
                {selectedSubjects.length === 0 && (
                  <p className="subject-warning">Please select at least one subject</p>
                )}
              </div>
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
          <div className="profile-view" style={{ padding: '10px 0 0 0' }}>
            <div className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f3f4f6', paddingBottom: 18, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ background: '#f3f4f6', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <BugIcon className="header-bug-icon" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1e293b', letterSpacing: 0.2 }}>{profile.firstName} {profile.lastName}</h2>
                  <div className="profile-email" style={{ color: '#64748b', fontSize: 16, marginTop: 2 }}>{profile.email}</div>
                </div>
              </div>
              <button className="btn primary" onClick={() => setIsEditing(true)} style={{ fontSize: 16, padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BugIcon className="btn-bug-icon" /> Edit Profile
              </button>
            </div>

            <div className="profile-details" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Academic Info */}
              <div className="profile-section" style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 3L2 9l10 6 10-6-10-6zm0 13c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" fill="#2563eb"/></svg>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>Academic Info</h3>
                </div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 16 }}>
                  <div><strong>Major:</strong> {profile.major || <span style={{ color: '#9ca3af' }}>Not specified</span>}</div>
                  <div><strong>Year:</strong> {profile.year || <span style={{ color: '#9ca3af' }}>Not specified</span>}</div>
                </div>
              </div>

              {/* Subjects */}
              <div className="profile-section" style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H5v-2h7v2zm0-4H5v-2h7v2zm0-4H5V7h7v2zm9 8c0 .55-.45 1-1 1h-6v-2h7v1zm0-3c0 .55-.45 1-1 1h-6v-2h7v1zm0-3c0 .55-.45 1-1 1h-6V9h7v1z" fill="#16a34a"/></svg>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>Subjects</h3>
                </div>
                {profile.subjects && profile.subjects.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: 6 }}>
                    {profile.subjects.map((subjectId) => {
                      const subject = subjects.find(s => s.subjectID === subjectId);
                      if (!subject) return null;
                      return (
                        <span
                          key={subject.subjectID}
                          style={{
                            display: 'inline-block',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: 16,
                            padding: '6px 16px',
                            fontSize: 15,
                            fontWeight: 500,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            letterSpacing: 0.2,
                          }}
                        >
                          {subject.subjectCode ? `${subject.subjectCode} - ${subject.subjectName}` : subject.subjectName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No subjects specified</p>
                )}
              </div>

              {/* Biography */}
              <div className="profile-section" style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#f59e42"/></svg>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>Biography</h3>
                </div>
                <p style={{ fontSize: 16, color: profile.biography ? '#334155' : '#9ca3af', margin: 0 }}>{profile.biography || 'No biography specified'}</p>
              </div>

              {/* Qualifications */}
              <div className="profile-section" style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M17 10.5V7c0-2.21-3.58-4-8-4S1 4.79 1 7v3.5c0 2.21 3.58 4 8 4s8-1.79 8-4zM9 19c-4.42 0-8-1.79-8-4v-2.5c0-2.21 3.58-4 8-4s8 1.79 8 4V15c0 2.21-3.58 4-8 4z" fill="#0ea5e9"/></svg>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>Qualifications</h3>
                </div>
                <p style={{ fontSize: 16, color: profile.qualifications ? '#334155' : '#9ca3af', margin: 0 }}>{profile.qualifications || 'No qualifications specified'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorProfile;