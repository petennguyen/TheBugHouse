import React from "react";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Report Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-medium mb-2">Attendance Report</h2>
              <p className="text-sm text-gray-600 mb-4">
                View tutor attendance, sign-in and sign-out times, and session statuses.
              </p>
            </div>          

            <button
              className="rounded-xl shadow p-2 w-full text-center text-blue-700 font-semibold hover:bg-blue-50 transition"
              onClick={() => navigate("/admin/attendance-report")}
            >
              View Attendance Report
            </button>
          </div>

        {/* Subject Session Count Report Card */}
        <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-medium mb-2">Subject Session Count</h2>
            <p className="text-sm text-gray-600 mb-4">
              See how many sessions were booked for each subject in the past 30 days.
            </p>
          </div>         

          <button
            className="rounded-xl shadow p-2 w-full text-center text-blue-700 font-semibold hover:bg-blue-50 transition"
            onClick={() => navigate("/admin/subject-session-count")}
          >
            View Subject Session Count
          </button>
        </div>

      {/* Tutor Average Rating Report Card */}
      <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-medium mb-2">Tutor Average Ratings</h2>
          <p className="text-sm text-gray-600 mb-4">
            See tutor rating average and count.
          </p>
        </div>
        
        <button
          className="rounded-xl shadow p-2 w-full text-center text-blue-700 font-semibold hover:bg-blue-50 transition"
          onClick={() => navigate("/admin/tutor-performance")}
        >
          View Average Ratings
        </button>
      </div>
            </div>
          </div>
  );
}