import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Dashboard() {
  const role = (localStorage.getItem('role') || '').trim();
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (role === 'Admin') {
      api
        .get('/api/analytics/overview')
        .then((res) => setKpis(res.data))
        .catch(() => setErr('Failed to load analytics'));
    }
  }, [role]);

  const Card = ({ title, children }) => (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        background: 'rgba(255,255,255,0.78)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.07)',
      }}
    >
      {title && <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>}
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 20 }}>
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 280px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .dash-grid { grid-template-columns: 1fr; }
        }
        .cal-wrap {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.78);
          box-shadow: 0 8px 22px rgba(0,0,0,0.07);
        }
        .cal-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .empty-state {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #334155;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          margin: 6px 0 8px;
        }
        .hours-card {
          position: sticky;
          top: 12px;
          align-self: start;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: #ffffffcc;
          box-shadow: 0 8px 22px rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .hours-head {
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 14px;
        }
        .hours-list {
          list-style: none;
          padding: 10px;
          margin: 0;
          display: grid;
          gap: 8px;
        }
        .hours-item {
          display: flex;
          justify-content: space-between;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          background: #fff;
        }
        .hours-foot {
          padding: 8px 10px;
          font-size: 11px;
          color: #6b7280;
        }
        .ev-calculus .fc-event-main { background:#2563eb; color:#fff; }
        .ev-physics  .fc-event-main { background:#16a34a; color:#fff; }
        .ev-stats    .fc-event-main { background:#f59e0b; color:#1f2937; }
        .ev-chem     .fc-event-main { background:#ef4444; color:#fff; }
      `}</style>

      <div
        style={{
          padding: '8px 12px',
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        <strong>Dashboard</strong> • role: <code>{role || '(none)'}</code>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 14px' }}>Dashboard</h2>

      {role === 'Student' && <StudentCalendarAndHours />}

      {role === 'Tutor' && (
        <>
          <Card title="Quick actions">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/sessions">
                <button style={btn}>Today’s sessions</button>
              </Link>
              <Link to="/availability">
                <button style={btnSecondary}>Manage availability</button>
              </Link>
            </div>
          </Card>
          <Card title="Notes">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Mark <em>Sign-in</em> / <em>Sign-out</em> from the Sessions page.
              </li>
              <li>Keep your qualifications up to date for better matches.</li>
            </ul>
          </Card>
        </>
      )}

      {role === 'Admin' && (
        <>
          <Card title="KPIs">
            {/* err from KPI fetch */}
            {err && <div style={{ color: '#dc2626' }}>{err}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
              <Stat label="Sessions" value={kpis?.totalSessions ?? '—'} />
              <Stat label="Students" value={kpis?.totalStudents ?? '—'} />
              <Stat label="Tutors" value={kpis?.totalTutors ?? '—'} />
              <Stat label="Avg rating" value={kpis?.avgRating ? Number(kpis.avgRating).toFixed(1) : '—'} />
            </div>
          </Card>

            <Card title="Admin actions">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/admin">
                <button style={btn}>Open Admin panel</button>
              </Link>
              <Link to="/sessions">
                <button style={btnSecondary}>All sessions</button>
              </Link>
            </div>
          </Card>
        </>
      )}

      {role !== 'Admin' && role !== 'Tutor' && role !== 'Student' && <StudentCalendarAndHours />}
    </div>
  );
}

function StudentCalendarAndHours() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errCal, setErrCal] = useState('');

  const [initialView, setInitialView] = useState('timeGridWeek');
  useEffect(() => {
    const m = window.matchMedia('(max-width: 980px)');
    const pickView = () => setInitialView(m.matches ? 'dayGridMonth' : 'timeGridWeek');
    pickView();
    m.addEventListener?.('change', pickView);
    return () => m.removeEventListener?.('change', pickView);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const calRes = await api.get('/api/student/calendar');
        if (!mounted) return;
        setEvents(calRes.data || []);
      } catch (e) {
        console.error('[Dashboard] calendar load error', e);
        if (!mounted) return;
        setErrCal('Failed to load calendar');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const hasEvents = (events || []).length > 0;

  const nextEvent = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter((e) => e.start && new Date(e.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  }, [events]);

  function downloadIcsForEvent(ev) {
    const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BugHouse//Student Calendar//EN
BEGIN:VEVENT
UID:${ev.id || Date.now() + '@bughouse'}
DTSTAMP:${dt(new Date())}
DTSTART:${dt(ev.start)}
${ev.end ? `DTEND:${dt(ev.end)}\n` : ''}SUMMARY:${(ev.title || 'Tutoring Session').replace(/\n/g, ' ')}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tutoring-session.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const subjectToClass = (subject) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('calculus')) return 'ev-calculus';
    if (s.includes('physics')) return 'ev-physics';
    if (s.includes('stat')) return 'ev-stats';
    if (s.includes('chem')) return 'ev-chem';
    return '';
  };

  return (
    <>
      {nextEvent && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, margin: '6px 0 14px', padding: '10px 12px',
          border: '1px solid #e5e7eb', borderRadius: 10, background: '#f8fafc'
        }}>
          <div style={{ fontSize: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 2 }}>Next session</div>
            <div>
              {new Date(nextEvent.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              {nextEvent.title ? ` • ${nextEvent.title}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={() => downloadIcsForEvent(nextEvent)}>Add to calendar (.ics)</button>
            <Link to="/sessions"><button style={btn}>View</button></Link>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="cal-wrap">
          <div className="cal-toolbar">
            <div style={{ fontWeight: 800 }}>My Calendar</div>
            <Link to="/book"><button style={btnSecondary}>Book a session</button></Link>
          </div>

          {errCal && <div style={{ color: '#dc2626', marginBottom: 8 }}>{errCal}</div>}

          {!loading && !hasEvents && (
            <div className="empty-state">
              No sessions booked yet. <Link to="/book"><strong>Book one now</strong></Link>.
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
            eventClassNames={(arg) => {
              const subj = arg.event.extendedProps?.subject || (arg.event.title || '').split(' with ')[0];
              const cls = subjectToClass(subj);
              return cls ? [cls] : [];
            }}
            eventClick={async (info) => {
              const id = info.event.id;
              const action = window.prompt('Type R to reschedule, C to cancel');
              if (!action) return;

              if (action.toLowerCase() === 'r') {
                const d = info.event.start?.toISOString();
                window.location.href = `/book?from=${encodeURIComponent(d || '')}`;
                return;
              }

              if (action.toLowerCase() === 'c') {
                if (!window.confirm('Are you sure you want to cancel this session?')) return;
                try {
                  await api.delete(`/api/sessions/${id}`);
                  info.event.remove();
                  alert('Session cancelled.');
                } catch (e) {
                  console.error(e);
                  alert('Could not cancel. Do you have permission, and is the session ID valid?');
                }
              }
            }}
            events={events}
            height="auto"
            nowIndicator
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
          />
        </div>

        <OfficeHoursBox />
      </div>
    </>
  );
}

function OfficeHoursBox() {
  const hours = useMemo(() => ([
    { day: 'Mon', open: '8:00 AM', close: '5:00 PM' },
    { day: 'Tue', open: '8:00 AM', close: '5:00 PM' },
    { day: 'Wed', open: '8:00 AM', close: '5:00 PM' },
    { day: 'Thu', open: '8:00 AM', close: '5:00 PM' },
    { day: 'Fri', open: '8:00 AM', close: '5:00 PM' },
    { day: 'Sat', open: '9:00 AM', close: '4:00 PM' },
    { day: 'Sun', open: '9:00 AM', close: '4:00 PM' },
  ]), []);

  return (
    <aside className="hours-card">
      <div className="hours-head">Tutor Office Hours</div>
      <ul className="hours-list">
        {hours.map(h => (
          <li key={h.day} className="hours-item">
            <span style={{ fontWeight: 800, width: 52 }}>{h.day}</span>
            <span>{h.open} – {h.close}</span>
          </li>
        ))}
      </ul>
      <div className="hours-foot">* Center hours. Booked sessions may vary if approved.</div>
    </aside>
  );
}

/* --- shared small components/styles --- */
const btn = {
  padding: '10px 14px',
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
};
const btnSecondary = { ...btn, background: '#2563eb' };

function Stat({ label, value }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 12,
      background: 'rgba(255,255,255,0.78)',
      boxShadow: '0 8px 22px rgba(0,0,0,0.07)'
    }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
