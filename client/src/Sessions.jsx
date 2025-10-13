import React, { useEffect, useState } from 'react';
import api from './api';

export default function Sessions() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSessionID, setSelectedSessionID] = useState(null);
  const [rating, setRating] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past'
  const role = localStorage.getItem('role');

  const load = async () => {
    try {
      const { data } = await api.get('/api/sessions/mine');
      setRows(data);
    } catch {
      setMsg('Failed to load sessions');
    }
  };

  useEffect(() => { load(); }, []);

  const leaveFeedback = (sessionID) => {
    setSelectedSessionID(sessionID);
    setShowFeedbackModal(true);
    setRating('');
    setFeedback('');
  };

  const submitFeedback = async () => {
    try {
      await api.post(`/api/sessions/${selectedSessionID}/feedback`, { 
        rating: Number(rating), 
        feedback 
      });
      setShowFeedbackModal(false);
      load();
    } catch {
      alert('Failed to save feedback');
    }
  };

  const toggleAttend = async (sessionID) => {
    try {
      await api.post(`/api/sessions/${sessionID}/attended`);
      load();
    } catch {
      alert('Failed to update attendance');
    }
  };

  // Filter sessions based on selected filter
  const getFilteredSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison

    switch (filter) {
      case 'upcoming':
        return rows.filter(session => {
          const sessionDate = new Date(session.scheduleDate);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate >= today;
        });
      
      case 'past':
        return rows.filter(session => {
          const sessionDate = new Date(session.scheduleDate);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate < today;
        });
      
      default:
        return rows;
    }
  };

  const filteredRows = getFilteredSessions();
  const upcomingCount = rows.filter(session => {
    const sessionDate = new Date(session.scheduleDate);
    sessionDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessionDate >= today;
  }).length;
  
  const pastCount = rows.filter(session => {
    const sessionDate = new Date(session.scheduleDate);
    sessionDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessionDate < today;
  }).length;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="h2">My Sessions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${filter === 'all' ? 'primary' : ''}`}
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              background: filter === 'all' ? '#2563eb' : '#e5e7eb',
              color: filter === 'all' ? '#fff' : '#111827',
              border: 'none',
              borderRadius: 6
            }}
          >
            All ({rows.length})
          </button>
          <button
            className={`btn ${filter === 'upcoming' ? 'primary' : ''}`}
            onClick={() => setFilter('upcoming')}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              background: filter === 'upcoming' ? '#2563eb' : '#e5e7eb',
              color: filter === 'upcoming' ? '#fff' : '#111827',
              border: 'none',
              borderRadius: 6
            }}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            className={`btn ${filter === 'past' ? 'primary' : ''}`}
            onClick={() => setFilter('past')}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              background: filter === 'past' ? '#2563eb' : '#e5e7eb',
              color: filter === 'past' ? '#fff' : '#111827',
              border: 'none',
              borderRadius: 6
            }}
          >
            Past ({pastCount})
          </button>
        </div>
      </div>

      {msg && <p className="muted">{msg}</p>}

      <ul className="list">
        {filteredRows.map((r) => {
          const sessionDate = new Date(r.scheduleDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          sessionDate.setHours(0, 0, 0, 0);
          const isUpcoming = sessionDate >= today;
          
          return (
            <li key={r.sessionID} className="item">
              <div>
                <div className="font-medium">
                  {r.subjectName}
                  {/* Add visual indicator for upcoming/past */}
                  <span style={{
                    marginLeft: 8,
                    padding: '2px 6px',
                    fontSize: 10,
                    borderRadius: 4,
                    background: isUpcoming ? '#dcfce7' : '#f3f4f6',
                    color: isUpcoming ? '#166534' : '#6b7280'
                  }}>
                    {isUpcoming ? 'UPCOMING' : 'PAST'}
                  </span>
                  <br />
                  {new Date(r.scheduleDate).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
                {role === 'Student' && (
                  <div className="muted">Tutor: {r.tutorFirstName} {r.tutorLastName}</div>
                )}
                {role === 'Tutor' && (
                  <div className="muted">Student: {r.studentFirstName} {r.studentLastName}</div>
                )}
                <div className="muted" style={{ fontSize: 12 }}>
                  In: {r.sessionSignInTime
                    ? new Date(r.sessionSignInTime).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '-'}
                  <span> · </span>
                  Out: {r.sessionSignOutTime
                    ? new Date(r.sessionSignOutTime).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '-'}
                  <span> · </span>
                  Rating: {r.sessionRating ?? '-'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {/* Feedback button - only for past completed sessions */}
                {role === 'Student' && !isUpcoming && r.sessionSignInTime && r.sessionSignOutTime && (
                  <button className="btn primary" onClick={() => leaveFeedback(r.sessionID)}>
                    Feedback
                  </button>
                )}
                {/* Check-in button - only for upcoming sessions */}
                {role === 'Student' && isUpcoming && !r.sessionSignInTime && (
                  <button 
                    className="btn success" 
                    onClick={() => console.log('Check in to session', r.sessionID)}
                    style={{
                      padding: '6px 12px', fontSize: 12, background: '#059669', 
                      color: '#fff', border: 'none', borderRadius: 4
                    }}
                  >
                    Check In
                  </button>
                )}
                {/* Cancel button - only for upcoming sessions */}
                {role === 'Student' && isUpcoming && !r.sessionSignOutTime && (
                  <button 
                    className="btn danger" 
                    onClick={() => console.log('Cancel session', r.sessionID)}
                    style={{
                      padding: '6px 12px', fontSize: 12, background: '#dc2626', 
                      color: '#fff', border: 'none', borderRadius: 4
                    }}
                  >
                    Cancel
                  </button>
                )}
                {role === 'Tutor' && (
                  <button className="btn" onClick={() => toggleAttend(r.sessionID)}>
                    Mark Attend/Out
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {!filteredRows.length && (
          <li className="muted">
            {filter === 'upcoming' && 'No upcoming sessions.'}
            {filter === 'past' && 'No past sessions.'}
            {filter === 'all' && 'No sessions.'}
          </li>
        )}
      </ul>

      {showFeedbackModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', padding: 24, borderRadius: 12, minWidth: 400, 
            boxShadow: '0 8px 22px rgba(0,0,0,0.15)'
          }}>
            <div style={{ marginBottom: 16, fontWeight: 700 }}>
              Leave Feedback
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Rating (1-5):
              </label>
              <select 
                value={rating} 
                onChange={(e) => setRating(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 14
                }}
              >
                <option value="">Select rating...</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Feedback:
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback..."
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 14, resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn primary"
                onClick={submitFeedback}
                disabled={!rating}
                style={{
                  padding: '8px 16px', background: rating ? '#2563eb' : '#9ca3af',
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: 14
                }}
              >
                Submit Feedback
              </button>
              <button
                className="btn"
                onClick={() => setShowFeedbackModal(false)}
                style={{
                  padding: '8px 16px', background: '#e5e7eb', color: '#111827',
                  border: 'none', borderRadius: 6, fontSize: 14
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
