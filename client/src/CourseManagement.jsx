import React, { useEffect, useState } from 'react';
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

  const filteredCourses = courses.filter(course =>
    course.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.subjectCode && course.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-7xl space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Course Management</h1>
          <p className="text-gray-500 mt-2">Add, update, and manage your academic courses</p>
        </div>

        {/* Message */}
        <MessageBox msg={msg} onClose={() => setMsg('')} />
        {/* Retry button for load errors (kept separate to ensure layout) */}
        {msg?.toLowerCase().includes('error loading courses') && (
          <div className="flex justify-center mt-2">
            <button
              onClick={loadCourses}
              className="bg-white/80 hover:bg-white text-sm text-blue-600 px-3 py-1 rounded-md border border-blue-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Add Course */}
        <div className="bg-white shadow-md rounded-xl p-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Add New Course</h2>
          <form onSubmit={addCourse} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
              <input
                type="text"
                value={newCourse.courseCode}
                onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                placeholder="e.g., CSE1325"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Title<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newCourse.courseTitle}
                onChange={(e) => setNewCourse({ ...newCourse, courseTitle: e.target.value })}
                placeholder="e.g., Data Structures"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-center"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </form>
        </div>

        {/* Course Table */}
        <div className="bg-white/95 shadow-md rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-8 py-6 border-b border-gray-200 gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Course Directory</h2>
            <div className="flex items-center justify-center gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-center"
              />
              <span className="text-gray-500 text-sm">
                {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-gray-500 text-lg">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8">
              <MessageBox msg="No courses found." onClose={() => setMsg('')} />
            </div>
          ) : (
            <div className="overflow-x-auto flex justify-center">
              <table
                className="min-w-full text-gray-700 table-auto mx-auto w-full max-w-6xl"
                style={{
                  borderCollapse: 'separate',
                  borderSpacing: '6rem 2.5rem'
                }}
              >
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '62%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>

                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-10 sm:px-14 md:px-20 py-8 text-sm font-medium text-gray-700 text-center">Code</th>
                    <th className="px-10 sm:px-14 md:px-20 py-8 text-sm font-medium text-gray-700 text-center">Title</th>
                    <th className="px-10 sm:px-14 md:px-20 py-8 text-sm font-medium text-gray-700 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredCourses.map((course) => (
                    <tr key={course.subjectID} className="hover:bg-gray-50 transition-colors">
                      {editingCourse?.subjectID === course.subjectID ? (
                        <>
                          <td className="py-10 text-center">
                            <input
                              type="text"
                              value={editingCourse.courseCode}
                              onChange={(e) => setEditingCourse({ ...editingCourse, courseCode: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-6 py-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-center text-lg"
                            />
                          </td>
                          <td className="py-10 text-center">
                            <input
                              type="text"
                              value={editingCourse.courseTitle}
                              onChange={(e) => setEditingCourse({ ...editingCourse, courseTitle: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-6 py-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-center text-lg"
                            />
                          </td>
                          <td className="py-10 text-center">
                            <div className="flex justify-center gap-6">
                              <button
                                onClick={updateCourse}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md text-sm font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-md text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-10 text-center text-lg font-medium">
                            {course.subjectCode || '—'}
                          </td>
                          <td className="py-10 text-center text-lg font-medium">
                            {course.subjectName}
                          </td>
                          <td className="py-10 text-center">
                            <div className="flex items-center justify-center gap-6">
                              <button
                                onClick={() => startEdit(course)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCourse(course.subjectID, course.subjectName)}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md text-sm font-medium"
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
          )}
        </div>
      </div>
    </div>
  );
}
