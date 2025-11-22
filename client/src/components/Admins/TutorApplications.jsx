import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function TutorApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [msg, setMsg] = useState('');

  const capitalize = (s) => (typeof s === 'string' && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const statusStyles = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'approved') return { color: '#059669', bg: '#ecfdf5', badge: 'bg-green-100 text-green-800' };
    if (s === 'rejected') return { color: '#dc2626', bg: '#fff1f2', badge: 'bg-red-100 text-red-800' };
    return { color: '#b45309', bg: '#fffbeb', badge: 'bg-yellow-100 text-yellow-800' };
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/tutor-applications', {
        headers: { 'X-User-ID': 1 }
      });
      setApps(Array.isArray(res.data) ? res.data : (res.data.rows || []));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        headers: { 'X-User-ID': 1 }
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' }));
      window.open(url, '_blank');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to fetch resume');
    }
  };

  const doAction = async (id, action, note = null) => {
    setActionLoading(`${action}-${id}`);
    setMsg('');
    try {
      const url = `/api/admin/tutor-applications/${id}/${action}`;
      await api.post(url, { note }, { headers: { 'X-User-ID': 1 } });
      const nice = action === 'approve' ? 'Approved ✅' : 'Rejected';
      setMsg(`Application ${nice}`);
      await load();
      setSelectedApp(null);
      setAdminNote('');
    } catch (e) {
      const em = e?.response?.data?.message || 'Action failed';
      setMsg(`Error: ${em}`);
    } finally {
      setActionLoading(null);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">Tutor Applications</h1>
          <p className="text-gray-600 mt-1">Review and manage student tutor applications</p>
        </div>

        {/* Message */}
        {msg && (
          <div className={`p-4 rounded-lg border ${
            msg.toLowerCase().includes('error') 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : 'bg-green-50 text-green-800 border-green-200'
          }`}>
            {msg}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by name or email..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: `All (${counts.total})` },
                { key: 'pending', label: `Pending (${counts.pending})` },
                { key: 'approved', label: `Approved (${counts.approved})` },
                { key: 'rejected', label: `Rejected (${counts.rejected})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Applications List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">Applications</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="mt-3 text-gray-600 font-medium">Loading applications...</p>
              </div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-4xl mb-2">📋</div>
                <p className="text-gray-600 font-medium">No applications yet</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-4xl mb-2">🔍</div>
                <p className="text-gray-600 font-medium">No applications match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredApps.map((a) => {
                      const selected = selectedApp && selectedApp.applicationID === a.applicationID;
                      return (
                        <tr
                          key={a.applicationID}
                          onClick={() => setSelectedApp(a)}
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                            selected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {a.userFirstName} {a.userLastName}
                            </div>
                            <div className="text-xs text-gray-500">{a.userEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles(a.status).badge}`}>
                              {capitalize(a.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); viewResume(a); }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors"
                              >
                                View
                              </button>
                              {a.status === 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); doAction(a.applicationID, 'approve'); }}
                                    disabled={actionLoading !== null}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === `approve-${a.applicationID}` ? '...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); doAction(a.applicationID, 'reject'); }}
                                    disabled={actionLoading !== null}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === `reject-${a.applicationID}` ? '...' : 'Reject'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Application Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h2 className="text-xl font-bold">Application Details</h2>
            </div>

            {!selectedApp ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Select an application to view details</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Applicant Info */}
                <div className="text-center pb-4 border-b">
                  <div className="flex justify-center mb-3">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {selectedApp.userFirstName?.[0]}{selectedApp.userLastName?.[0]}
                    </div>
                  </div>
                  <div className="font-semibold text-lg text-gray-900">
                    {selectedApp.userFirstName} {selectedApp.userLastName}
                  </div>
                  <div className="text-sm text-gray-500">{selectedApp.userEmail}</div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Submitted
                    </div>
                    <div className="text-sm text-gray-900">
                      {new Date(selectedApp.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Status
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles(selectedApp.status).badge}`}>
                      {capitalize(selectedApp.status)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Cover Text
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedApp.coverText || '—'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewResume(selectedApp)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                    >
                      📄 View Resume
                    </button>
                    <button
                      onClick={() => { setSelectedApp(null); setAdminNote(''); }}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {selectedApp.status === 'pending' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                          Admin Note (optional)
                        </label>
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          rows={3}
                          placeholder="Add a note for the applicant..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => doAction(selectedApp.applicationID, 'approve', adminNote || null)}
                          disabled={actionLoading !== null}
                          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `approve-${selectedApp.applicationID}` ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => doAction(selectedApp.applicationID, 'reject', adminNote || null)}
                          disabled={actionLoading !== null}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `reject-${selectedApp.applicationID}` ? 'Processing...' : '✕ Reject'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}