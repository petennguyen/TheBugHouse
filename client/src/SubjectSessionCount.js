import React, { useEffect, useState, useCallback } from "react";
import api from "./api";

export default function SessionTotalsList() {
  const today = new Date().toISOString().slice(0, 10);
  const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(past30);
  const [endDate, setEndDate] = useState(today);
  const [sessions, setSessions] = useState([]);

  const fetchSessionTotals = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/subject-session-count?startDate=${startDate}&endDate=${endDate}`);
      setSessions(res.data);
    } catch (error) {
      console.error("Error fetching session totals:", error);
    }
  }, [startDate, endDate]); 

  useEffect(() => {
    fetchSessionTotals();
  }, [fetchSessionTotals]);

  return (
    <div>
    <h1>Session Count Period</h1>

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

      <button style={{ marginLeft: "1rem" }} onClick={fetchSessionTotals}>
        Apply Range
      </button>
    </div>
    <div style={{ padding: "1rem" }}>
      <h1 className="text-2xl font-semibold mb-4">Total Sessions per Subject</h1>

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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f1f1f1", position: "sticky", top: 0 }}>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>Subject</th>
              <th style={{ textAlign: "right", padding: "8px" }}>Total Sessions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                <td style={{ padding: "8px" }}>
                  {item.subjectCode ? item.subjectCode + " - " : ""}{item.subjectName}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>{item.sessionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
