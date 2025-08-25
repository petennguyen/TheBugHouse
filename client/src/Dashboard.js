import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard({ userFirstName, onLogout }) {
  const [stats, setStats] = useState(null);
  const role = localStorage.getItem('role')?.toLowerCase() || 'student';

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8000/api/dashboard/stats/${role}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (mounted) setStats(res.data.stats || {});
      } catch (err) {
        console.error('dashboard stats error', err);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, [role]);

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Welcome to BugHouse{userFirstName ? `, ${userFirstName}` : ''}!</h1>
          <div style={{ color: '#666' }}>{role.charAt(0).toUpperCase() + role.slice(1)}</div>
        </div>
        <div>
          <button onClick={onLogout} style={{ padding: '8px 12px' }}>Logout</button>
        </div>
      </header>

      <section style={{ marginTop: 20 }}>
        <h2>Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontSize: 24 }}>{stats?.totalSessions ?? '—'}</div>
            <div style={{ color: '#666' }}>Total Sessions</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontSize: 24 }}>{stats?.upcomingSessions ?? '—'}</div>
            <div style={{ color: '#666' }}>Upcoming</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontSize: 24 }}>{stats?.totalHours ?? '—'}</div>
            <div style={{ color: '#666' }}>Hours</div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Quick Actions</h2>
        {role === 'student' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button>Find a Tutor</button>
            <button>My Sessions</button>
          </div>
        )}
        {role === 'tutor' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button>Set Availability</button>
            <button>My Schedule</button>
          </div>
        )}
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button>Manage Users</button>
            <button>View Reports</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;