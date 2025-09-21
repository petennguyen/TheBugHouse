import React, { useEffect, useState } from 'react';
import api from './api';

//const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function TutorAvailability() {
  const [rows, setRows] = useState([]);
  const [day, setDay] = useState('Mon');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/availability/mine');
      setRows(data);
    } catch {
      setMsg('Failed to load availability');
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    try {
      await api.post('/api/availability', { dayOfWeek: day, startTime: start, endTime: end });
      setMsg('Added');
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to add');
    }
  };

  const removeRow = async (id) => {
    await api.delete(`/api/availability/${id}`);
    load();
  };

  return (
  <div className="grid gap-3">
    <div className="card">
      <h2 className="h2">My Availability</h2>
      {msg && <p className="muted">{msg}</p>}

      <div className="form-row three">
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </div>

    <div className="card">
      <ul className="list">
        {rows.map((r) => (
          <li key={r.availabilityID} className="item">
            <div>{r.dayOfWeek} — {r.startTime} to {r.endTime}</div>
            <button className="btn danger" onClick={() => removeRow(r.availabilityID)}>Delete</button>
          </li>
        ))}
        {!rows.length && <li className="muted">No availability yet.</li>}
      </ul>
    </div>
  </div>
);
}
