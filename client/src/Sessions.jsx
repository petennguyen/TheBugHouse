import React, { useEffect, useState } from 'react';
import api from './api';

export default function Sessions() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
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

  const leaveFeedback = async (sessionID) => {
    const rating = Number(prompt('Rating 1-5?'));
    const feedback = prompt('Feedback?') || '';
    try {
      await api.post(`/api/sessions/${sessionID}/feedback`, { rating, feedback });
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
            {role === 'Student' && (
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
  </div>
);
}
