import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { auth } from './firebase-config';
import { createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, updateProfile } from 'firebase/auth';

function Signup({ onLogin }) {
  const [step, setStep] = useState('signup');
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

  // Add URL parameter handling
  const [searchParams] = useSearchParams();

  // Memoize handleEmailVerified to fix useEffect dependency
  const handleEmailVerified = useCallback(async (user) => {
    try {
      console.log('🔄 handleEmailVerified called with user:', user);
      console.log('🔄 firebaseUser state:', firebaseUser);
      
      // Get user data from state OR fallback to Firebase user info
      const userData = firebaseUser || {
        name: user.displayName || formData.name || 'Unknown User',
        role: formData.role || 'student',
        email: user.email
      };
      
      console.log('📤 Sending to complete-signup:', userData);

      // Send user data to your server for database storage
      const response = await axios.post('http://localhost:8000/api/auth/complete-signup', {
        firebaseUID: user.uid,
        name: userData.name,
        email: user.email,
        role: userData.role
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('userID', response.data.userID);
      
      setMessage('✅ Email verified! Logging you in...');
      
      setTimeout(() => {
        onLogin(response.data.role);
      }, 1000);
      
    } catch (error) {
      console.error('Complete signup error:', error);
      setMessage('❌ Verification failed: ' + (error.response?.data?.message || error.message));
    }
  }, [firebaseUser, formData.name, formData.role, onLogin]); // ✅ Add dependencies

  // ✅ Handle verification redirect - now handleEmailVerified is properly memoized
  useEffect(() => {
    const verified = searchParams.get('verified');
    
    if (verified === 'true') {
      setMessage('✅ Email verification successful! Completing your account setup...');
      setStep('verify');
      
      // Complete signup for verified user
      setTimeout(async () => {
        if (auth.currentUser && auth.currentUser.emailVerified) {
          console.log('✅ User returned from email verification!');
          await handleEmailVerified(auth.currentUser);
        }
      }, 2000);
    }
  }, [searchParams, handleEmailVerified]); // ✅ Now properly includes handleEmailVerified

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
      
      // ✅ Add custom action code settings for email verification
      const actionCodeSettings = {
        // URL user will be redirected to after clicking verification link
        url: window.location.origin + '/signup?verified=true',
        // Handle the verification in the browser, not your app
        handleCodeInApp: false,
      };
      
      // Send verification email with custom settings to reduce Outlook scanning
      await sendEmailVerification(user, actionCodeSettings);
      console.log('✅ Verification email sent with custom redirect!');
      
      // Store user info for later verification
      setFirebaseUser({ uid: user.uid, email: user.email, name, role });
      
      setMessage(`✅ Account created! Please check your email for verification link.`);
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.emailVerified) {
          console.log('✅ Email verified via auth state listener!');
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

    setTimeout(() => {
      clearInterval(checkInterval);
      unsubscribe();
    }, 600000);
  };


  if (step === 'verify') {
    return (
      <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
        <h2> Check Your Email</h2>
        
        <div style={{ 
          backgroundColor: '#000000ff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #000000ff'
        }}>
          <p><strong>We sent a verification link to:</strong></p>
          <p style={{ 
            backgroundColor: '#000000ff', 
            padding: '10px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            color: '#1976d2',
            wordBreak: 'break-all'
          }}>
            {formData.email}
          </p>
          
          <div style={{ marginTop: '15px' }}>
            <p><strong>📧 What to do:</strong></p>
            <ol style={{ paddingLeft: '20px' }}>
              <li>Check your email inbox (and spam folder)</li>
              <li>Look for an email from Firebase</li>
              <li>Click the "Verify Email" link</li>
            </ol>
          </div>
          
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#000000ff',
            border: '1px solid #2f2c23ff',
            borderRadius: '4px'
          }}>
          </div>
        </div>

        {/* ✅ Automatic detection indicator */}
        <div style={{ 
          textAlign: 'center', 
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#000000ff',
          border: '1px solid #090909ff',
          borderRadius: '4px'
        }}>
        </div>

        <button
          onClick={() => {
            setStep('signup');
            setMessage('');
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'transparent',
            color: '#037623ff',
            border: '1px solid #037b2fff',
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