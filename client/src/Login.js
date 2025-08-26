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
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('error'); // 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);

  const finishLogin = (payload) => {
    if (payload?.token) localStorage.setItem('token', payload.token);
    if (payload?.role) localStorage.setItem('role', payload.role);
    if (payload?.userID) localStorage.setItem('userID', payload.userID);
    if (typeof onLogin === 'function') onLogin(payload.role);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setMsg('Please enter both email and password.');
      setMsgType('error');
      return;
    }

    setIsLoading(true);
    setMsg('');

    // 1) DB-first (seeded users)
    try {
      const dbRes = await api.post('/api/auth/login-database-first', {
        email: emailTrim,
        password,
      });
      if (dbRes?.data?.success) {
        setMsg('Login successful!');
        setMsgType('success');
        finishLogin(dbRes.data);
        return;
      }
    } catch (dbErr) {
      const status = dbErr?.response?.status;
      if (status && status !== 401) {
        setMsg('Login failed. Please try again later.');
        setMsgType('error');
        setIsLoading(false);
        return;
      }
      // 401 → not a DB user → try Firebase
    }

    // 2) Firebase login
    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrim, password);
      const user = cred.user;

      if (!user.emailVerified) {
        setMsg('Please verify your email before logging in.');
        setMsgType('error');
        return;
      }

      // 3) Backend login by email/uid
      try {
        const fbRes = await api.post('/api/auth/login', {
          email: user.email,
          firebaseUID: user.uid,
        });
        setMsg('Login successful!');
        setMsgType('success');
        finishLogin(fbRes.data);
        return;
      } catch (loginErr) {
        // 4) If user not in DB yet, auto complete-signup
        if (loginErr?.response?.status === 401) {
          const derivedName =
            user.displayName ||
            emailTrim.replace(/@.*/, '').replace(/[._-]+/g, ' ') ||
            'New User';

          const csRes = await api.post('/api/auth/complete-signup', {
            firebaseUID: user.uid,
            name: derivedName,
            email: user.email,
            role: 'Student',
          });
          setMsg('Welcome! Your account is ready.');
          setMsgType('success');
          finishLogin(csRes.data);
          return;
        }
        setMsg('Login failed after verification. Please try again.');
        setMsgType('error');
      }
    } catch (fbErr) {
      setMsg('Invalid email or password. If you just verified, refresh and try again.');
      setMsgType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMsg('Please enter your email first.');
      setMsgType('error');
      return;
    }
    setIsLoading(true);
    setMsg('');

    try {
      if (email.includes('@mavs.uta.edu') || email.includes('@uta.edu')) {
        const actionCodeSettings = {
          url: window.location.origin + '/login?message=password-reset-complete',
          handleCodeInApp: false,
        };
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
        setMsg(`Password reset email sent to ${email.trim()}.`);
        setMsgType('success');
      } else if (email.includes('@bughouse.edu')) {
        setMsg('For @bughouse.edu test accounts, ask an admin to reset your password.');
        setMsgType('error');
      } else {
        setMsg('Please use your UTA email or a test @bughouse.edu account.');
        setMsgType('error');
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setMsg(`No Firebase account found for ${email}. Sign up first or use a test account like studentA@bughouse.edu.`);
      } else if (err.code === 'auth/too-many-requests') {
        setMsg('Too many reset attempts. Please wait 15 minutes and try again.');
      } else {
        setMsg('Failed to send reset email: ' + err.message);
      }
      setMsgType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-title">Sign in to The BugHouse</div>

        <form onSubmit={handleLogin} noValidate className="auth-actions">
          <input
            type="email"
            placeholder="UTA Email (@mavs.uta.edu)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn success" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-meta">
          <button type="button" className="link-inline" onClick={handleForgotPassword} disabled={isLoading}>
            Forgot password?
          </button>
        </div>

        {msg && <div className={`alert ${msgType}`}>{msg}</div>}

        <div className="auth-meta" style={{ marginTop: 14 }}>
          Don’t have an account?
        </div>
        <Link to="/signup">
          <button className="btn primary" style={{ width: '100%' }}>Create BugHouse Account</button>
        </Link>
      </div>
    </div>
  );
}

export default Login;
