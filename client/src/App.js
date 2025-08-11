import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
 import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          {isLoggedIn ? (
            <div>
              <h1>Welcome to BugHouse!</h1>
              <button onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/signup" element={<Signup />} />
              { <Route path="/" element={<Navigate to="/login" />} />}
            </Routes>
          )}
        </header>
      </div>
    </Router>
  );
}

export default App;
