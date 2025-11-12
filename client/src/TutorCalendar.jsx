import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

function LegendChip({ colorClass, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        className={`legend-dot ${colorClass}`}
        style={{ width: 12, height: 12, borderRadius: 9999, display: 'inline-block' }}
      />
      <span style={{ fontSize: 13 }}>{label}</span>
    </span>
  );
}

export default function TutorCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const token = useMemo(() => localStorage.getItem('token'), []);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('http://localhost:8000/api/tutor/calendar', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvents(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function handleEventClick(info) {
    const e = info.event;
    const ext = e.extendedProps || {};
    alert(
      [
        `Subject: ${ext.subject || e.title}`,
        ext.studentName ? `Student: ${ext.studentName}` : null,
        ext.status ? `Status: ${ext.status}` : null,
        `Start: ${e.start?.toLocaleString()}`,
        `End: ${e.end?.toLocaleString()}`,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  function eventClassNames(arg) {
    void tick;
    const status = (arg.event.extendedProps?.status || '').toLowerCase();
    const now = new Date();
    const s = arg.event.start, e = arg.event.end;
    const isOngoing = s && e && now >= s && now < e && status !== 'cancelled';

    const classes = [];
    if (status === 'cancelled') classes.push('ev-cancelled');
    else if (status === 'completed') classes.push('ev-completed');
    else if (status === 'no_show') classes.push('ev-no-show');

    if (!status && s && e && now < s) classes.push('ev-upcoming');
    if (isOngoing) classes.push('ev-ongoing');
    return classes;
  }

  return (
    <div className="page-wrap" style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>My Calendar</h2>

      <div className="legend" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <LegendChip colorClass="ev-ongoing" label="Ongoing" />
        <LegendChip colorClass="ev-completed" label="Completed" />
        <LegendChip colorClass="ev-cancelled" label="Cancelled" />
        <LegendChip colorClass="ev-no-show" label="No show" />
        <LegendChip colorClass="ev-upcoming" label="Upcoming" />
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          initialView="timeGridWeek"
          timeZone="local"             // 👈 đảm bảo hiển thị theo giờ địa phương
          events={events}
          eventClick={handleEventClick}
          height="auto"
          nowIndicator
          eventClassNames={eventClassNames}
        />
      )}
    </div>
  );
}
