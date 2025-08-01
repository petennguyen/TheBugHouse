import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);

      onLogin(); // call parent to redirect or reload
    } catch (err) {
      setMessage('❌ Login failed. Check credentials.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Sign In</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Login
        </button>
      </form>
      
      {message && <p style={{ color: 'red', textAlign: 'center' }}>{message}</p>}
      
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <p>Don't have an account?</p>
        <Link to="/signup">
          <button 
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            Create Account
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Login;