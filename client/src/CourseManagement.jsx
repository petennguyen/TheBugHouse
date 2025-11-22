import React, { useEffect, useState, useMemo } from 'react';
import api from './api';

function MessageBox({ msg, onClose }) {
  if (!msg) return null;
  const isError = String(msg).toLowerCase().includes('error');
  const style = {
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    background: isError ? '#fee2e2' : '#dcfce7',
    color: isError ? '#dc2626' : '#166534',
    border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
    fontSize: 14,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  };

  return (
    <div style={style} role="status" aria-live="polite">
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss message"
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          color: isError ? '#9f1239' : '#14532d'
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ courseCode: '', courseTitle: '' });
  const [editingCourse, setEditingCourse] = useState(null);
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/admin/courses');
      setCourses(data);
      setMsg('');
    } catch (error) {
      console.error('Failed to load courses:', error);
      const serverMsg = error?.response?.data?.message;
      const status = error?.response?.status;
      const errMsg = serverMsg || (status ? `Request failed (${status})` : error?.message || 'Unknown error');
      setMsg(`Error loading courses: ${errMsg}`);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter(course =>
      course.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.subjectCode && course.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [courses, searchTerm]);

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCourses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCourses, currentPage]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.courseTitle.trim()) {
      setMsg('Course title is required');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/api/admin/courses', newCourse);
      setMsg('Course added successfully!');
      setNewCourse({ courseCode: '', courseTitle: '' });
      loadCourses();
    } catch (error) {
      setMsg(' ' + (error?.response?.data?.message || 'Error adding course'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourse = async (e) => {
    e?.preventDefault?.();
    if (!editingCourse?.courseTitle || !editingCourse.courseTitle.trim()) {
      setMsg('Course title is required');
      return;
    }
    setIsLoading(true);
    try {
      await api.put(`/api/admin/courses/${editingCourse.subjectID}`, {
        courseCode: editingCourse.courseCode,
        courseTitle: editingCourse.courseTitle
      });

      setCourses((prev) =>
        prev.map((c) =>
          c.subjectID === editingCourse.subjectID
            ? { ...c, subjectName: editingCourse.courseTitle, subjectCode: editingCourse.courseCode }
            : c
        )
      );

      setMsg('Course updated successfully!');
      setEditingCourse(null);

    } catch (error) {
      console.error('Update course error:', error);
      setMsg(' ' + (error?.response?.data?.message || 'Error updating course'));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to delete "${courseName}"?`)) return;
    try {
      await api.delete(`/api/admin/courses/${courseId}`);
      setMsg('🗑️ Course deleted successfully!');
      loadCourses();
    } catch (error) {
      setMsg(' ' + (error?.response?.data?.message || 'Error deleting course'));
    }
  };

  const startEdit = (course) => {
    setEditingCourse({
      subjectID: course.subjectID,
      courseCode: course.subjectCode || '',
      courseTitle: course.subjectName
    });
  };

  const cancelEdit = () => {
    setEditingCourse(null);
    setMsg('');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
            <p className="text-gray-600 mt-1">Add, update, and manage your academic courses</p>
          </div>
        </div>

        {/* Message */}
        {msg && <MessageBox msg={msg} onClose={() => setMsg('')} />}

        {/* Retry button for load errors */}
        {msg?.toLowerCase().includes('error loading courses') && (
          <div className="flex justify-center">
            <button
              onClick={loadCourses}
              className="bg-white hover:bg-gray-50 text-sm text-blue-600 px-4 py-2 rounded-lg border border-blue-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Add Course */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Course</h2>
          <form onSubmit={addCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                <input
                  type="text"
                  value={newCourse.courseCode}
                  onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                  placeholder="e.g., CSE1325"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourse.courseTitle}
                  onChange={(e) => setNewCourse({ ...newCourse, courseTitle: e.target.value })}
                  placeholder="e.g., Data Structures"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </form>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="🔍 Search by course code or title..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button 
              onClick={loadCourses} 
              disabled={isLoading}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
            >
              {isLoading ? '⟳ Loading...' : '⟳ Refresh'}
            </button>
          </div>
        </div>

        {/* Course Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-gray-800">Course Directory</h2>
            <div className="text-sm font-medium text-gray-700">
              Showing {paginatedCourses.length} of {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-3 text-gray-600 font-medium">Loading courses...</p>
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-4xl mb-2">📚</div>
              <p className="text-gray-600 font-medium">
                {searchTerm ? 'No courses match your search' : 'No courses found'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedCourses.map((course) => (
                      <tr key={course.subjectID} className="hover:bg-gray-50 transition-colors">
                        {editingCourse?.subjectID === course.subjectID ? (
                          <>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editingCourse.courseCode}
                                onChange={(e) => setEditingCourse({ ...editingCourse, courseCode: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                placeholder="Course code"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editingCourse.courseTitle}
                                onChange={(e) => setEditingCourse({ ...editingCourse, courseTitle: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                placeholder="Course title"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={updateCourse}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-xs font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {course.subjectCode || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {course.subjectName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => startEdit(course)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteCourse(course.subjectID, course.subjectName)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-medium transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
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
    </div>
  );
}
