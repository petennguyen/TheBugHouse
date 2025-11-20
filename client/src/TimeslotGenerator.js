import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

function TimeslotGenerator() {
  const [scheduleID, setScheduleID] = useState('');
  const [subjectID, setSubjectID] = useState('');
  const [tutorUserID, setTutorUserID] = useState('');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('18:00');
  const [dur, setDur] = useState(60);
  const [subjects, setSubjects] = useState([]);
  const [tutorsList, setTutors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [msg, setMsg] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const navigate = useNavigate();

  const load = async () => {
    try {
      const s = await api.get('/api/subjects');
      setSubjects(s.data);
      const at = await api.get('/api/admin/availableTutors');
      setTutors(at.data);
      const sch = await api.get('/api/admin/schedules');
      setSchedules(sch.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isWeekend = (isoDate) => {
    const d = new Date(isoDate);
    const dow = d.getDay(); 
    return dow === 0 || dow === 6;
  };

  const createSchedule = async () => {
    if (isWeekend(date)) {
      setMsg('Center is closed on Saturday and Sunday. Please pick a weekday (Mon–Fri).');
      return;
    }

    try {
      const { data } = await api.post('/api/schedules/generate', { date });
      setScheduleID(data.scheduleID);
      setMsg(`Schedule created: ${data.scheduleID}`);
      await load();
    } catch (error) {
      setMsg(error?.response?.data?.error || 'Error creating schedule');
    }
  };

  const genTimeslots = async () => {
    if (!scheduleID || !subjectID || !tutorUserID) {
      setMsg('Fill scheduleID, subjectID, tutorUserID');
      return;
    }

    if (start < '10:00' || end > '18:00') {
      setMsg('Timeslots must be within center hours: 10:00–18:00 (Mon–Fri).');
      return;
    }
    if (start >= end) {
      setMsg('Start time must be before end time.');
      return;
    }

    try {
      const { data } = await api.post('/api/timeslots/generate', {
        scheduleID: Number(scheduleID),
        subjectID: Number(subjectID),
        tutorUserID: Number(tutorUserID),
        start,
        end,
        durationMinutes: Number(dur),
      });
      setMsg(data.message);
      await load();
    } catch (error) {
      setMsg(error?.response?.data?.error || 'Error generating timeslots');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Timeslot Generator</h2>
      <button
        className="px-3 py-2 bg-gray-500 text-white rounded mb-4"
        onClick={() => navigate('/admin')}
      >
        Back to Admin Dashboard
      </button>

      <div className="card">
        <h3 className="font-medium">Schedules</h3>
        {/* Create new schedule */}
        <div className="flex gap-2 items-center">
          <input
            className="border p-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-black text-white rounded"
            onClick={createSchedule}
          >
            Create Schedule
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Center hours: Mon–Fri 10:00–18:00 • Saturday & Sunday closed
        </div>

        {/* Select existing schedule */}
        <div className="mt-3">
          <select
            className="border p-2"
            value={scheduleID}
            onChange={(e) => setScheduleID(e.target.value)}
          >
            <option value="">Select existing schedule…</option>
            {schedules.map((s) => (
              <option key={s.scheduleID} value={s.scheduleID}>
                {new Date(s.scheduleDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                (ID {s.scheduleID})
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

      {scheduleID && (
        <div className="card">
          <h3 className="font-medium">Existing Timeslots</h3>
          {(() => {
            const active = schedules.find(
              (s) => String(s.scheduleID) === String(scheduleID)
            );
            if (!active) return <p className="text-gray-500">No timeslots found</p>;
            if (!active.timeslots?.length)
              return <p className="text-gray-500">No timeslots yet</p>;

            return (
              <ul className="space-y-1">
                {active.timeslots.map((t) => (
                  <li key={t.timeslotID} className="border p-2 rounded">
                    <div>
                      <strong>{t.subjectName}</strong> — Tutor: {t.tutorName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.timeslotStartTime} – {t.timeslotEndTime}
                    </div>
                    {t.sessions?.length > 0 && (
                      <ul className="ml-4 list-disc text-sm">
                        {t.sessions.map((sess) => (
                          <li key={sess.sessionID}>
                            Student: {sess.studentFirstName} {sess.studentLastName} | Rating:{' '}
                            {sess.sessionRating ?? 'N/A'}
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

      <div className="card">
        <h3 className="font-medium">Generate Timeslots</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <select
            className="border p-2"
            value={scheduleID}
            onChange={(e) => setScheduleID(e.target.value)}
          >
            <option value="">Select Schedule...</option>
            {schedules.map((s) => (
              <option key={s.scheduleID} value={s.scheduleID}>
                {new Date(s.scheduleDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                (ID {s.scheduleID})
              </option>
            ))}
          </select>
          <select
            className="border p-2"
            value={subjectID}
            onChange={(e) => setSubjectID(e.target.value)}
          >
            <option value="">Subject...</option>
            {subjects.map((s) => (
              <option key={s.subjectID} value={s.subjectID}>
                {s.subjectName}
              </option>
            ))}
          </select>
          <select
            className="border p-2"
            value={tutorUserID}
            onChange={(e) => setTutorUserID(e.target.value)}
          >
            <option value="">Select Tutor...</option>
            {tutorsList.map((tutor) => (
              <option key={tutor.userID} value={tutor.userID}>
                {tutor.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className="border p-2"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <input
              className="border p-2"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <input
              className="border p-2 w-24"
              type="number"
              value={dur}
              onChange={(e) => setDur(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Timeslots must be within Mon–Fri 10:00–18:00.
        </div>
        <button
          className="px-3 py-2 bg-black text-white rounded mt-2"
          onClick={genTimeslots}
        >
          Generate
        </button>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>
    </div>
  );
}

export default TimeslotGenerator;
