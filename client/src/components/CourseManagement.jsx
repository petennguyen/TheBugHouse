import React, { useEffect, useState } from 'react';
import api from '../api';

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ courseCode: '', courseTitle: '' });
  const [editingCourse, setEditingCourse] = useState(null);
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/admin/courses');
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setMsg('Error loading courses');
    }
    setIsLoading(false);
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
      setMsg(' Course added successfully!');
      setNewCourse({ courseCode: '', courseTitle: '' });
      loadCourses();
      setTimeout(() => setMsg(''), 4000);
    } catch (error) {
      setMsg(' ' + (error?.response?.data?.message || 'Error adding course'));
    }
    setIsLoading(false);
  };

  const updateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse.courseTitle.trim()) {
      setMsg('Course title is required');
      return;
    }
    try {
      await api.put(`/api/admin/courses/${editingCourse.subjectID}`, {
        courseCode: editingCourse.courseCode,
        courseTitle: editingCourse.courseTitle
      });
      setMsg('Course updated successfully!');
      setEditingCourse(null);
      loadCourses();
      setTimeout(() => setMsg(''), 4000);
    } catch (error) {
      setMsg(' ' + (error?.response?.data?.message || 'Error updating course'));
    }
  };

  const deleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to delete "${courseName}"?`)) return;
    try {
      await api.delete(`/api/admin/courses/${courseId}`);
      setMsg('🗑️ Course deleted successfully!');
      loadCourses();
      setTimeout(() => setMsg(''), 4000);
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
        {msg && (
          <div
            className={`p-4 rounded-lg shadow-sm text-sm font-medium transition-all ${
              msg.includes('✅')
                ? 'bg-green-100 text-green-800 border border-green-200'
                : msg.includes('❌')
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}
          >
            {msg}
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
        <div className="bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden">
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
            <div className="p-16 text-center text-gray-500 text-lg">No courses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-gray-700">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-12 py-8 font-semibold text-gray-600 text-center text-xl">Code</th>
                    <th className="px-12 py-8 font-semibold text-gray-600 text-center text-xl">Title</th>
                    <th className="px-12 py-8 font-semibold text-gray-600 text-center text-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course, index) => (
                    <tr
                      key={course.subjectID}
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}
                    >
                      {editingCourse?.subjectID === course.subjectID ? (
                        <>
                          <td className="px-12 py-8 text-center">
                            <input
                              type="text"
                              value={editingCourse.courseCode}
                              onChange={(e) => setEditingCourse({ ...editingCourse, courseCode: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-center text-lg"
                            />
                          </td>
                          <td className="px-12 py-8 text-center">
                            <input
                              type="text"
                              value={editingCourse.courseTitle}
                              onChange={(e) => setEditingCourse({ ...editingCourse, courseTitle: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-center text-lg"
                            />
                          </td>
                          <td className="px-12 py-8 text-center">
                            <div className="flex justify-center gap-6">
                              <button
                                onClick={updateCourse}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-md text-sm font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-400 hover:bg-gray-500 text-white px-8 py-4 rounded-md text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-12 py-8 text-center text-lg font-medium">
                            {course.subjectCode || '—'}
                          </td>
                          <td className="px-12 py-8 text-center text-lg font-medium">
                            {course.subjectName}
                          </td>
                          <td className="px-12 py-8 text-center">
                            <div className="flex justify-center gap-6">
                              <button
                                onClick={() => startEdit(course)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-md text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCourse(course.subjectID, course.subjectName)}
                                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-md text-sm font-medium"
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

export default CourseManagement;
