import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function TutorApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');


  const [filter, setFilter] = useState('all');

  // NEW: search term
  const [search, setSearch] = useState('');


  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [msg, setMsg] = useState(''); 

  // helper to capitalize status text
  const capitalize = (s) => (typeof s === 'string' && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/tutor-applications', {
        headers: { 'X-User-ID': 1 } // use a real admin userID from System_User
      });
      setApps(Array.isArray(res.data) ? res.data : (res.data.rows || []));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // counts for header chips
  const counts = apps.reduce(
    (acc, a) => {
      const s = String(a.status || 'pending').toLowerCase();
      if (!acc[s]) acc[s] = 0;
      acc[s]++;
      acc.total++;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  // compute filtered + searched apps
  const filteredApps = apps.filter((a) => {
    if (filter !== 'all' && String(a.status).toLowerCase() !== filter) return false;
    if (!search) return true;
    const q = search.trim().toLowerCase();
    return (
      `${a.userFirstName || ''} ${a.userLastName || ''}`.toLowerCase().includes(q) ||
      (a.userEmail || '').toLowerCase().includes(q)
    );
  });

  const viewResume = async (app) => {
    try {
      const res = await api.get(`/api/admin/tutor-applications/${app.applicationID}/resume`, {
        responseType: 'blob',
        headers: { 'X-User-ID': 1 } // match dev/admin header used elsewhere
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' }));
      window.open(url, '_blank');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to fetch resume');
    }
  };

  // updated to accept optional note and set message on success/error
  const doAction = async (id, action, note = null) => {
    setActionLoading(`${action}-${id}`);
    setMsg('');
    try {
      const url = `/api/admin/tutor-applications/${id}/${action}`;
      await api.post(url, { note }, { headers: { 'X-User-ID': 1 } });
      const nice = action === 'approve' ? 'Approved ✅' : 'Rejected';
      setMsg(`Application ${nice}`);
      // refresh and keep selection cleared or update selection
      await load();
      setSelectedApp(null);
      setAdminNote('');
    } catch (e) {
      const em = e?.response?.data?.message || 'Action failed';
      setMsg(`Error: ${em}`);
    } finally {
      setActionLoading(null);
      // auto-clear message after a short delay
      setTimeout(() => setMsg(''), 5000);
    }
  };

  return (
    /* center the whole panel and limit width */
    <div className="grid gap-3 md:grid-cols-3 max-w-6xl mx-auto items-start">
      {/* LEFT: main list (2/3 width) */}
      <div className="card md:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Tutor Applications</h3>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="px-3 py-2 rounded border border-gray-200 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <div className="text-red-600 mb-3">{error}</div>}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No applications</div>
        ) : (
          <div>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              {[
                { key: 'all', label: `All (${counts.total})` },
                { key: 'pending', label: `Pending (${counts.pending})` },
                { key: 'approved', label: `Approved (${counts.approved})` },
                { key: 'rejected', label: `Rejected (${counts.rejected})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded text-sm border ${
                    filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {/* increased horizontal spacing via borderSpacing and added vertical gap (12px).
                  removed divide-y to let borderSpacing show clear gaps between rows. */}
              <table
                className="min-w-full text-left table-auto border-separate shadow-sm"
                style={{ borderSpacing: '72px 12px' }} // horizontal gap 72px, vertical gap 12px
              >
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-20 sm:px-24 md:px-32 py-6 text-sm font-medium text-gray-700 text-center">Student</th>
                    <th scope="col" className="px-20 sm:px-24 md:px-32 py-6 text-sm font-medium text-gray-700 text-center">Submitted</th>
                    <th scope="col" className="px-20 sm:px-24 md:px-32 py-6 text-sm font-medium text-gray-700 text-center">Status</th>
                    <th scope="col" className="px-20 sm:px-24 md:px-32 py-6 text-sm font-medium text-gray-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="">
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No applications match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((a) => {
                      const selected = selectedApp && selectedApp.applicationID === a.applicationID;
                      return (
                        <tr
                          key={a.applicationID}
                          onClick={() => setSelectedApp(a)}
                          // per-row card look: white bg, rounded corners and subtle shadow
                          className={`cursor-pointer transition-all ${selected ? 'ring-1 ring-blue-100' : ''}`}
                          style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                        >
                          <td className="px-20 sm:px-24 md:px-32 py-6 text-center align-middle">
                            <div className="font-medium">{a.userFirstName} {a.userLastName}</div>
                            <div className="text-xs text-gray-500">{a.userEmail}</div>
                          </td>
                          <td className="px-20 sm:px-24 md:px-32 py-6 text-sm text-gray-600 border-l border-gray-100 text-center align-middle">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-20 sm:px-24 md:px-32 py-6 border-l border-gray-100 text-center align-middle">
                            <span className={
                              a.status === 'approved' ? 'text-green-700 font-medium' : a.status === 'rejected' ? 'text-red-700 font-medium' : 'text-yellow-700 font-medium'
                            }>{capitalize(a.status)}</span>
                          </td>
                          <td className="px-20 sm:px-24 md:px-32 py-6 border-l border-gray-100 text-center align-middle">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); viewResume(a); }}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                              >
                                View
                              </button>
                              <button
                                onClick={async (e) => { e.stopPropagation(); await doAction(a.applicationID, 'approve'); }}
                                disabled={actionLoading !== null || a.status !== 'pending'}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                              >
                                {actionLoading === `approve-${a.applicationID}` ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={async (e) => { e.stopPropagation(); await doAction(a.applicationID, 'reject'); }}
                                disabled={actionLoading !== null || a.status !== 'pending'}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                              >
                                {actionLoading === `reject-${a.applicationID}` ? '...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: detail card */}
      <div className="card bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="h2 text-lg font-semibold mb-3 text-center">Application Details</h2>

        {/* Message box */}
        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.toLowerCase().includes('error') ? '#fee2e2' : '#dcfce7',
            color: msg.toLowerCase().includes('error') ? '#dc2626' : '#166534',
            border: `1px solid ${msg.toLowerCase().includes('error') ? '#fecaca' : '#bbf7d0'}`,
            fontSize: 14,
            textAlign: 'center' // center message text
          }}>
            {msg}
          </div>
        )}

        {!selectedApp ? (
          <div style={{ padding: 20, color: '#6b7280', fontStyle: 'italic', textAlign: 'center' }}>
            Select an application from the list to see details and actions.
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <div className="font-medium text-base">{selectedApp.userFirstName} {selectedApp.userLastName}</div>
              <div className="text-sm text-gray-500">{selectedApp.userEmail}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="text-sm text-gray-600 mb-2">Submitted</div>
                {new Date(selectedApp.createdAt).toLocaleDateString()}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="text-sm text-gray-600 mb-2">Status</div>
              <div className="inline-block px-2 py-1 rounded-md text-sm font-medium" style={{
                background: selectedApp.status === 'approved' ? '#ecfdf5' : selectedApp.status === 'rejected' ? '#fff1f2' : '#fffbeb',
                color: selectedApp.status === 'approved' ? '#059669' : selectedApp.status === 'rejected' ? '#dc2626' : '#b45309'
              }}>{capitalize(selectedApp.status)}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="text-sm text-gray-600 mb-2">Cover Text</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApp.coverText || '—'}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => viewResume(selectedApp)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                View Resume
              </button>
              <button
                onClick={() => { setSelectedApp(null); setAdminNote(''); }}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
              >
                Deselect
              </button>
            </div>

            {/* Admin note input */}
            <div style={{ marginTop: 6 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Admin Note (optional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Add a short note for the applicant or internal record..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button
                onClick={() => doAction(selectedApp.applicationID, 'approve', adminNote || null)}
                disabled={actionLoading !== null || selectedApp.status !== 'pending'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
              >
                {actionLoading === `approve-${selectedApp.applicationID}` ? '...' : 'Approve'}
              </button>

              <button
                onClick={() => doAction(selectedApp.applicationID, 'reject', adminNote || null)}
                disabled={actionLoading !== null || selectedApp.status !== 'pending'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
              >
                {actionLoading === `reject-${selectedApp.applicationID}` ? '...' : 'Reject'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}