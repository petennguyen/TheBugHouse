import React, { useEffect, useState } from 'react';
import api from './api';

export default function Sessions() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSessionID, setSelectedSessionID] = useState(null);
  const [rating, setRating] = useState('');
  const [feedback, setFeedback] = useState('');
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

  return (
  <div className="card">
    <h2 className="h2">My Sessions</h2>
    {msg && <p className="muted">{msg}</p>}

    <ul className="list">
      {rows.map((r) => (
        <li key={r.sessionID} className="item">
          <div>
            <div className="font-medium">
              {r.subjectName} <br />
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
            {role === 'Student' && r.sessionSignInTime && r.sessionSignOutTime && (
              <button className="btn primary" onClick={() => leaveFeedback(r.sessionID)}>
                Feedback
              </button>
            )}
            {role === 'Tutor' && (
              <button className="btn" onClick={() => toggleAttend(r.sessionID)}>
                Mark Attend/Out
              </button>
            )}
          </div>
        </li>
      ))}
      {!rows.length && <li className="muted">No sessions.</li>}
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
