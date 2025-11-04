import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import CourseManagement from './CourseManagement';

export default function AdminDashboard() {
  const [kpis, setKpis] = useState({});
  const [subjectName, setSubjectName] = useState('');
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  // tabs removed — always render dashboard + course management sections

  // New state variables for feedback analytics
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [allFeedback, setAllFeedback] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/api/analytics/overview');
      setKpis(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setMsg('Error loading dashboard data');
    }
  };
  useEffect(() => { load(); }, []);

  const addSubject = async () => {
    if (!subjectName) return;
    await api.post('/api/subjects', { subjectName });
    setSubjectName('');
    load();
  };

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
    loadFeedbackAnalytics();
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Dashboard section */}
      <div className="space-y-6">
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
          <h3 className="font-medium">Manage Schedules</h3>
          <button
            className="px-3 py-2 bg-blue-500 text-white rounded mt-2"
            onClick={() => navigate('/admin/timeslot-generator')}
          >
            Go to Timeslot Generator
          </button>
        </div>

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
                  {feedbackAnalytics.ratingDistribution && feedbackAnalytics.ratingDistribution.length > 0 ? 
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
                  const found = feedbackAnalytics.ratingDistribution && feedbackAnalytics.ratingDistribution.length > 0 
                    ? feedbackAnalytics.ratingDistribution.find(r => r.sessionRating === rating)
                    : null;
                  const count = found ? found.count : 0;
                  const maxCount = feedbackAnalytics.ratingDistribution && feedbackAnalytics.ratingDistribution.length > 0
                    ? Math.max(...feedbackAnalytics.ratingDistribution.map(r => r.count), 1)
                    : 1;
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
            {feedbackAnalytics.recentFeedback && feedbackAnalytics.recentFeedback.length > 0 && (
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

        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </div>

      {/* Course Management section (always shown) */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Course Management</h2>
        <CourseManagement />
      </div>

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
    </div>
  );
}