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

  // New state variables for feedback analytics
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [allFeedback, setAllFeedback] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

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

  // New functions for feedback analytics
  const loadFeedbackAnalytics = async () => {
    try {
      const { data } = await api.get('/api/admin/feedback-analytics');
      setFeedbackAnalytics(data);
    } catch (error) {
      console.error('Failed to load feedback analytics:', error);
    }
  };

  const loadAllFeedback = async () => {
    try {
      const { data } = await api.get('/api/admin/feedback');
      setAllFeedback(data);
      setShowFeedback(true);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  useEffect(() => {
    load();
    loadFeedbackAnalytics(); // Load feedback analytics on mount
  }, []);

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

    {/* Feedback Analytics Section */}
    {feedbackAnalytics && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="h2">📊 Feedback Analytics</h2>
          <button className="btn primary" onClick={loadAllFeedback}>
            View All Feedback
          </button>
        </div>

        <div className="grid cols-3" style={{ gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>
              {feedbackAnalytics.avgRating ? feedbackAnalytics.avgRating.toFixed(1) : 'N/A'}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Average Rating</div>
          </div>
          
          <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb' }}>
              {feedbackAnalytics.totalFeedback}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Total Reviews</div>
          </div>
          
          <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>
              {feedbackAnalytics.ratingDistribution.length > 0 ? 
                feedbackAnalytics.ratingDistribution.reduce((max, curr) => 
                  curr.count > max.count ? curr : max
                ).sessionRating : 'N/A'}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Most Common Rating</div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Rating Distribution</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', height: 100 }}>
            {[1, 2, 3, 4, 5].map(rating => {
              const found = feedbackAnalytics.ratingDistribution.find(r => r.sessionRating === rating);
              const count = found ? found.count : 0;
              const maxCount = Math.max(...feedbackAnalytics.ratingDistribution.map(r => r.count), 1);
              const height = (count / maxCount) * 80;
              
              return (
                <div key={rating} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    height: `${height}px`,
                    background: '#2563eb',
                    marginBottom: 4,
                    borderRadius: '4px 4px 0 0',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {count > 0 && count}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {rating}⭐
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Feedback */}
        {feedbackAnalytics.recentFeedback.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Recent Feedback</h3>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {feedbackAnalytics.recentFeedback.slice(0, 3).map((fb, index) => (
                <div key={index} style={{ 
                  padding: 12, 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 6, 
                  marginBottom: 8,
                  background: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>
                      {fb.studentFirstName} {fb.studentLastName}
                    </span>
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>
                      {fb.sessionRating}⭐
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    {fb.subjectName} with {fb.tutorFirstName} {fb.tutorLastName}
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic' }}>
                    "{fb.sessionFeedback}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

    {/* All Feedback Modal */}
    {showFeedback && (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{
          background: '#fff', padding: 24, borderRadius: 12, maxWidth: '80vw', 
          maxHeight: '80vh', overflowY: 'auto', width: 800
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>All Session Feedback</h2>
            <button onClick={() => setShowFeedback(false)} style={{ 
              background: '#e5e7eb', border: 'none', borderRadius: 4, padding: '8px 12px' 
            }}>
              Close
            </button>
          </div>
          
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {allFeedback.map((fb) => (
              <div key={fb.sessionID} style={{ 
                padding: 16, 
                border: '1px solid #e5e7eb', 
                borderRadius: 8, 
                marginBottom: 12 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <strong>{fb.studentFirstName} {fb.studentLastName}</strong>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      {fb.subjectName} with {fb.tutorFirstName} {fb.tutorLastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {new Date(fb.scheduleDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>
                      {fb.sessionRating}⭐
                    </div>
                  </div>
                </div>
                {fb.sessionFeedback && (
                  <div style={{ 
                    fontSize: 14, 
                    fontStyle: 'italic', 
                    padding: 8, 
                    background: '#f9fafb', 
                    borderRadius: 4,
                    borderLeft: '3px solid #2563eb'
                  }}>
                    "{fb.sessionFeedback}"
                  </div>
                )}
              </div>
            ))}
            {allFeedback.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                No feedback available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {msg && <p className="text-sm text-gray-700">{msg}</p>}
  </div>
  );
}