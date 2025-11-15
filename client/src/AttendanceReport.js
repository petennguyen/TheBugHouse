import { useState, useEffect, useCallback } from "react";
import api from "./api";

export default function AttendanceReport() {
  const today = new Date().toISOString().slice(0, 10);
  const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(past30);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState([]);

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
    } catch (error) {
      console.error('Failed to load report:', error);
      setData([]);
    }
  }, [startDate, endDate]); 
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
            <th>Timeslot ID</th>
            <th>Start</th>
            <th>End</th>
            <th>Session ID</th>
            <th>Tutor Name</th>
            <th>Student Name</th>
            <th>Sign-In Time</th>
            <th>Sign-Out Time</th>
            <th>Session Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.scheduleDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
              <td>{row.subjectName}</td>
              <td>{row.timeslotID}</td>
              <td>{row.timeslotStartTime}</td>
              <td>{row.timeslotEndTime}</td>
              <td>{row.sessionID}</td>
              <td>{row.tutorName}</td>
              <td>{row.studentName}</td>
              <td>{row.sessionSignInTime ? row.sessionSignInTime.toLocaleTimeString("en-US", {hour: "2-digit",minute: "2-digit",}): ""}</td>
              <td>{row.sessionSignOutTime ? row.sessionSignOutTime.toLocaleTimeString("en-US", {hour: "2-digit",minute: "2-digit",}): ""}</td>
              <td>{row.sessionStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);}