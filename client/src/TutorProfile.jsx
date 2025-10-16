import React, { useState, useEffect } from 'react';
import api from './api';

export default function TutorProfile() {
  const [profile, setProfile] = useState({
    userFirstName: '',
    userLastName: '',
    userEmail: '',
    bio: '',
    profilePicture: '',
    specialties: [],
    experience: '',
    hourlyRate: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/profile/tutor');
      setProfile(data);
    } catch (error) {
      setMsg('Failed to load profile');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setMsg('');
      await api.put('/api/profile/tutor', profile);
      setMsg('Profile updated successfully!');
      setMsgType('success');
      setIsEditing(false);
    } catch (error) {
      setMsg('Failed to update profile');
      setMsgType('error');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile(prev => ({
          ...prev,
          profilePicture: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="h2">My Profile</h2>
          <button 
            className={`btn ${isEditing ? 'success' : 'primary'}`}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        {msg && (
          <div className={`alert ${msgType}`} style={{ marginBottom: 20 }}>
            {msg}
          </div>
        )}

        <div className="grid cols-2" style={{ gap: '24px' }}>
          {/* Left Column - Profile Picture & Basic Info */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: profile.profilePicture 
                  ? `url(${profile.profilePicture})` 
                  : 'linear-gradient(135deg, var(--brand), var(--accent))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 'bold',
                border: '4px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}>
                {!profile.profilePicture && 
                  `${profile.userFirstName?.charAt(0) || ''}${profile.userLastName?.charAt(0) || ''}`
                }
              </div>
              
              {isEditing && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ marginTop: 8, fontSize: 12 }}
                  />
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">First Name</label>
              <input
                type="text"
                value={profile.userFirstName}
                onChange={(e) => setProfile(prev => ({...prev, userFirstName: e.target.value}))}
                disabled={!isEditing}
                style={{ background: isEditing ? '#fff' : '#f9fafb' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Last Name</label>
              <input
                type="text"
                value={profile.userLastName}
                onChange={(e) => setProfile(prev => ({...prev, userLastName: e.target.value}))}
                disabled={!isEditing}
                style={{ background: isEditing ? '#fff' : '#f9fafb' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                value={profile.userEmail}
                disabled
                style={{ background: '#f3f4f6', color: '#6b7280' }}
              />
              <div className="muted">Email cannot be changed</div>
            </div>
          </div>

          {/* Right Column - Bio & Professional Info */}
          <div>
            <div className="input-group">
              <label className="input-label">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({...prev, bio: e.target.value}))}
                disabled={!isEditing}
                placeholder="Tell students about yourself, your teaching style, and experience..."
                rows={4}
                style={{ 
                  background: isEditing ? '#fff' : '#f9fafb',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Experience</label>
              <textarea
                value={profile.experience}
                onChange={(e) => setProfile(prev => ({...prev, experience: e.target.value}))}
                disabled={!isEditing}
                placeholder="Describe your teaching/tutoring experience..."
                rows={3}
                style={{ 
                  background: isEditing ? '#fff' : '#f9fafb',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Hourly Rate ($)</label>
              <input
                type="number"
                value={profile.hourlyRate}
                onChange={(e) => setProfile(prev => ({...prev, hourlyRate: e.target.value}))}
                disabled={!isEditing}
                placeholder="25"
                style={{ background: isEditing ? '#fff' : '#f9fafb' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Specialties</label>
              <input
                type="text"
                value={profile.specialties.join(', ')}
                onChange={(e) => setProfile(prev => ({
                  ...prev, 
                  specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                disabled={!isEditing}
                placeholder="Calculus, Physics, Linear Algebra..."
                style={{ background: isEditing ? '#fff' : '#f9fafb' }}
              />
              <div className="muted">Separate specialties with commas</div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn success" onClick={handleSave}>
              Save Changes
            </button>
            <button 
              className="btn ghost" 
              onClick={() => {
                setIsEditing(false);
                loadProfile(); // Reset changes
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Profile Preview Card */}
      <div className="card">
        <h2 className="h2">Profile Preview</h2>
        <div className="muted" style={{ marginBottom: 16 }}>
          This is how students will see your profile
        </div>
        
        <div style={{
          padding: 20,
          border: '2px dashed #e5e7eb',
          borderRadius: 12,
          background: '#f9fafb'
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: profile.profilePicture 
                ? `url(${profile.profilePicture})` 
                : 'linear-gradient(135deg, var(--brand), var(--accent))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {!profile.profilePicture && 
                `${profile.userFirstName?.charAt(0) || ''}${profile.userLastName?.charAt(0) || ''}`
              }
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>
                {profile.userFirstName} {profile.userLastName}
              </div>
              {profile.hourlyRate && (
                <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                  ${profile.hourlyRate}/hour
                </div>
              )}
              {profile.specialties.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {profile.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-block',
                        background: 'var(--brand)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        marginRight: 4,
                        marginBottom: 4
                      }}
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}
              {profile.bio && (
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {profile.bio}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
