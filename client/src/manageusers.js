import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from './api'; 


export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const res = await api.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('manage users load error', e);
      setErr(e?.response?.data?.message || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users
      .filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          String(u.userFirstName || '').toLowerCase().includes(q) ||
          String(u.userLastName || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q) ||
          String(u.userID || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.userLastName || '').localeCompare(b.userLastName || ''));
  }, [users, search, roleFilter]);

  const toggleActive = async (userId, newActive) => {
    setActionLoading(`toggle-${userId}`);
    setErr('');
    try {
      await api.patch(`/api/admin/users/${userId}`, { active: newActive }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await loadUsers();
      setConfirmToggle(null);
    } catch (e) {
      console.error('toggle active error', e);
      setErr(e?.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (userId) => {
    setActionLoading(`delete-${userId}`);
    setErr('');
    try {
      await api.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await loadUsers();
      setSelected(null);
    } catch (e) {
      console.error('delete user error', e);
      setErr(e?.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

//   const handleKeyDown = (e, callback) => {
//     if (e.key === 'Enter' || e.key === ' ') {
//       e.preventDefault();
//       callback();
//     }
//   };

  return (
    <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50">
      {/* faint solid panel to improve contrast for black text */}
      <div className="w-full max-w-6xl space-y-6 bg-white/95 ring-1 ring-gray-100 rounded-2xl p-6 sm:p-10 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 text-sm sm:text-base">View and manage students, tutors and administrators</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              aria-label="Search users by name, email or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or ID..."
              className="px-4 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-72"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All roles</option>
              <option value="Student">Student</option>
              <option value="Tutor">Tutor</option>
              <option value="Admin">Admin</option>
            </select>
            <button 
              onClick={loadUsers} 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh user list"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {err && (
          <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-200" role="alert">
            <strong className="font-semibold">Error: </strong>{err}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-600 font-medium">
                {filtered.length} user{filtered.length !== 1 ? 's' : ''} found
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex justify-center"> 
              <table className="min-w-full text-left table-auto mx-auto max-w-5xl">
                <colgroup>
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-16 sm:px-20 md:px-24 py-6 text-sm font-medium text-gray-700 text-center">Name</th>
                    <th scope="col" className="px-16 sm:px-20 md:px-24 py-6 text-sm font-medium text-gray-700 text-center">Role</th>
                    <th scope="col" className="px-16 sm:px-20 md:px-24 py-6 text-sm font-medium text-gray-700 text-center">Email</th>
                    <th scope="col" className="px-16 sm:px-20 md:px-24 py-6 text-sm font-medium text-gray-700 text-center">Status</th>
                    <th scope="col" className="px-16 sm:px-20 md:px-24 py-6 text-sm font-medium text-gray-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((user) => (
                    <tr key={user.userID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-16 sm:px-20 md:px-24 py-8 text-center">
                        <div className="font-semibold text-gray-900">
                          {user.userFirstName} {user.userLastName}
                        </div>
                      </td>
                      <td className="px-16 sm:px-20 md:px-24 py-8 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role || '—'}
                        </span>
                      </td>
                      <td className="px-16 sm:px-20 md:px-24 py-8 text-center text-sm text-gray-700">{user.email || '—'}</td>
                      <td className="px-16 sm:px-20 md:px-24 py-8 text-center">
                        {user.active ? (
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            ● Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            ● Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions: removed the inline Disable/Activate button; keep View + Delete */}
                      <td className="px-16 sm:px-20 md:px-24 py-8 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => setSelected(user)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors"
                            aria-label={`View details for ${user.userFirstName} ${user.userLastName}`}
                          >
                            View
                          </button>

                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete ${user.userFirstName} ${user.userLastName}? This action cannot be undone.`,
                                )
                              ) {
                                removeUser(user.userID);
                              }
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm text-red-700 transition-colors"
                            aria-label={`Delete ${user.userFirstName} ${user.userLastName}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-gray-500">
                        {search || roleFilter !== 'all' 
                          ? 'No users match your search criteria' 
                          : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                  {selected.userFirstName} {selected.userLastName}
                </h2>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selected.role}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelected(null)} 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex border-b pb-2">
                <strong className="text-gray-600 w-24">Email:</strong>
                <span className="text-gray-900">{selected.email || '—'}</span>
              </div>
              <div className="flex border-b pb-2">
                <strong className="text-gray-600 w-24">ID:</strong>
                <span className="text-gray-900 font-mono">{selected.userID}</span>
              </div>
              <div className="flex border-b pb-2">
                <strong className="text-gray-600 w-24">Phone:</strong>
                <span className="text-gray-900">{selected.phone || '—'}</span>
              </div>
              <div className="flex border-b pb-2">
                <strong className="text-gray-600 w-24">Status:</strong>
                <span>
                  {selected.active ? (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      ● Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      ● Disabled
                    </span>
                  )}
                </span>
              </div>
              <div className="flex border-b pb-2">
                <strong className="text-gray-600 w-24">Created:</strong>
                <span className="text-gray-900">
                  {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}
                </span>
              </div>
              {selected.role === 'Tutor' && (
                <div className="flex border-b pb-2">
                  <strong className="text-gray-600 w-24">Subjects:</strong>
                  <span className="text-gray-900">{(selected.subjects || []).join(', ') || '—'}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmToggle({ user: selected, newActive: !selected.active });
                  setSelected(null);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selected.active 
                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' 
                    : 'bg-green-100 hover:bg-green-200 text-green-800'
                }`}
              >
                {selected.active ? 'Disable User' : 'Activate User'}
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                    removeUser(selected.userID);
                  }
                }}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-700 transition-colors"
              >
                Delete User
              </button>

              <button 
                onClick={() => setSelected(null)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm toggle modal */}
      {confirmToggle && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmToggle(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 id="confirm-title" className="text-lg font-bold mb-3 text-gray-900">
              {confirmToggle.newActive ? 'Activate User' : 'Disable User'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmToggle.newActive
                ? `Are you sure you want to activate ${confirmToggle.user.userFirstName} ${confirmToggle.user.userLastName}? They will regain access to the system.`
                : `Are you sure you want to disable ${confirmToggle.user.userFirstName} ${confirmToggle.user.userLastName}? They will lose access to the system.`}
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmToggle(null)} 
                disabled={actionLoading === `toggle-${confirmToggle.user.userID}`}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleActive(confirmToggle.user.userID, confirmToggle.newActive)}
                disabled={actionLoading === `toggle-${confirmToggle.user.userID}`}
                className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
                  confirmToggle.newActive 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionLoading === `toggle-${confirmToggle.user.userID}` ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}