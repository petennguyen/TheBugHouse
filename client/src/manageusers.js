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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'Tutor': return 'bg-blue-100 text-blue-800';
      case 'Student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
              <p className="text-gray-600 mt-1">View and manage students, tutors and administrators</p>
            </div>

            <button 
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm w-full lg:w-auto"
              onClick={() => alert('Add user functionality would go here')}
            >
              + Add New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                aria-label="Search users by name, email or ID"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="🔍 Search by name, email or ID..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by role"
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All roles</option>
              <option value="Student">Students</option>
              <option value="Tutor">Tutors</option>
              <option value="Admin">Administrators</option>
            </select>
            <button 
              onClick={loadUsers} 
              disabled={loading}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              aria-label="Refresh user list"
            >
              {loading ? '⟳ Loading...' : '⟳ Refresh'}
            </button>
          </div>
        </div>

        {err && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 shadow-sm" role="alert">
            <strong className="font-semibold">Error: </strong>{err}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-sm font-medium text-gray-700">
              Showing {paginatedUsers.length} of {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-3 text-gray-600 font-medium">Loading users...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedUsers.map((user) => (
                      <tr key={user.userID} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {user.userFirstName?.[0]}{user.userLastName?.[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {user.userFirstName} {user.userLastName}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                ID: {user.userID}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                            {user.role || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {user.email || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.active ? (
                            <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelected(user)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors"
                              aria-label={`View details for ${user.userFirstName} ${user.userLastName}`}
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${user.userFirstName} ${user.userLastName}? This cannot be undone.`)) {
                                  removeUser(user.userID);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-medium transition-colors"
                              aria-label={`Delete ${user.userFirstName} ${user.userLastName}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <div className="text-gray-400 text-4xl mb-2">📭</div>
                          <p className="text-gray-600 font-medium">
                            {search || roleFilter !== 'all' 
                              ? 'No users match your search criteria' 
                              : 'No users found'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selected && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selected.userFirstName} {selected.userLastName}
                  </h2>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${getRoleBadgeColor(selected.role)} bg-white`}>
                    {selected.role}
                  </span>
                </div>
                <button 
                  onClick={() => setSelected(null)} 
                  className="text-white hover:text-gray-200 text-2xl leading-none transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
                  <div className="text-sm text-gray-900 break-all">{selected.email || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">User ID</div>
                  <div className="text-sm text-gray-900 font-mono">{selected.userID}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                  <div className="text-sm text-gray-900">{selected.phone || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</div>
                  <div>
                    {selected.active ? (
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Created</div>
                  <div className="text-sm text-gray-900">
                    {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}
                  </div>
                </div>
                {selected.role === 'Tutor' && selected.subjects && (
                  <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.subjects.map((subject, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setConfirmToggle({ user: selected, newActive: !selected.active });
                    setSelected(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selected.active 
                      ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' 
                      : 'bg-green-100 hover:bg-green-200 text-green-800'
                  }`}
                >
                  {selected.active ? '⏸ Disable User' : '▶ Activate User'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this user? This cannot be undone.')) {
                      removeUser(selected.userID);
                    }
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                >
                  🗑 Delete User
                </button>
                <button 
                  onClick={() => setSelected(null)} 
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Toggle Modal */}
      {confirmToggle && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmToggle(null)}
        >
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className={`px-6 py-5 rounded-t-xl ${confirmToggle.newActive ? 'bg-green-600' : 'bg-yellow-600'} text-white`}>
              <h3 className="text-xl font-bold">
                {confirmToggle.newActive ? 'Activate User' : 'Disable User'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                {confirmToggle.newActive
                  ? `Activate ${confirmToggle.user.userFirstName} ${confirmToggle.user.userLastName}? They will regain system access.`
                  : `Disable ${confirmToggle.user.userFirstName} ${confirmToggle.user.userLastName}? They will lose system access.`}
              </p>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmToggle(null)} 
                  disabled={actionLoading === `toggle-${confirmToggle.user.userID}`}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => toggleActive(confirmToggle.user.userID, confirmToggle.newActive)}
                  disabled={actionLoading === `toggle-${confirmToggle.user.userID}`}
                  className={`px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                    confirmToggle.newActive 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {actionLoading === `toggle-${confirmToggle.user.userID}` ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}