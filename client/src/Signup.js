import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { auth } from './firebase-config';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, updateProfile } from 'firebase/auth';

function Signup({ onLogin }) {
  const [step, setStep] = useState('signup'); // 'signup' or 'verify'
  const [firebaseUser, setFirebaseUser] = useState(null);
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

    const { name, email, password, confirmPassword, role } = formData;

    // Validate UTA email domain
    if (!email.endsWith('@mavs.uta.edu')) {
      setMessage('❌ Please use your UTA email address (@mavs.uta.edu)');
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('❌ Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setMessage('❌ Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔧 Creating user with Firebase client...');
      
      // Create user with Firebase client-side SDK
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase user created:', user.uid);
      
      // Update user profile
      await updateProfile(user, {
        displayName: name
      });
      
      // Send verification email (Firebase handles this automatically)
      await sendEmailVerification(user);
      console.log('✅ Verification email sent!');
      
      // Store user info for later verification
      setFirebaseUser({ uid: user.uid, email: user.email, name, role });
      
      setMessage('✅ Account created! Please check your email for verification link.');
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.emailVerified) {
          console.log('✅ Email verified!');
          unsubscribe();
          await handleEmailVerified(currentUser);
        }
      });
      
      setTimeout(() => {
        setStep('verify');
        startVerificationCheck(user.uid, unsubscribe);
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      setMessage('❌ ' + (error.message || 'Signup failed'));
    }

    setIsLoading(false);
  };

  const startVerificationCheck = (uid, unsubscribe) => {
    const checkInterval = setInterval(async () => {
      try {
        // Reload user to get latest emailVerified status
        await auth.currentUser?.reload();
        
        if (auth.currentUser?.emailVerified) {
          clearInterval(checkInterval);
          unsubscribe();
          await handleEmailVerified(auth.currentUser);
        }
      } catch (error) {
        console.error('Verification check error:', error);
      }
    }, 3000);

    // Stop checking after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      unsubscribe();
    }, 600000);
  };

  const handleEmailVerified = async (user) => {
    try {
      // Send user data to your server for database storage
      const response = await axios.post('http://localhost:8000/api/auth/complete-signup', {
        firebaseUID: user.uid,
        name: firebaseUser.name,
        email: user.email,
        role: firebaseUser.role
      });

      localStorage.setItem('token', response.data.token);
      setMessage('✅ Email verified! Logging you in...');
      
      setTimeout(() => {
        onLogin(response.data.role);
      }, 1000);
      
    } catch (error) {
      console.error('Complete signup error:', error);
      setMessage('❌ Verification failed: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleManualCheck = async () => {
    if (!firebaseUser) {
      setMessage('❌ No signup data found. Please try signing up again.');
      return;
    }
    
    setIsLoading(true);
    setMessage('🔍 Checking verification status...');
    
    try {
      // Reload the current user to get latest verification status
      if (auth.currentUser) {
        await auth.currentUser.reload();
        
        if (auth.currentUser.emailVerified) {
          console.log('✅ Email verified via manual check!');
          await handleEmailVerified(auth.currentUser);
        } else {
          setMessage('❌ Email not verified yet. Please check your email and click the verification link first.');
        }
      } else {
        setMessage('❌ No user session found. Please try signing up again.');
      }
    } catch (error) {
      console.error('Manual check error:', error);
      setMessage('❌ Failed to check verification status: ' + error.message);
    }
    
    setIsLoading(false);
  };

  if (step === 'verify') {
    return (
      <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
        <h2>🔥 Check Your Email</h2>
        <div style={{ 
          backgroundColor: '#000000ff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <p><strong>We sent a verification link to:</strong></p>
          <p style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '10px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            color: '#1976d2'
          }}>
            {formData.email}
          </p>
          
          <div style={{ marginTop: '15px' }}>
            <p><strong>📧 What to do:</strong></p>
            <ol style={{ paddingLeft: '20px' }}>
              <li>Check your email inbox</li>
              <li>Look for an email from Firebase</li>
              <li>Click the "Verify Email" link</li>
              <li>Return to this page - we'll detect it automatically!</li>
            </ol>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔄 Waiting for email verification...</div>
          <small>We're automatically checking every few seconds</small>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '10px'
          }}
        >
          {isLoading ? 'Checking...' : '✅ I Clicked the Link - Check Now'}
        </button>

        <button
          onClick={() => setStep('signup')}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'transparent',
            color: '#007bff',
            border: '1px solid #007bff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to Signup
        </button>

        {message && (
          <div style={{
            padding: '10px',
            marginTop: '10px',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2> Create BugHouse Account</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="email"
          name="email"
          placeholder="UTA Email (@mavs.uta.edu)"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="password"
          name="password"
          placeholder="Password (min 6 characters)"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        >
          <option value="student">Student</option>
          <option value="tutor">Tutor</option>
        </select>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Creating Account...' : 'Create Account with Firebase'}
        </button>
      </form>

      {message && (
        <div style={{
          padding: '10px',
          marginTop: '10px',
          backgroundColor: message.includes('✅') ? '#2ac04dff' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Signup;