import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage('❌ Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setMessage('❌ Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:8000/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      setMessage('✅ ' + res.data.message);
      
      // Clear form on success
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
      });

    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Signup failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          type="email"
          name="email"
          placeholder="School Email (must end with .edu)"
          value={formData.email}
          onChange={handleChange}
          required
        /><br /><br />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="student">Student</option>
          <option value="tutor">Tutor</option>
        </select><br /><br />

        <input
          type="password"
          name="password"
          placeholder="Create Password (min 6 characters)"
          value={formData.password}
          onChange={handleChange}
          required
        /><br /><br />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        /><br /><br />

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: isLoading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      
      {message && (
        <p style={{ 
          color: message.includes('✅') ? 'green' : 'red',
          marginTop: '1rem',
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
      
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
}

export default Signup;