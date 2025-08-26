import React, { useEffect, useState } from 'react';
import api from './api';

export default function StudentBook() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/api/subjects').then(res => setSubjects(res.data)).catch(() => setSubjects([]));
  }, []);

  const search = async () => {
    setMsg('');
    if (!subjectId || !date) return;
    try {
      const { data } = await api.get('/api/timeslots/available', { params: { date, subjectId } });
      setSlots(data);
    } catch (e) {
      setMsg('Failed to load timeslots');
    }
  };

  const book = async (s) => {
    try {
      await api.post('/api/sessions/book', { timeslotID: s.timeslotID, scheduleID: s.scheduleID });
      setMsg('✅ Booked!');
      await search();
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to book');
    }
  };

  return (
  <div className="grid gap-3">
    <div className="card">
      <h2 className="h2">Book a Session</h2>

      <div className="form-row two">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Select subject...</option>
          {subjects.map((s) => (
            <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>
          ))}
        </select>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn" onClick={search}>Search</button>
      </div>

      {msg && <p className="muted">{msg}</p>}
    </div>

    <div className="card">
      <ul className="list">
        {slots.map((s) => (
          <li key={`${s.scheduleID}-${s.timeslotID}`} className="item">
            <div>
              <div className="font-medium">{s.subjectName}</div>
              <div className="muted">{s.tutorFirstName} {s.tutorLastName} — {s.scheduleDate}</div>
            </div>
            <button className="btn success" onClick={() => book(s)}>Book</button>
          </li>
        ))}

        {!slots.length && <li className="muted">No results yet.</li>}
      </ul>
    </div>
  </div>
);
}
