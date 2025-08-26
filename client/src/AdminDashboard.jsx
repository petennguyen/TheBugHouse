import React, { useEffect, useState } from 'react';
import api from './api';

export default function AdminDashboard() {
  const [kpis, setKpis] = useState({});
  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [scheduleID, setScheduleID] = useState('');
  const [subjectID, setSubjectID] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [tutorUserID, setTutorUserID] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [dur, setDur] = useState(60);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/analytics/overview');
      setKpis(data);
      const s = await api.get('/api/subjects');
      setSubjects(s.data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const addSubject = async () => {
    if (!subjectName) return;
    await api.post('/api/subjects', { subjectName });
    setSubjectName('');
    load();
  };

  const createSchedule = async () => {
    const { data } = await api.post('/api/schedules/generate', { date });
    setScheduleID(data.scheduleID);
    setMsg(`Schedule created: ${data.scheduleID}`);
  };

  const genTimeslots = async () => {
    if (!scheduleID || !subjectID || !tutorUserID) { setMsg('Fill scheduleID, subjectID, tutorUserID'); return; }
    const { data } = await api.post('/api/timeslots/generate', {
      scheduleID: Number(scheduleID), subjectID: Number(subjectID),
      tutorUserID: Number(tutorUserID), start, end, durationMinutes: Number(dur)
    });
    setMsg(data.message);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card"><div className="text-xs text-gray-500">Sessions</div><div className="text-2xl">{kpis.totalSessions ?? '-'}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Students</div><div className="text-2xl">{kpis.totalStudents ?? '-'}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Tutors</div><div className="text-2xl">{kpis.totalTutors ?? '-'}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Avg Rating</div><div className="text-2xl">{kpis.avgRating ? Number(kpis.avgRating).toFixed(1) : '-'}</div></div>
      </div>

      <div className="card">
        <h3 className="font-medium">Add Subject</h3>
        <div className="flex gap-2">
          <input className="border p-2" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="Subject name" />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={addSubject}>Save</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium">Create Daily Schedule</h3>
        <div className="flex gap-2 items-center">
          <input className="border p-2" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={createSchedule}>Create</button>
          <div>scheduleID: <code>{scheduleID || '-'}</code></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium">Generate Timeslots</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="border p-2" placeholder="scheduleID" value={scheduleID} onChange={e => setScheduleID(e.target.value)} />
          <select className="border p-2" value={subjectID} onChange={e => setSubjectID(e.target.value)}>
            <option value="">Subject…</option>
            {subjects.map(s => <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>)}
          </select>
          <input className="border p-2" placeholder="tutorUserID" value={tutorUserID} onChange={e => setTutorUserID(e.target.value)} />
          <div className="flex gap-2">
            <input className="border p-2" type="time" value={start} onChange={e => setStart(e.target.value)} />
            <input className="border p-2" type="time" value={end} onChange={e => setEnd(e.target.value)} />
            <input className="border p-2 w-24" type="number" value={dur} onChange={e => setDur(e.target.value)} />
          </div>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={genTimeslots}>Generate</button>
      </div>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
