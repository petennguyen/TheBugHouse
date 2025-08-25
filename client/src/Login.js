import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from './firebase-config';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API });

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const finishLogin = (payload) => {
    if (payload?.token) localStorage.setItem('token', payload.token);
    if (payload?.role) localStorage.setItem('role', payload.role);
    if (payload?.userID) localStorage.setItem('userID', payload.userID);
    if (typeof onLogin === 'function') onLogin(payload.role);
    // else: you can redirect: window.location.href = '/';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return; // guard against double-clicks
    setMessage('');

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setMessage('❌ Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      // 1) DB-first (seeded test users)
      const dbRes = await api.post('/api/auth/login-database-first', {
        email: emailTrim,
        password,
      });

      if (dbRes?.data?.success) {
        finishLogin(dbRes.data);
        return;
      }
      // If API ever returns success=false without 401, fall through to Firebase
    } catch (dbErr) {
      const status = dbErr?.response?.status;
      if (status && status !== 401) {
        console.error('DB login error:', dbErr?.response?.data || dbErr.message);
        setMessage('❌ Login failed. Please try again later.');
        return;
      }
      // status === 401 -> not a DB user; try Firebase next
    }

    try {
      // 2) Firebase login
      const cred = await signInWithEmailAndPassword(auth, emailTrim, password);
      const user = cred.user;

      if (!user.emailVerified) {
        setMessage('❌ Please verify your email before logging in.');
        return;
      }

      // 3) Backend login by email/uid
      try {
        const fbRes = await api.post('/api/auth/login', {
          email: user.email,
          firebaseUID: user.uid,
        });
        finishLogin(fbRes.data);
        return;
      } catch (loginErr) {
        // 4) If the user isn't in DB yet, complete signup then finish
        if (loginErr?.response?.status === 401) {
          const derivedName =
            user.displayName ||
            emailTrim.replace(/@.*/, '').replace(/[._-]+/g, ' ') ||
            'New User';

          const csRes = await api.post('/api/auth/complete-signup', {
            firebaseUID: user.uid,
            name: derivedName,
            email: user.email,
            role: 'Student', // change if you add a role picker
          });

          // complete-signup returns a token/role/userID already
          finishLogin(csRes.data);
          return;
        }
        console.error('Firebase-backed login error:', loginErr?.response?.data || loginErr.message);
        setMessage('❌ Login failed after verification. Please try again.');
      }
    } catch (fbErr) {
      console.error('Firebase sign-in error:', fbErr);
      setMessage('❌ Invalid email or password. If you just verified, refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage('❌ Please enter your email first.');
      return;
    }
    setIsLoading(true);
    setMessage('');

    try {
      if (email.includes('@mavs.uta.edu') || email.includes('@uta.edu')) {
        const actionCodeSettings = {
          url: window.location.origin + '/login?message=password-reset-complete',
          handleCodeInApp: false,
        };
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
        setMessage(`✅ Password reset email sent to ${email.trim()}!`);
      } else if (email.includes('@bughouse.edu')) {
        // You can add a DB reset flow here if desired
        setMessage('ℹ️ For @bughouse.edu test accounts, ask an admin to reset your password.');
      } else {
        setMessage('ℹ️ Please use your UTA email or a test @bughouse.edu account.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        setMessage(
          `❌ No Firebase account found for ${email}\n\n` +
            'Please either:\n• Sign up first if you are a new user\n• Use a test account like studentA@bughouse.edu'
        );
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('❌ Too many reset attempts. Please wait 15 minutes and try again.');
      } else {
        setMessage('❌ Failed to send reset email: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2>Sign In to The BugHouse</h2>

      <form onSubmit={handleLogin} noValidate>
        <input
          type="email"
          placeholder="UTA Email (@mavs.uta.edu)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid #ddd',
            borderRadius: '4px',
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
            marginBottom: '12px',
          }}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Forgot Password?
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '12px',
            marginTop: '1rem',
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
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
              cursor: 'pointer',
            }}
          >
            Create BugHouse Account
          </button>
        </Link>
      </div>

      <p style={{ marginTop: '1rem', fontSize: 12, color: '#666', textAlign: 'center' }}>
        API: <code>{API}</code>
      </p>
    </div>
  );
}

export default Login;
