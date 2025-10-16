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
import TutorProfile from './TutorProfile';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API });

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  
  const bgStyle = {
    backgroundImage: `linear-gradient(rgba(234, 229, 229, 0.6), rgba(36, 76, 150, 0.6)), url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      api.get('/api/user/profile')
        .then(response => {
          if (response.data?.userFirstName) {
            setUserFirstName(response.data.userFirstName);
          }
        })
        .catch(() => {
          // Handle error silently or show message
        });
    }
  }, []);

  const handleLogin = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
    
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      api.get('/api/user/profile')
        .then(response => {
          if (response.data?.userFirstName) {
            setUserFirstName(response.data.userFirstName);
          }
        })
        .catch(() => {
          // Handle error silently
        });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userID');
    delete api.defaults.headers.common['Authorization'];
    setIsLoggedIn(false);
    setUserRole('');
    setUserFirstName('');
  };

  return (
    <Router>
      <div className="App" style={bgStyle}>
        <div className="overlay">
          {/* New Navbar implementation */}
          <header className="navbar blue-navbar">
            <div className="brand">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="30" r="8" />
                <ellipse cx="50" cy="50" rx="20" ry="15" />
                <circle cx="50" cy="70" r="6" />
                <line x1="30" y1="45" x2="20" y2="40" stroke="currentColor" strokeWidth="2" />
                <line x1="70" y1="45" x2="80" y2="40" stroke="currentColor" strokeWidth="2" />
                <line x1="30" y1="55" x2="20" y2="60" stroke="currentColor" strokeWidth="2" />
                <line x1="70" y1="55" x2="80" y2="60" stroke="currentColor" strokeWidth="2" />
                <circle cx="45" cy="45" r="2" fill="white" />
                <circle cx="55" cy="45" r="2" fill="white" />
              </svg>
              <span className="brand-text">
                BugHouse {userFirstName ? `· Hi, ${userFirstName}` : ''}
              </span>
            </div>

            <nav className="nav-links">
              {isLoggedIn ? (
                <>
                  <Link to="/">Dashboard</Link>
                  <Link to="/sessions">My Sessions</Link>
                  <Link to="/book">Book</Link>
                  {userRole === 'Tutor' && (
                    <>
                      <Link to="/availability">My Availability</Link>
                      <Link to="/profile">Profile</Link>
                    </>
                  )}
                  {userRole === 'Admin' && (
                    <Link to="/admin">Admin</Link>
                  )}
                  <button className="btn ghost logout" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">Log in</Link>
                  <Link to="/signup" className="active">Sign up</Link>
                </>
              )}
            </nav>
          </header>

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
              <Route path="/profile" element={isLoggedIn && userRole === 'Tutor' ? <TutorProfile /> : <Navigate to="/" replace />} />

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