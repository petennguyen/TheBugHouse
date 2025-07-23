import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
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
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required /><br /><br />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required /><br /><br />
        <button type="submit">Login</button>
      </form>
      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}

export default Login;
