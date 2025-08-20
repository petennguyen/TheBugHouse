import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Signup from './Signup';
import bg from './assets/uta.jpg';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setUserRole] = useState('');
  const [userFirstName, setUserFirstName] = useState('');

  // fetch profile helper
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUserFirstName('');
        return;
      }
      const res = await axios.get('http://localhost:8000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const u = res.data.user || {};
      setUserFirstName(u.userFirstName || u.firstName || '');
    } catch (err) {
      console.error('fetchProfile error', err);
      setUserFirstName('');
    }
  };

  // call on app load if logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      fetchProfile();
    }
  }, []);

  // call after login
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

  return (
    <Router>
      <div className="App" style={bgStyle}>
        <div className="overlay">
          <header className="App-header">
            {isLoggedIn ? (
              <div>
                <h1>Welcome to BugHouse{userFirstName ? `, ${userFirstName}` : ''}!</h1>
                <button onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <Routes>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
                { <Route path="/" element={<Navigate to="/login" />} />}
              </Routes>
            )}
          </header>
          {/* rest of app */}
        </div>
      </div>
    </Router>
  );
}

export default App;
