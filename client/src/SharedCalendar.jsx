import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { STATUS_COLORS, decorateStatus } from './statusUtils';
import './calendar.css';

function stripZ(dt) {
  return typeof dt === 'string' ? dt.replace(/Z$/, '') : dt;
}

export default function SharedCalendar({ fetchUrl, roleLabel = '' }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`http://localhost:8000${fetchUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data : [];
        const normalized = raw.map((ev) => ({
          ...ev,
          start: stripZ(ev.start),
          end: stripZ(ev.end),
        }));
        setEvents(normalized);
      })
      .catch((err) => {
        console.error('calendar fetch error', err);
        setEvents([]);
      });
  }, [fetchUrl]);

  const eventContent = (arg) => {
    const status = decorateStatus(arg.event);
    const color = STATUS_COLORS[status] || STATUS_COLORS.upcoming;
    const timeText = arg.timeText ? `${arg.timeText} ` : '';
    const title = arg.event.title || '(Untitled)';
    const chip = status.toUpperCase().replace('_', ' ');

    return (
      <div className="bh-event" title={`${title} — ${chip}`}>
        <div className="bh-event-bar" style={{ backgroundColor: color }} />
        <div className="bh-event-body">
          <div className="bh-event-time">{timeText}</div>
          <div className="bh-event-title">{title}</div>
          <span className="bh-event-chip" style={{ borderColor: color, color }}>
            {chip}
          </span>
        </div>
      </div>
    );
  };

  const eventDidMount = (info) => {
    const ext = info.event.extendedProps || {};
    const status = decorateStatus(info.event);
    const title = info.event.title || '';
    const counterpart =
      roleLabel === 'Tutor' ? ext.tutorName :
      roleLabel === 'Student' ? ext.studentName : '';
    info.el.setAttribute(
      'title',
      `${title}\nStatus: ${status}${counterpart ? `\nWith: ${counterpart}` : ''}`
    );
  };

  const toolbar = useMemo(
    () => ({
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    }),
    []
  );
  const buttonText = useMemo(() => ({
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
  }), []);
  return (
    <div className="bh-calendar-wrap">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={toolbar}
        height="auto"
        expandRows
        dayMaxEventRows={3}
        nowIndicator
        slotMinTime="10:00:00"
        slotMaxTime="18:00:00"
        stickyHeaderDates

        businessHours={[
          {
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '10:00',
            endTime: '18:00',
          },
        ]}

        events={events}
        eventContent={eventContent}
        eventDidMount={eventDidMount}
        selectable={false}
        editable={false}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        buttonText={buttonText}
      />
      <Legend />
    </div>
  );
}

function Legend() {
  const items = [
    ['cancelled', 'Cancelled'],
    ['no_show', 'No show'],
    ['completed', 'Completed'],
    ['ongoing', 'Ongoing (now)'],
    ['upcoming', 'Upcoming'],
  ];
  return (
    <div className="bh-legend">
      {items.map(([k, label]) => (
        <span key={k} className="bh-legend-item">
          <i className="bh-dot" style={{ backgroundColor: STATUS_COLORS[k] }} />
          {label}
        </span>
      ))}
    </div>
  );
}
