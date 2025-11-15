import React, { useEffect, useState } from 'react';
import api from './api';

export default function Sessions() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSessionID, setSelectedSessionID] = useState(null);
  const [rating, setRating] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null); 
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [sessionToUpdate, setSessionToUpdate] = useState(null);
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
      setMsg('✅ Feedback submitted successfully');
      load();
    } catch {
      alert('Failed to save feedback');
    }
  };

   // Student check-in
  const checkIn = async (sessionID) => {
    try {
      await api.post(`/api/sessions/${sessionID}/check-in`);
      setMsg('✅ Checked in successfully');
      load();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check in');
    }
  };

  // Tutor: Mark session status
  const updateSessionStatus = async (sessionID, status) => {
    try {
      await api.post(`/api/sessions/${sessionID}/status`, { status });
      setShowStatusModal(false);
      setSessionToUpdate(null);
      setMsg(`✅ Session marked as ${status}`);
      load();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update session status');
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

  const confirmCancelSession = async () => {
    try {
      await api.delete(`/api/sessions/${sessionToCancel}`);
      setMsg('Session cancelled successfully');
      setShowCancelModal(false);
      setSessionToCancel(null);
      load(); 
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to cancel session';
      alert(errorMsg);
      setShowCancelModal(false);
      setSessionToCancel(null);
    }
  };

  // Determine session status
  const getSessionStatus = (session) => {
    const sessionDate = new Date(session.scheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);

    if (session.sessionStatus === 'no_show') return { label: 'No Show', color: '#dc2626', bg: '#fef2f2' };
    if (session.sessionStatus === 'cancelled') return { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' };
    
    if (session.sessionSignOutTime) return { label: 'Completed', color: '#059669', bg: '#d1fae5' };
    if (session.sessionSignInTime) return { label: 'Ongoing', color: '#f59e0b', bg: '#fef3c7' };
    if (sessionDate > today) return { label: 'Upcoming', color: '#2563eb', bg: '#dbeafe' };
    if (sessionDate < today && !session.sessionSignInTime) return { label: 'Missed', color: '#dc2626', bg: '#fef2f2' };
    
    return { label: 'Upcoming', color: '#6b7280', bg: '#f3f4f6' };
  };

  // Filter sessions based on selected filter
  const getFilteredSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'upcoming':
        return rows.filter(session => {
          const sessionDate = new Date(session.scheduleDate);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate >= today && !session.sessionSignInTime && !session.sessionSignOutTime;
        });

      case 'ongoing':
        return rows.filter(session => 
          session.sessionSignInTime && !session.sessionSignOutTime
        );
      
      case 'completed':
        return rows.filter(session => session.sessionSignOutTime);
      
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
    return sessionDate >= today && !session.sessionSignInTime && !session.sessionSignOutTime;
  }).length;
  
  const ongoingCount = rows.filter(session => 
    session.sessionSignInTime && !session.sessionSignOutTime
  ).length;

  const completedCount = rows.filter(session => session.sessionSignOutTime).length;


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
            className={`btn ${filter === 'ongoing' ? 'primary' : ''}`}
            onClick={() => setFilter('ongoing')}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              background: filter === 'ongoing' ? '#f59e0b' : '#e5e7eb',
              color: filter === 'ongoing' ? '#fff' : '#111827',
              border: 'none',
              borderRadius: 6
            }}
          >
          Ongoing ({ongoingCount})
          </button>
          <button
            className={`btn ${filter === 'completed' ? 'primary' : ''}`}
            onClick={() => setFilter('completed')}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              background: filter === 'completed' ? '#059669' : '#e5e7eb',
              color: filter === 'completed' ? '#fff' : '#111827',
              border: 'none',
              borderRadius: 6
            }}
          >
            Completed ({completedCount})
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
          const status = getSessionStatus(r);
          
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
                    background: status.bg,
                    color: status.color
                  }}>
                    {status.label}
                  </span>
                  <br />
                  {new Date(r.scheduleDate).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
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
                  Check-Out: {r.sessionSignOutTime
                    ? new Date(r.sessionSignOutTime).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '-'}
                  <span> · </span>
                  Rating: {'⭐'.repeat(r.sessionRating)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* STUDENT ACTIONS */}
                {role === 'Student' && (
                  <>
                    {/* Check-in button */}
                    {!r.sessionSignInTime && (status.label === 'Upcoming' || status.label === 'Scheduled') && (
                      <button 
                        className="btn success" 
                        onClick={() => checkIn(r.sessionID)}
                        style={{
                          padding: '6px 12px', 
                          fontSize: 12, 
                          background: '#059669', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 4
                        }}
                      >
                        Check In
                      </button>
                    )}
                    
                    {/* Feedback button */}
                    {status.label === 'Completed' && (
                      <button 
                        className="btn primary" 
                        onClick={() => leaveFeedback(r.sessionID)}
                        style={{
                          padding: '6px 12px', 
                          fontSize: 12
                        }}
                      >
                        {r.sessionRating ? 'Update Feedback' : 'Leave Feedback'}
                      </button>
                    )}
                    
                    {/* Cancel button */}
                    {(status.label === 'Upcoming' || status.label === 'Scheduled') && (
                      <button 
                        className="btn danger" 
                        onClick={() => {
                          setSessionToCancel(r.sessionID);
                          setShowCancelModal(true);
                        }}
                        style={{
                          padding: '6px 12px', 
                          fontSize: 12, 
                          background: '#dc2626', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 4
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </>
                )}

                {/* TUTOR ACTIONS */}
                {role === 'Tutor' && (
                  <>
                    {/* Update Status button */}
                    {!r.sessionSignOutTime && (status.label === 'Upcoming' || status.label === 'Ongoing' || status.label === 'Scheduled') && (
                      <button 
                        className="btn primary" 
                        onClick={() => {
                          setSessionToUpdate(r.sessionID);
                          setShowStatusModal(true);
                        }}
                        style={{
                          padding: '6px 12px', 
                          fontSize: 12
                        }}
                      >
                        Update Status
                      </button>
                    )}
                    
                    {/* View Feedback */}
                    {r.sessionFeedback && (
                      <button 
                        className="btn" 
                        onClick={() => alert(`Feedback: ${r.sessionFeedback}\nRating: ${r.sessionRating || 'N/A'}`)}
                        style={{
                          padding: '6px 12px', 
                          fontSize: 12
                        }}
                      >
                        View Feedback
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!filteredRows.length && (
          <li className="muted">
            {filter === 'upcoming' && 'No upcoming sessions.'}
            {filter === 'ongoing' && 'No ongoing sessions.'}
            {filter === 'completed' && 'No completed sessions.'}
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
                <option value="1">⭐ - Poor</option>
                <option value="2">⭐⭐ - Fair</option>
                <option value="3">⭐⭐⭐ - Good</option>
                <option value="4">⭐⭐⭐⭐ - Very Good</option>
                <option value="5">⭐⭐⭐⭐⭐ - Excellent</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Feedback:
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
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
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: 14,
                  cursor: rating ? 'pointer' : 'not-allowed'
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

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: '#fff', padding: 24, borderRadius: 12, minWidth: 320, 
            boxShadow: '0 8px 22px rgba(0,0,0,0.15)'
          }}>
            <div style={{ 
              marginBottom: 16, 
              fontWeight: 700,
              fontSize: 18
            }}>
              Cancel Session?
            </div>
            <div style={{ marginBottom: 20, color: '#6b7280' }}>
              Are you sure you want to cancel this session? This action cannot be undone.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn"
                onClick={() => {
                  setShowCancelModal(false);
                  setSessionToCancel(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 16px', 
                  background: '#e5e7eb', 
                  color: '#111827',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14
                }}
              >
                Keep Session
              </button>
              <button
                className="btn danger"
                onClick={confirmCancelSession}
                style={{
                  flex: 1,
                  padding: '8px 16px', 
                  background: '#dc2626', 
                  color: '#fff',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Status Update Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: '#fff', padding: 24, borderRadius: 12, minWidth: 400, 
            boxShadow: '0 8px 22px rgba(0,0,0,0.15)'
          }}>
            <div style={{ 
              marginBottom: 16, 
              fontWeight: 700,
              fontSize: 18
            }}>
              Update Session Status
            </div>
            <div style={{ marginBottom: 20, color: '#6b7280' }}>
              Select the status for this tutoring session:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => updateSessionStatus(sessionToUpdate, 'completed')}
                style={{
                  padding: '12px 16px', 
                  background: '#059669', 
                  color: '#fff',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ✓ Mark as Completed
              </button>
              <button
                onClick={() => updateSessionStatus(sessionToUpdate, 'no_show')}
                style={{
                  padding: '12px 16px', 
                  background: '#dc2626', 
                  color: '#fff',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ✗ Mark as No Show
              </button>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSessionToCancel(sessionToUpdate);
                  setSessionToUpdate(null);
                  setShowCancelModal(true);
                }}
                style={{
                  padding: '12px 16px', 
                  background: '#6b7280', 
                  color: '#fff',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🚫 Cancel Session
              </button>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSessionToUpdate(null);
                }}
                style={{
                  padding: '12px 16px', 
                  background: '#e5e7eb', 
                  color: '#111827',
                  border: 'none', 
                  borderRadius: 6, 
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
