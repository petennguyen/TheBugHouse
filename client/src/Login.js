import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from './firebase-config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { sendPasswordResetEmail } from 'firebase/auth';




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


  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('❌ Please enter your email first');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      if (email.includes('@mavs.uta.edu') || email.includes('@uta.edu')) {
        console.log('🔥 Sending Firebase password reset for:', email);
        
        // ✅ Add custom action code settings to reduce Outlook scanning
        const actionCodeSettings = {
          url: window.location.origin + '/login?message=password-reset-complete',
          // Handle the reset in the browser, not your app
          handleCodeInApp: false,
        };
        
        // Send password reset email with custom settings
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
        
        setMessage(`✅ Password reset email sent to ${email}!`);
        
      } else if (email.includes('@bughouse.edu')) {
        console.log('🗄️ Database user reset request for:', email);
        
        
      } 
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setMessage(`❌ No Firebase account found for ${email}

Please either:
• Sign up first if you're a new user  
• Use a test account like studentA@bughouse.edu`);
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('❌ Too many reset attempts. Please wait 15 minutes and try again.');
      } else {
        setMessage('❌ Failed to send reset email: ' + error.message);
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2>Sign In to The BugHouse</h2>
      
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
      
      {/* Forgot password button*/}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={handleForgotPassword}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Forgot Password?
        </button>
      </div>
      
      {message && (
        <div style={{
          padding: '12px',
          marginTop: '1rem',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          whiteSpace: 'pre-line'
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