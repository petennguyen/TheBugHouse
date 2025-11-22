import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import { STATUS_COLORS, decorateStatus } from './statusUtils';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './calendar.css';

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
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        background: 'rgba(255,255,255,0.78)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

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

  useEffect(() => {
    const oldSessionId = localStorage.getItem('rescheduleOldSessionId');
    if (oldSessionId) {
      (async () => {
        try {
          await api.delete(`/api/sessions/${oldSessionId}`);
        } catch (e) {
          console.error('Failed to cancel old session', e);
        } finally {
          localStorage.removeItem('rescheduleOldSessionId');
        }
      })();
    }
  }, []);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 20 }}>
      <style>{`
        .fc-col-header-cell .fc-dow {
          display: block;
          font-weight: 700;
          font-size: 12px;
          line-height: 1.1;
        }
        .fc-col-header-cell .fc-date {
          display: block;
          font-size: 11px;
          color: #6b7280;
          line-height: 1.1;
        }
        .fc-col-header-cell {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
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
        <strong>Dashboard</strong> • role:{' '}
        <code>{role || '(none)'}</code>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 14px' }}>
        Dashboard
      </h2>

      {(role === 'Student' || role === 'Tutor') && (
        <StudentCalendarAndHours role={role} />
      )}

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
            {err && <div style={{ color: '#dc2626' }}>{err}</div>}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
                gap: 12,
              }}
            >
              <Stat label="Sessions" value={kpis?.totalSessions ?? '—'} />
              <Stat label="Students" value={kpis?.totalStudents ?? '—'} />
              <Stat label="Tutors" value={kpis?.totalTutors ?? '—'} />
              <Stat
                label="Avg rating"
                value={
                  kpis?.avgRating ? Number(kpis.avgRating).toFixed(1) : '—'
                }
              />
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

      {role !== 'Admin' && role !== 'Tutor' && role !== 'Student' && (
        <StudentCalendarAndHours />
      )}
    </div>
  );
}

function StatusLegend() {
  const items = [
    ['cancelled', 'Cancelled'],
    ['no_show', 'No show'],
    ['completed', 'Completed'],
    ['ongoing', 'Ongoing (now)'],
    ['upcoming', 'Upcoming'],
  ];

  return (
    <div className="bh-legend">
      {items.map(([key, label]) => (
        <span key={key} className="bh-legend-item">
          <i
            className="bh-dot"
            style={{ backgroundColor: STATUS_COLORS[key] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

function StudentCalendarAndHours({ role }) {
  const isTutor = role === 'Tutor';

  const eventDidMount = (info) => {
    const ext = info.event.extendedProps || {};
    const status = decorateStatus(info.event);
    const counterpart = isTutor ? ext.studentName : ext.tutorName;
    const subject = ext.subject || '';
    const start = info.event.start;
    const end = info.event.end;

    let timeLine = '';
    if (start && end) {
      const pad = (n) => String(n).padStart(2, '0');
      const sh = pad(start.getHours());
      const sm = pad(start.getMinutes());
      const eh = pad(end.getHours());
      const em = pad(end.getMinutes());
      timeLine = `${sh}:${sm}–${eh}:${em}`;
    }

    const lines = [
      subject || info.event.title || 'Tutoring session',
      counterpart
        ? isTutor
          ? `Student: ${counterpart}`
          : `Tutor: ${counterpart}`
        : '',
      timeLine ? `Time: ${timeLine}` : '',
      status ? `Status: ${status}` : '',
    ].filter(Boolean);

    info.el.setAttribute('title', lines.join('\n'));
  };

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errCal, setErrCal] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const navigate = useNavigate();

  const [initialView, setInitialView] = useState('timeGridWeek');
  useEffect(() => {
    const m = window.matchMedia('(max-width: 980px)');
    const pickView = () =>
      setInitialView(m.matches ? 'dayGridMonth' : 'timeGridWeek');
    pickView();
    m.addEventListener?.('change', pickView);
    return () => m.removeEventListener?.('change', pickView);
  }, []);

  const eventContent = (arg) => {
    const status = decorateStatus(arg.event);
    const color = STATUS_COLORS[status] || STATUS_COLORS.upcoming;
    const ext = arg.event.extendedProps || {};
    const subject = ext.subject || arg.event.title || 'Tutoring session';

    const words = subject.split(' ');
    let subjectShort = subject;
    if (words.length > 2) {
      subjectShort = `${words[0]} ${words[1]}...`;
    } else if (subject.length > 15) {
      subjectShort = subject.slice(0, 12) + '...';
    }

    const start = arg.event.start;
    const end = arg.event.end;
    let timeLine = '';
    if (start && end) {
      const pad = (n) => String(n).padStart(2, '0');
      const sh = pad(start.getHours());
      const sm = pad(start.getMinutes());
      const eh = pad(end.getHours());
      const em = pad(end.getMinutes());
      timeLine = `${sh}:${sm}–${eh}:${em}`;
    } else if (arg.timeText) {
      timeLine = arg.timeText;
    }

    const statusLabel = status.toUpperCase().replace('_', ' ');

    return (
      <div className="bh-event bh-event-3line">
        <div className="bh-event-bar" style={{ backgroundColor: color }} />
        <div className="bh-event-body">
          <div className="bh-event-time">{timeLine}</div>
          <div className="bh-event-title">{subjectShort}</div>
          <div className="bh-event-status">{statusLabel}</div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const endpoint =
          role === 'Tutor' ? '/api/tutor/calendar' : '/api/student/calendar';

        const calRes = await api.get(endpoint);
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
    return () => {
      mounted = false;
    };
  }, [role]);

  const hasEvents = (events || []).length > 0;

  const nextEvent = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter((e) => e.start && new Date(e.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  }, [events]);

  function downloadIcsForEvent(ev) {
    const dt = (d) =>
      new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BugHouse//Student Calendar//EN
BEGIN:VEVENT
UID:${ev.id || Date.now() + '@bughouse'}
DTSTAMP:${dt(new Date())}
DTSTART:${dt(ev.start)}
${ev.end ? `DTEND:${dt(ev.end)}\n` : ''}SUMMARY:${(ev.title || 'Tutoring Session').replace(
      /\n/g,
      ' ',
    )}
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

  const dayHeaderContent = (arg) => {
    const dow = arg.date.toLocaleDateString('en-US', { weekday: 'short' });
    const md = arg.date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    });

    return (
      <div>
        <div className="fc-dow">{dow}</div>
        <div className="fc-date">{md}</div>
      </div>
    );
  };

  return (
    <>
      {nextEvent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            margin: '6px 0 14px',
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 2 }}>
              Next session
            </div>
            <div>
              {new Date(nextEvent.start).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {nextEvent.title ? ` • ${nextEvent.title}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={btnSecondary}
              onClick={() => downloadIcsForEvent(nextEvent)}
            >
              Add to calendar (.ics)
            </button>
            <Link to="/sessions">
              <button style={btn}>View</button>
            </Link>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="cal-wrap bh-calendar-wrap">
          <div className="cal-toolbar">
            <div style={{ fontWeight: 800 }}>My Calendar</div>
            <Link to="/book">
              <button style={btnSecondary}>Book a session</button>
            </Link>
          </div>

          {errCal && (
            <div style={{ color: '#dc2626', marginBottom: 8 }}>{errCal}</div>
          )}

          {!loading && !hasEvents && (
            <div className="empty-state">
              {isTutor ? (
                <>
                  No upcoming sessions yet. Check your{' '}
                  <Link to="/sessions">
                    <strong>sessions list</strong>
                  </Link>{' '}
                  or update your availability.
                </>
              ) : (
                <>
                  No sessions booked yet.{' '}
                  <Link to="/book">
                    <strong>Book one now</strong>
                  </Link>
                  .
                </>
              )}
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
            }}
            dayHeaderContent={dayHeaderContent}
            eventClassNames={(arg) => {
              const subj =
                arg.event.extendedProps?.subject ||
                (arg.event.title || '').split(' with ')[0];
              const cls = subjectToClass(subj);
              return cls ? [cls] : [];
            }}
            eventClick={(info) => {
              setSelectedEvent(info.event);
              setShowActionModal(true);
            }}
            events={events}
            height="auto"
            nowIndicator
            businessHours={[
              {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: '10:00',
                endTime: '18:00',
              },
            ]}
            slotMinTime="10:00:00"
            slotMaxTime="18:00:00"
            slotDuration="00:30:00"
            eventContent={eventContent}
            eventDidMount={eventDidMount}
          />

          <StatusLegend />
        </div>

        <OfficeHoursBox />
      </div>

      {showActionModal && selectedEvent && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
              maxWidth: 480,
              boxShadow: '0 8px 22px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ marginBottom: 16, fontWeight: 700 }}>
              What would you like to do with this session?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn danger"
                style={btn}
                onClick={() => {
                  setShowActionModal(false);
                  navigate('/book');
                }}
              >
                Reschedule
              </button>
              <button
                className="btn danger"
                style={btnSecondary}
                onClick={() => {
                  setShowActionModal(false);
                  setShowCancelConfirm(true);
                }}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ ...btn, background: '#e5e7eb', color: '#111827' }}
                onClick={() => setShowActionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {showCancelConfirm && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 10000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10001,
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
              maxWidth: 480,
              boxShadow: '0 8px 22px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ marginBottom: 16, fontWeight: 700 }}>
              Are you sure you want to cancel this session?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn danger"
                style={btn}
                onClick={async () => {
                  try {
                    await api.delete(`/api/sessions/${selectedEvent.id}`);
                    selectedEvent.remove();
                    setShowCancelConfirm(false);
                    setShowActionModal(false);
                  } catch (e) {
                    alert(
                      'Could not cancel. Do you have permission, and is the session ID valid?',
                    );
                  }
                }}
              >
                Yes, Cancel
              </button>
              <button
                className="btn"
                style={{ ...btn, background: '#e5e7eb', color: '#111827' }}
                onClick={() => setShowCancelConfirm(false)}
              >
                No, Go Back
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function OfficeHoursBox() {
  return (
    <aside className="hours-card">
      <div className="hours-head">
        <div style={{ fontWeight: 800, fontSize: 14 }}>Tutor Office Hours</div>
        <div
          style={{
            fontSize: 12,
            color: '#4b5563',
            marginTop: 2,
          }}
        >
          Engineering Research Building — <strong>ERB 570</strong>
        </div>
      </div>

      <div
        style={{
          padding: '6px 10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#374151',
        }}
      >
        <span style={{ fontSize: 14 }}>📍</span>
        <span>On-campus tutoring center (ERB 570)</span>
      </div>

      <ul className="hours-list">
        <li
          className="hours-item"
          style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontWeight: 800, width: 100 }}>Monday</span>
          <span>10:00 AM – 6:00 PM</span>
        </li>
        <li
          className="hours-item"
          style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontWeight: 800, width: 100 }}>Tuesday</span>
          <span>10:00 AM – 6:00 PM</span>
        </li>
        <li
          className="hours-item"
          style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontWeight: 800, width: 100 }}>Wednesday</span>
          <span>10:00 AM – 6:00 PM</span>
        </li>
        <li
          className="hours-item"
          style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontWeight: 800, width: 100 }}>Thursday</span>
          <span>10:00 AM – 6:00 PM</span>
        </li>
        <li
          className="hours-item"
          style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}
        >
          <span style={{ fontWeight: 800, width: 100 }}>Friday</span>
          <span>10:00 AM – 6:00 PM</span>
        </li>
        <li className="hours-item" style={{ background: '#f9fafb' }}>
          <span style={{ fontWeight: 800, width: 100 }}>Saturday</span>
          <span>Closed</span>
        </li>
        <li className="hours-item" style={{ background: '#f9fafb' }}>
          <span style={{ fontWeight: 800, width: 100 }}>Sunday</span>
          <span>Closed</span>
        </li>
      </ul>

      <div className="hours-foot">
        * Center hours. Booked sessions may vary if approved.
      </div>
    </aside>
  );
}
