import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

export default function Dashboard() {
  const role = localStorage.getItem('role') || '';
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (role === 'Admin') {
      api.get('/api/analytics/overview')
        .then(res => setKpis(res.data))
        .catch(() => setErr('Failed to load analytics'));
    }
  }, [role]);

  const Card = ({ title, children }) => (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600 }}>Dashboard</h2>

      {role === 'Student' && (
        <>
          <Card title="Quick actions">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/book"><button style={btn}>Book a session</button></Link>
              <Link to="/sessions"><button style={btnSecondary}>My sessions</button></Link>
            </div>
          </Card>
          <Card title="Tips">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Use your UTA email to sign in.</li>
              <li>You can leave feedback and ratings after each session.</li>
            </ul>
          </Card>
        </>
      )}

      {role === 'Tutor' && (
        <>
          <Card title="Quick actions">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/sessions"><button style={btn}>Today’s sessions</button></Link>
              <Link to="/availability"><button style={btnSecondary}>Manage availability</button></Link>
            </div>
          </Card>
          <Card title="Notes">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Mark <em>Sign-in</em> / <em>Sign-out</em> from the Sessions page.</li>
              <li>Keep your qualifications up to date for better matches.</li>
            </ul>
          </Card>
        </>
      )}

      {role === 'Admin' && (
        <>
          <Card title="KPIs">
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
              <Link to="/admin"><button style={btn}>Open Admin panel</button></Link>
              <Link to="/sessions"><button style={btnSecondary}>All sessions</button></Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const btn = {
  padding: '10px 14px',
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
};
const btnSecondary = {
  ...btn,
  background: '#2563eb',
};

function Stat({ label, value }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
