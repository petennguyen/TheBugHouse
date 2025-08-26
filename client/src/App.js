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
import Dashboard from './Dashboard'; // 👈 NEW

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

  // ---- Route guards ----
  const PrivateRoute = ({ children }) => (isLoggedIn ? children : <Navigate to="/login" replace />);
  const RoleRoute = ({ allowed, children }) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (allowed && !allowed.includes(userRole)) return <Navigate to="/" replace />;
    return children;
  };

    return (
    <Router>
      <div className="App" style={bgStyle}>
        <div className="overlay">
          {/* NAVBAR */}
          <header className="navbar">
            <div className="brand">
              <span className="dot" />
              BugHouse {userFirstName ? `· Hello, ${userFirstName}` : ''}
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
            {isLoggedIn && <h1 className="hero-title">Welcome to BugHouse</h1>}

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
