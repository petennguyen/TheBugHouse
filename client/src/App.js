import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';

function Dashboard({ role }) {
  return (
    <div>
      <h2>Welcome, {role}!</h2>
      <button onClick={() => {
        localStorage.clear();
        window.location.href = '/';
      }}>Sign Out</button>
    </div>
  );
}

function App() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  return (
    <Router>
      <Routes>
        <Route path="/" element={!token ? <Login onLogin={() => window.location.reload()} /> : <Navigate to={`/${role}-dashboard`} />} />
        <Route path="/student-dashboard" element={<Dashboard role="student" />} />
        <Route path="/admin-dashboard" element={<Dashboard role="admin" />} />
        <Route path="/tutor-dashboard" element={<Dashboard role="tutor" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
