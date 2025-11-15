import React, { useEffect, useState } from 'react';
import api from './api';

function todayLocalYYYYMMDD() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export default function StudentBook() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => todayLocalYYYYMMDD());
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedSlot, setSelectedSlot] = useState({}); // key: idx, value: slot.start

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
      // Use the date string to construct a Date object in local time
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const wday = localDate.toLocaleString('en-US', { weekday: 'short' }); 
      const { data } = await api.get('/api/tutor/availability', { params: { dayOfWeek: wday } });
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

  const bookAvailability = async (availability, slotStartTime) => {
    try {
      const bookingData = {
        tutorID: availability.tutorUserID,
        dayOfWeek: availability.dayOfWeek,
        startTime: slotStartTime,
        date,
        subjectID: subjectId,
        sessionLength: 60 // always 1 hour
      };
      await api.post('/api/sessions/book-from-availability', bookingData);
      setMsg('✅ Booked!');
      await searchAvailability();
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to book from availability');
    }
  };

  // Helper to generate 1-hour slots from startTime to endTime
  function getOneHourSlots(startTime, endTime) {
    const slots = [];
    let [sh, sm] = startTime.split(':').map(Number);
    let [eh, em] = endTime.split(':').map(Number);
    let start = sh * 60 + sm;
    const end = eh * 60 + em;
    while (start + 60 <= end) {
      const h1 = String(Math.floor(start / 60)).padStart(2, '0');
      const m1 = String(start % 60).padStart(2, '0');
      const h2 = String(Math.floor((start + 60) / 60)).padStart(2, '0');
      const m2 = String((start + 60) % 60).padStart(2, '0');
      slots.push({ start: `${h1}:${m1}`, end: `${h2}:${m2}` });
      start += 60;
    }
    return slots;
  }

  return (
    <div className="grid gap-3">
      <div className="card">
        <h2 className="h2">Book a Session</h2>

        <div className="form-row two" style={{ gap: 8 }}>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select subject...</option>
            {subjects.map((s) => (
              <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>
            ))}
          </select>

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button
            className="btn"
            style={{ minWidth: 180 }} // adjust as needed for desired length
            onClick={searchAvailability}
          >
            Show Tutor Availability
          </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                    {/* Dropdown for one-hour slots */}
                    <select
                      value={selectedSlot[idx] || ''}
                      onChange={e =>
                        setSelectedSlot(prev => ({ ...prev, [idx]: e.target.value }))
                      }
                    >
                      <option value="">Select time...</option>
                      {getOneHourSlots(s.startTime, s.endTime).map(slot => (
                        <option key={slot.start} value={slot.start}>
                          {slot.start} - {slot.end}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn success"
                      disabled={!selectedSlot[idx]}
                      onClick={() => bookAvailability(s, selectedSlot[idx])}
                    >
                      Book
                    </button>
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
