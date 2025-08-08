import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from './firebase-config';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      console.log('🔍 Trying database login first...');
      
      // ✅ Check database first (for test users)
      const response = await axios.post('http://localhost:8000/api/auth/login-database-first', {
        email: email,
        password: password
      });

      if (response.data.success) {
        // Database login successful
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('userID', response.data.userID);

        setMessage('✅ Login successful!');
        
        setTimeout(() => {
          onLogin(response.data.role);
        }, 500);

        setIsLoading(false);
        return; // Exit - no need for Firebase
      }

    } catch (dbError) {
      // Database failed, try Firebase as backup
      console.log('Database login failed, trying Firebase...');
      
      try {
        // Firebase login (for real users)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
          setMessage('❌ Please verify your email before logging in.');
          setIsLoading(false);
          return;
        }

        // Check Firebase user in database
        const firebaseResponse = await axios.post('http://localhost:8000/api/auth/login', {
          email: user.email,
          firebaseUID: user.uid
        });

        localStorage.setItem('token', firebaseResponse.data.token);
        localStorage.setItem('role', firebaseResponse.data.role);
        localStorage.setItem('userID', firebaseResponse.data.userID);

        setMessage('✅ Firebase login successful!');
        
        setTimeout(() => {
          onLogin(firebaseResponse.data.role);
        }, 500);

      } catch (firebaseError) {
        console.error('Both login methods failed:', firebaseError);
        setMessage('❌ Invalid email or password. Please check your credentials.');
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2>🐛 Sign In to BugHouse</h2>
      
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="UTA Email (@mavs.uta.edu)" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          required 
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginBottom: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginBottom: '20px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        
        <button 
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '20px'
          }}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
      
     
      <div style={{ textAlign: 'center' }}>
        <p>Don't have an account?</p>
        <Link to="/signup">
          <button 
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create BugHouse Account
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Login;