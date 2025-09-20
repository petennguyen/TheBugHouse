import React, { useEffect, useState } from 'react';
import api from './api';

function InviteTutorCard() 
{
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "",password: "" });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/admin/inviteTutor", form);
      setMsg(res.data.message);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error inviting tutor");
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-medium">Invite Tutor</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
        />
        <input
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Invite Tutor
        </button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
export default function AdminDashboard() {
  const [kpis, setKpis] = useState({});
  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [scheduleID, setScheduleID] = useState('');
  const [subjectID, setSubjectID] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [tutorUserID, setTutorUserID] = useState('');
  const [tutorsList, setTutors] = useState([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [dur, setDur] = useState(60);
  const [schedules, setSchedules] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/analytics/overview');
      setKpis(data);
      const s = await api.get('/api/subjects');
      setSubjects(s.data);
      const at = await api.get('/api/admin/availableTutors');
      setTutors(at.data);
      const sch = await api.get('/api/admin/schedules'); 
      setSchedules(sch.data);
      
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

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/70 p-6 rounded-2xl shadow-lg">
      <div className="card">
        <div className="text-xs text-gray-500">Sessions</div>
        <div className="text-2xl">{kpis.totalSessions ?? '-'}</div>
      </div>
      <div className="card">
        <div className="text-xs text-gray-500">Students</div>
        <div className="text-2xl">{kpis.totalStudents ?? '-'}</div>
      </div>
      <div className="card">
        <div className="text-xs text-gray-500">Tutors</div>
        <div className="text-2xl">{kpis.totalTutors ?? '-'}</div>
      </div>
      <div className="card">
        <div className="text-xs text-gray-500">Avg Rating</div>
        <div className="text-2xl">
          {kpis.avgRating ? Number(kpis.avgRating).toFixed(1) : '-'}
        </div>
      </div>
    </div>

      {/* Tutor Invite */}
      <InviteTutorCard />

    <div className="card">
      <h3 className="font-medium">Add Subject</h3>
      <div className="flex gap-2">
        <input
          className="border p-2"
          value={subjectName}
          onChange={e => setSubjectName(e.target.value)}
          placeholder="Subject name"
        />
        <button
          className="px-3 py-2 bg-black text-white rounded"
          onClick={addSubject}
        >
          Save
        </button>
      </div>
    </div>

    <div className="card">
      <h3 className="font-medium">Schedules</h3>

      {/* Create new schedule */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button
          className="px-3 py-2 bg-black text-white rounded"
          onClick={createSchedule}
        >
          Create Schedule
        </button>
      </div>

      {/* Edit existing schedule */}
      <div className="mt-3">
        <select
          className="border p-2"
          value={scheduleID}
          onChange={e => setScheduleID(e.target.value)}
        >
          <option value="">Select existing schedule…</option>
          {schedules.map(s => (
            <option key={s.scheduleID} value={s.scheduleID}>
              {s.date} (ID {s.scheduleID})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <span className="text-gray-600">
          Active schedule: <code>{scheduleID || '-'}</code>
        </span>
      </div>
    </div>

    {/* Show all existing timeslots for selected schedule */}
     {scheduleID && (
      <div className="card">
        <h3 className="font-medium">Existing Timeslots</h3>
        {(() => {
          const active = schedules.find(s => String(s.scheduleID) === String(scheduleID));
          if (!active) return <p className="text-gray-500">No timeslots found</p>;
          if (!active.timeslots?.length) return <p className="text-gray-500">No timeslots yet</p>;

          return (
            <ul className="space-y-1">
              {active.timeslots.map(t => (
                <li key={t.timeslotID} className="border p-2 rounded">
                  <div>
                    <strong>{t.subjectName}</strong> — Tutor: {t.tutorName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.timeslotStartTime} – {t.timeslotEndTime}
                  </div>
                  {t.sessions?.length > 0 && (
                    <ul className="ml-4 list-disc text-sm">
                      {t.sessions.map(sess => (
                        <li key={sess.sessionID}>
                          Student: {sess.studentFirstName} {sess.studentLastName} | Rating: {sess.sessionRating ?? 'N/A'}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          );
        })()}
      </div>
    )}    
     
    {/* Show Timeslot generator only if scheduleID is set */}
    {scheduleID && (
      <div className="card">
        <h3 className="font-medium">Generate Timeslots</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="border p-2" placeholder="scheduleID" value={scheduleID} onChange={e => setScheduleID(e.target.value)} />
          <select className="border p-2" value={subjectID} onChange={e => setSubjectID(e.target.value)}>
            <option value="">Subject…</option>
            {subjects.map(s => <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>)}
          </select>
          <select className="border p-2" value={tutorUserID} onChange={e => setTutorUserID(e.target.value)} > 
            <option value="">Select Tutor...</option> {tutorsList.map(tutor => ( <option key={tutor.userID} value={tutor.userID}> {tutor.name} </option>))} 
          </select>
          <div className="flex gap-2">
            <input className="border p-2" type="time" value={start} onChange={e => setStart(e.target.value)} />
            <input className="border p-2" type="time" value={end} onChange={e => setEnd(e.target.value)} />
            <input className="border p-2 w-24" type="number" value={dur} onChange={e => setDur(e.target.value)} />
          </div>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={genTimeslots}>Generate</button>
      </div>
    )}

    {msg && <p className="text-sm text-gray-700">{msg}</p>}
  </div>
  );
}