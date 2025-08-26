import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from './firebase-config';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API });

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student'); // Student or Tutor
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [msg, setMsg] = useState('');
  const [type, setType] = useState('error'); // 'success' | 'error'
  const [loading, setLoading] = useState(false);

  // ----- Password requirement checks -----
  const checks = useMemo(() => {
    const p = password || '';
    return {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
      match: confirm.length > 0 && p === confirm,
    };
  }, [password, confirm]);

  const allReqs = checks.length && checks.upper && checks.lower && checks.number && checks.special;
  const canSubmit = allReqs && checks.match && !!name.trim() && !!email.trim() && !loading;

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setMsg('Please meet all password requirements and confirm your password.');
      setType('error');
      return;
    }

    const emailTrim = email.trim();
    if (!(emailTrim.endsWith('@mavs.uta.edu') || emailTrim.endsWith('@uta.edu'))) {
      setMsg('Please use your UTA email (@mavs.uta.edu or @uta.edu).');
      setType('error');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      // 1) Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, emailTrim, password);
      const user = cred.user;

      // 2) Save display name
      try { await updateProfile(user, { displayName: name.trim() }); } catch {}

      // 3) Send verification email
      try {
        await sendEmailVerification(user, {
          url: window.location.origin + '/login?message=verify-complete',
          handleCodeInApp: false,
        });
      } catch {}

      // 4) Pre-create DB record so first login is seamless (ignore 400 "already exists")
      try {
        await api.post('/api/auth/complete-signup', {
          firebaseUID: user.uid,
          name: name.trim(),
          email: user.email,
          role, // 'Student' or 'Tutor'
        });
      } catch (err) {
        if (err?.response?.status !== 400) {
          console.warn('complete-signup warning:', err?.response?.data || err.message);
        }
      }

      setMsg(`🎉 Account created! We sent a verification link to ${emailTrim}. Verify your email, then sign in.`);
      setType('success');
    } catch (error) {
      let text = 'Sign up failed.';
      if (error.code === 'auth/email-already-in-use') text = 'That email is already in use.';
      else if (error.code === 'auth/invalid-email') text = 'Invalid email address.';
      else if (error.code === 'auth/weak-password') text = 'Password is too weak.';
      setMsg(text);
      setType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-title">Create your BugHouse account</div>

        <form onSubmit={handleSignup} className="auth-actions" noValidate>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

          <input
            type="email"
            placeholder="UTA Email (@mavs.uta.edu)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {/* Password + requirements */}
          <div>
            <input
              type="password"
              placeholder="Password (min 8 chars, upper/lower/number/special)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              aria-describedby="pwd-reqs"
            />
            <ul id="pwd-reqs" className="pwd-reqs">
              <li className={checks.length ? 'ok' : ''}><span className="dot" /> At least 8 characters</li>
              <li className={checks.upper  ? 'ok' : ''}><span className="dot" /> One uppercase letter (A–Z)</li>
              <li className={checks.lower  ? 'ok' : ''}><span className="dot" /> One lowercase letter (a–z)</li>
              <li className={checks.number ? 'ok' : ''}><span className="dot" /> One number (0–9)</li>
              <li className={checks.special? 'ok' : ''}><span className="dot" /> One special character (!@#$…)</li>
            </ul>
          </div>

          {/* Confirm password + live match hint */}
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {confirm.length > 0 && (
              <div className={`match-hint ${checks.match ? 'match-ok' : 'match-bad'}`}>
                {checks.match ? '✅ Passwords match' : '❌ Passwords do not match'}
              </div>
            )}
          </div>

          <div className="form-row two">
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Student">Student</option>
              <option value="Tutor">Tutor</option>
            </select>

            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>

        {msg && <div className={`alert ${type}`}>{msg}</div>}

        <div className="auth-meta" style={{ marginTop: 14 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
