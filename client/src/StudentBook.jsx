import React, { useEffect, useState } from 'react';
import api from './api';

export default function StudentBook() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [sessionLength, setSessionLength] = useState(60); 

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

  const searchAvailability = async () => {
    try {
      const { data } = await api.get('/api/tutor/availability', { params: { dayOfWeek: new Date(date).toLocaleString('en-US', { weekday: 'short' }) } });
      setSlots(data);
    } catch (e) {
      setMsg('Failed to load tutor availability');
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

  const bookAvailability = async (availability) => {
    try {
      const bookingData = {
        tutorID: availability.tutorUserID, 
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime,
        date,
        subjectID: subjectId,
        sessionLength
      };
      await api.post('/api/sessions/book-from-availability', bookingData);
      setMsg('✅ Booked!');
      await searchAvailability();
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to book from availability');
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
        <button className="btn" onClick={search}>Search Timeslots</button>
        <button className="btn" onClick={searchAvailability}>Show Tutor Availability</button>
      </div>

      {msg && <p className="muted">{msg}</p>}
    </div>

    <div className="card">
      <ul className="list">
        {slots.map((s, idx) => (
          <li key={s.timeslotID ? `${s.scheduleID}-${s.timeslotID}` : idx} className="item">
            {s.dayOfWeek ? (
              <div>
                <div className="font-medium">
                  {s.tutorFirstName} {s.tutorLastName}
                </div>
                <div className="muted">
                  {s.dayOfWeek} — {s.startTime} to {s.endTime}
                </div>
                <div>
                  <select value={sessionLength} onChange={e => setSessionLength(Number(e.target.value))}>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                  <button className="btn success" onClick={() => bookAvailability(s)}>Book</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">{s.subjectName}</div>
                <div className="muted">{s.tutorFirstName} {s.tutorLastName} — {s.scheduleDate}</div>
                <button className="btn success" onClick={() => book(s)}>Book</button>
              </div>
            )}
          </li>
        ))}

        {!slots.length && <li className="muted">No results yet.</li>}
      </ul>
    </div>
  </div>
);
}
