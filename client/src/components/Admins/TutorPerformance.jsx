import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function TutorPerformance() {
  const [query, setQuery] = useState('');
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const searchTutors = async (q = '') => {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.get('/api/admin/tutors', { params: { search: q } });
      setTutors(Array.isArray(res.data) ? res.data : (res.data.rows || []));
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to load tutors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    searchTutors();
  }, []);

  // close modal on ESC
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const loadReport = async (tutor) => {
    // open modal and load report
    setSelected(tutor);
    setReport(null);
    setMsg('');
    setModalOpen(true);
    try {
      // expected endpoint: GET /api/admin/tutor-performance/:tutorId
      const { data } = await api.get(`/api/admin/tutor-performance/${tutor.userID}`);
      setReport(data);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to load report');
    }
  };
return (
  <div className="grid md:grid-cols-3 gap-4">
    {/* Left Card – Tutor List */}
    <div 
      className="card" 
      style={{ 
        background: 'white', 
        color: '#111', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <h3 className="text-lg font-semibold mb-3">Search Tutors</h3>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        className="w-full px-3 py-2 border rounded mb-3"
      />
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => searchTutors(query)}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Search
        </button>
        <button
          onClick={() => { setQuery(''); searchTutors(); }}
          className="px-3 py-2 bg-gray-100 rounded text-sm"
        >
          Reset
        </button>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <div className="text-gray-600">Loading tutors...</div>
        ) : tutors.length === 0 ? (
          <div className="text-gray-500">No tutors found.</div>
        ) : (
          tutors.map((t) => (
            <div
              key={t.userID}
              onClick={() => loadReport(t)}
              className={`cursor-pointer ${selected && selected.userID === t.userID ? 'ring-1 ring-blue-100 bg-gray-50' : 'bg-white'}`}
              style={{
                padding: '12px',
                marginBottom: 12,
                borderRadius: 8,
                border: '1px solid #eef2f6',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div className="font-medium">
                {t.firstName || t.userFirstName || t.name} {t.lastName || t.userLastName || ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Right Card – Performance Report */}
    <div 
      className="card md:col-span-2" 
      style={{ 
        background: 'white', 
        color: '#111', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <h3 className="text-lg font-semibold mb-3">Tutor Performance Report</h3>

      {msg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          background: msg.toLowerCase().includes('error') ? '#fee2e2' : '#dcfce7',
          color: msg.toLowerCase().includes('error') ? '#dc2626' : '#166534',
          border: `1px solid ${msg.toLowerCase().includes('error') ? '#fecaca' : '#bbf7d0'}`,
          fontSize: 14,
          textAlign: 'center'
        }}>
          {msg}
        </div>
      )}

      {!selected ? (
        <div className="text-gray-500">Select a tutor on the left to see performance details.</div>
      ) : report === null ? (
        <div className="text-gray-600">Loading report...</div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div className="font-medium text-lg">
                {report.tutor?.firstName || selected.firstName || selected.userFirstName}{' '}
                {report.tutor?.lastName || selected.lastName || selected.userLastName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Sessions Completed</div>
              <div className="text-2xl font-bold">{report.totalSessions ?? 0}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Avg Rating</div>
              <div className="text-2xl font-bold">
                {report.averageRating ? Number(report.averageRating).toFixed(1) : '-'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Total Reviews</div>
              <div className="text-2xl font-bold">
                {Array.isArray(report.reviews) ? report.reviews.length : 0}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Frequent Subjects</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Array.isArray(report.frequentSubjects) && report.frequentSubjects.length > 0 ? (
                report.frequentSubjects.map((s, i) => (
                  <div key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded">
                    {s.subjectName} ({s.count})
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No subject data</div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Recent Reviews</h4>
            {Array.isArray(report.reviews) && report.reviews.length > 0 ? (
              report.reviews.slice(0, 6).map((r, idx) => (
                <div key={idx} className="p-3 mb-2 rounded border border-gray-100 bg-white">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="font-medium">{r.studentFirstName} {r.studentLastName}</div>
                    <div className="text-sm font-bold text-green-600">{r.sessionRating}⭐</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.subjectName} — {new Date(r.scheduleDate).toLocaleDateString()}
                  </div>
                  {r.sessionFeedback && (
                    <div className="mt-2 text-sm italic text-gray-700">
                      "{r.sessionFeedback}"
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No reviews available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);
}