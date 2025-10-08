import React, { useState, useEffect } from 'react';
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
  const [msgType, setMsgType] = useState('error');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);

  useEffect(() => {
    // Card slide-up animation on mount
    setTimeout(() => setIsCardVisible(true), 100);
  }, []);

  // Inline SVG icons for password visibility
  const Eye = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeOff = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.04"/>
      <path d="M1 1l22 22"/>
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-3.22 4.31"/>
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/>
    </svg>
  );

  // Blue Bug SVG for the login card icon
  const BlueBugIcon = () => (
    <svg width="24" height="24" viewBox="0 0 100 100">
      {/* Bug body - blue primary */}
      <ellipse cx="50" cy="55" rx="18" ry="25" fill="#0b61ff" />
      
      {/* Bug head - lighter blue */}
      <circle cx="50" cy="32" r="13" fill="#3b82f6" />
      
      {/* Antennae - orange accents */}
      <line x1="44" y1="22" x2="40" y2="15" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="22" x2="60" y2="15" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="15" r="2" fill="#f97316" />
      <circle cx="60" cy="15" r="2" fill="#f97316" />
      
      {/* Eyes */}
      <circle cx="46" cy="30" r="2.5" fill="white" />
      <circle cx="54" cy="30" r="2.5" fill="white" />
      <circle cx="46" cy="30" r="1" fill="black" />
      <circle cx="54" cy="30" r="1" fill="black" />
      
      {/* Wings - blue with orange patterns */}
      <ellipse cx="35" cy="45" rx="8" ry="15" fill="#60a5fa" opacity="0.8" transform="rotate(-15 35 45)" />
      <ellipse cx="65" cy="45" rx="8" ry="15" fill="#60a5fa" opacity="0.8" transform="rotate(15 65 45)" />
      <ellipse cx="35" cy="42" rx="3" ry="6" fill="#f97316" opacity="0.9" transform="rotate(-15 35 42)" />
      <ellipse cx="65" cy="42" rx="3" ry="6" fill="#f97316" opacity="0.9" transform="rotate(15 65 42)" />
      
      {/* Legs - blue */}
      <line x1="40" y1="65" x2="30" y2="75" stroke="#0b61ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="75" x2="30" y2="85" stroke="#0b61ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="65" x2="70" y2="75" stroke="#0b61ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="75" x2="70" y2="85" stroke="#0b61ff" strokeWidth="2" strokeLinecap="round" />
      
      {/* Smile - orange */}
      <path d="M 46 34 Q 50 38 54 34" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      
      {/* Body spots - orange */}
      <circle cx="47" cy="50" r="2" fill="#f97316" opacity="0.8" />
      <circle cx="53" cy="60" r="1.5" fill="#f97316" opacity="0.8" />
    </svg>
  );

  // Animated Bug SVG Component (orange primary color for visibility)
  const AnimatedBug = () => (
    <div className="floating-bug">
      <svg width="120" height="120" viewBox="0 0 140 140" className="bug-svg">
        {/* Bug body - orange primary */}
        <ellipse cx="70" cy="75" rx="30" ry="40" fill="#f97316" className="bug-body" />
        
        {/* Bug head - lighter orange circle */}
        <circle cx="70" cy="40" r="22" fill="#fb923c" className="bug-head" />
        
        {/* Antennae - blue accents */}
        <line x1="60" y1="25" x2="55" y2="15" stroke="#0b61ff" strokeWidth="4" strokeLinecap="round" />
        <line x1="80" y1="25" x2="85" y2="15" stroke="#0b61ff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="55" cy="15" r="4" fill="#0b61ff" />
        <circle cx="85" cy="15" r="4" fill="#0b61ff" />
        
        {/* Eyes - white with black pupils */}
        <circle cx="63" cy="37" r="5" fill="white" />
        <circle cx="77" cy="37" r="5" fill="white" />
        <circle cx="63" cy="37" r="2.5" fill="black" />
        <circle cx="77" cy="37" r="2.5" fill="black" />
        
        {/* Wings - semi-transparent orange/blue */}
        <ellipse cx="40" cy="60" rx="15" ry="25" fill="#fb923c" opacity="0.8" transform="rotate(-20 40 60)" className="wing-left" />
        <ellipse cx="100" cy="60" rx="15" ry="25" fill="#fb923c" opacity="0.8" transform="rotate(20 100 60)" className="wing-right" />
        
        {/* Wing patterns - blue accents */}
        <ellipse cx="40" cy="55" rx="6" ry="10" fill="#0b61ff" opacity="0.9" transform="rotate(-20 40 55)" />
        <ellipse cx="100" cy="55" rx="6" ry="10" fill="#0b61ff" opacity="0.9" transform="rotate(20 100 55)" />
        
        {/* Legs - orange darker */}
        <line x1="45" y1="85" x2="30" y2="100" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
        <line x1="45" y1="100" x2="30" y2="115" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
        <line x1="95" y1="85" x2="110" y2="100" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
        <line x1="95" y1="100" x2="110" y2="115" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
        
        {/* Smile - blue curve */}
        <path d="M 63 43 Q 70 50 77 43" stroke="#0b61ff" strokeWidth="3" fill="none" strokeLinecap="round" />
        
        {/* Body spots - blue decorations */}
        <circle cx="62" cy="70" r="4" fill="#0b61ff" opacity="0.9" />
        <circle cx="78" cy="80" r="3" fill="#0b61ff" opacity="0.9" />
        <circle cx="68" cy="95" r="3.5" fill="#0b61ff" opacity="0.9" />
        
        {/* Extra stripes for more visibility */}
        <ellipse cx="70" cy="65" rx="20" ry="3" fill="#ea580c" opacity="0.8" />
        <ellipse cx="70" cy="80" rx="18" ry="3" fill="#ea580c" opacity="0.8" />
      </svg>
    </div>
  );

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
    <div className="auth-wrap enhanced-auth">
      {/* Floating background shapes */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Animated Bug - orange and larger */}
      <AnimatedBug />

      {/* Enhanced card with proper sizing */}
      <div className={`card auth-card enhanced-card login-card ${isCardVisible ? 'visible' : ''}`}>
        {/* Enhanced header with BLUE bug icon */}
        <div className="auth-header">
          <div className="bug-icon blue-bug-icon">
            <BlueBugIcon />
          </div>
          <div className="auth-title gradient-text">Sign in to The BugHouse</div>
          <div className="muted">Welcome back to your learning journey</div>
        </div>

        {/* Enhanced form with proper sizing */}
        <form onSubmit={handleLogin} noValidate className="auth-actions enhanced-form">
          <div className="input-group">
            <label className="input-label">UTA Email (@mavs.uta.edu)</label>
            <input
              type="email"
              placeholder="your.email@mavs.uta.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="login-input"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="login-input"
              />
              <button
                type="button"
                className="eye-btn enhanced-eye"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? EyeOff : Eye}
              </button>
            </div>
          </div>

          <button type="submit" className="btn success enhanced-btn login-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-content">
                <span className="spinner"></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-meta">
          <button type="button" className="link-inline enhanced-link" onClick={handleForgotPassword} disabled={isLoading}>
            Forgot password?
          </button>
        </div>

        {msg && <div className={`alert ${msgType} enhanced-alert`}>{msg}</div>}

        <div className="auth-footer" style={{ textAlign: 'center' }}>
          <div className="auth-meta">Don't have an account?</div>
          <Link to="/signup">
            <button className="btn primary enhanced-btn-secondary login-signup-btn">Create BugHouse Account</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;