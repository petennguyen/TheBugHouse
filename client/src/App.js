import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Signup from './Signup';
import bg from './assets/uta.jpg';
import './App.css';
import StudentBook from './StudentBook';
import Sessions from './Sessions';
import TutorAvailability from './TutorAvailability';
import AdminDashboard from './AdminDashboard';
import Dashboard from './Dashboard.jsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userFirstName, setUserFirstName] = useState('');

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUserFirstName('');
        return;
      }
      const res = await axios.get('http://localhost:8000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const u = res.data.user || {};
      setUserFirstName(u.userFirstName || u.firstName || '');
    } catch (err) {
      console.error('fetchProfile error', err);
      setUserFirstName('');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      fetchProfile();
    }
  }, []);

  const handleLogin = (role) => {
    setIsLoggedIn(true);
    setUserRole(role || '');
    fetchProfile();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userID');
    setIsLoggedIn(false);
    setUserFirstName('');
    setUserRole('');
  };

  const bgStyle = {
    minHeight: '100vh',
    backgroundImage: `url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  // Animated Bug Component for navbar - UPDATED TO ORANGE AND BIGGER
  const NavbarBug = () => (
    <div className="navbar-bug">
      <svg width="32" height="32" viewBox="0 0 120 120" className="navbar-bug-svg">
        {/* Bug body - orange primary */}
        <ellipse cx="60" cy="65" rx="22" ry="30" fill="#f97316" />
        
        {/* Bug head - lighter orange */}
        <circle cx="60" cy="35" r="16" fill="#fb923c" />
        
        {/* Antennae - blue accents */}
        <line x1="52" y1="22" x2="48" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
        <line x1="68" y1="22" x2="72" y2="12" stroke="#0b61ff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="12" r="3" fill="#0b61ff" />
        <circle cx="72" cy="12" r="3" fill="#0b61ff" />
        
        {/* Eyes */}
        <circle cx="54" cy="32" r="3" fill="white" />
        <circle cx="66" cy="32" r="3" fill="white" />
        <circle cx="54" cy="32" r="1.5" fill="black" />
        <circle cx="66" cy="32" r="1.5" fill="black" />
        
        {/* Wings - orange/blue mix */}
        <ellipse cx="40" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(-15 40 50)" />
        <ellipse cx="80" cy="50" rx="10" ry="18" fill="#fb923c" opacity="0.8" transform="rotate(15 80 50)" />
        
        {/* Wing patterns - blue */}
        <ellipse cx="40" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(-15 40 47)" />
        <ellipse cx="80" cy="47" rx="4" ry="8" fill="#0b61ff" opacity="0.9" transform="rotate(15 80 47)" />
        
        {/* Legs - darker orange */}
        <line x1="45" y1="75" x2="35" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
        <line x1="45" y1="85" x2="35" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
        <line x1="75" y1="75" x2="85" y2="85" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
        <line x1="75" y1="85" x2="85" y2="95" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
        
        {/* Smile - blue */}
        <path d="M 54 36 Q 60 42 66 36" stroke="#0b61ff" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Body spots - blue */}
        <circle cx="55" cy="58" r="2.5" fill="#0b61ff" opacity="0.8" />
        <circle cx="65" cy="68" r="2" fill="#0b61ff" opacity="0.8" />
        <circle cx="58" cy="78" r="2" fill="#0b61ff" opacity="0.8" />
      </svg>
    </div>
  );

  return (
    <Router>
      <div className="App" style={bgStyle}>
        <div className="overlay">
          {/* NAVBAR */}
          <header className="navbar blue-navbar">
            <div className="brand">
              <NavbarBug />
              <span className="brand-text">BugHouse {userFirstName ? `· Hi, ${userFirstName}` : ''}</span>
            </div>

            <nav className="nav-links">
              {isLoggedIn ? (
                <>
                  <Link to="/" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</Link>
                  <Link to="/sessions" className={({ isActive }) => isActive ? 'active' : ''}>My Sessions</Link>
                  <Link to="/book" className={({ isActive }) => isActive ? 'active' : ''}>Book</Link>
                  {userRole === 'Tutor' && (
                    <Link to="/availability" className={({ isActive }) => isActive ? 'active' : ''}>My Availability</Link>
                  )}
                  {userRole === 'Admin' && (
                    <Link to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Admin</Link>
                  )}
                  <button className="btn ghost logout" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login">Log in</Link>
                  <Link to="/signup" className="active">Sign up</Link>
                </>
              )}
            </nav>
          </header>

          {/* MAIN */}
          <main className="app-main">
            <Routes>
              {/* Auth */}
              <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
              <Route path="/signup" element={isLoggedIn ? <Navigate to="/" replace /> : <Signup onLogin={handleLogin} />} />

              {/* Dashboard */}
              <Route path="/" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />} />

              {/* App pages */}
              <Route path="/book" element={isLoggedIn ? <StudentBook /> : <Navigate to="/login" replace />} />
              <Route path="/sessions" element={isLoggedIn ? <Sessions /> : <Navigate to="/login" replace />} />
              <Route path="/availability" element={isLoggedIn && userRole === 'Tutor' ? <TutorAvailability /> : <Navigate to="/" replace />} />
              <Route path="/admin" element={isLoggedIn && userRole === 'Admin' ? <AdminDashboard /> : <Navigate to="/" replace />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to={isLoggedIn ? '/' : '/login'} replace />} />
            </Routes>
          </main>

          <footer className="site-footer">© {new Date().getFullYear()} The BugHouse · University of Texas at Arlington</footer>
        </div>
      </div>
    </Router>
  );
}

export default App;