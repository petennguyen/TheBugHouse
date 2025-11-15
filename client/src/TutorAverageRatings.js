import React, { useEffect, useState } from "react";
import api from "./api"; 

export default function TutorAverageRatings() {
  const [ratings, setRatings] = useState([]);

  const fetchTutorAverages = async () => {
    try {
      const res = await api.get("/api/admin/tutor-average-ratings");
      console.log("Received ratings:", res.data); 
      setRatings(res.data);
    } catch (error) {
      console.error("Error fetching tutor averages:", error);
    }
  };

  useEffect(() => {
    fetchTutorAverages();
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h1 className="text-2xl font-semibold mb-4">Tutor Average Ratings</h1>

      <div
        style={{
          border: "1px solid #1551f5ff",
          backgroundColor: "white",
          borderRadius: "8px",
          maxHeight: "500px",
          overflowY: "auto",
          padding: "8px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{ backgroundColor: "#f1f1f1", position: "sticky", top: 0 }}
          >
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>Tutor</th>
              <th style={{ textAlign: "right", padding: "8px" }}>Average Rating</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Rating Count</th>
            </tr>
          </thead>
          <tbody>
            {ratings.length > 0 ? (
              ratings.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <td style={{ padding: "8px" }}>{item.tutorName}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {item.avgRating ?? "-"}
                  </td>
                  <td style={{ padding: "8px", textAlign: "left" }}>
                    {item.ratingCount ?? 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: "10px" }}>
                  No ratings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}