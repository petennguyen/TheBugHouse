import { useState, useEffect, useCallback } from "react";
import api from "./api";


function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

export default function AttendanceReport() {
  const today = new Date().toISOString().slice(0, 10);
  const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(past30);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchReport = useCallback(async () => {
    try {
      const response = await api.get(`/api/admin/attendance-report?startDate=${startDate}&endDate=${endDate}`);
      const formatted = response.data.map(row => ({
        ...row,
        scheduleDate: row.scheduleDate ? new Date(row.scheduleDate) : null,
        sessionSignInTime: row.sessionSignInTime ? new Date(row.sessionSignInTime) : null,
        sessionSignOutTime: row.sessionSignOutTime ? new Date(row.sessionSignOutTime) : null,
      }));
      setData(formatted);
      setCurrentPage(1); // Reset to first page on new fetch
    } catch (error) {
      console.error('Failed to load report:', error);
      setData([]);
    }
  }, [startDate, endDate]); 

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h1>Attendance Report</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Start Date:{" "}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label style={{ marginLeft: "1rem" }}>
          End Date:{" "}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <button style={{ marginLeft: "1rem" }} onClick={fetchReport}>
          Apply Range
        </button>
      </div>

      <div
        style={{
          border: "1px solid #1551f5ff",
          backgroundColor:  "white",
          borderRadius: "8px",
          maxHeight: "500px", 
          overflowY: "auto",
          padding: "8px",
        }}
      >
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Schedule</th>
              <th>Tutor Name</th>
              <th>Student Name</th>
              <th>Sign-In Time</th>
              <th>Sign-Out Time</th>
              <th>Session Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <>
                <tr key={i}>
                  <td>{row.scheduleDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td>{row.subjectName}</td>
                  <td style={{whiteSpace: 'nowrap'}}>
                    {row.timeslotStartTime && row.timeslotEndTime
                      ? `${formatTime(row.timeslotStartTime)} - ${formatTime(row.timeslotEndTime)}`
                      : ''}
                  </td>
                  <td>{row.tutorName}</td>
                  <td>{row.studentName}</td>
                  <td>{row.sessionSignInTime ? row.sessionSignInTime.toLocaleTimeString("en-US", {hour: "2-digit",minute: "2-digit",}): ""}</td>
                  <td>{row.sessionSignOutTime ? row.sessionSignOutTime.toLocaleTimeString("en-US", {hour: "2-digit",minute: "2-digit",}): ""}</td>
                  <td>{row.sessionStatus}</td>
                </tr>
                <tr key={"line-"+i}><td colSpan={11}><hr style={{margin:0, border:0, borderTop:'1px solid #ccc'}}/></td></tr>
              </>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "16px 0" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ marginRight: 12, padding: "6px 16px" }}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ marginLeft: 12, padding: "6px 16px" }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}