import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

function VerifyEmail({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Verifying your email...');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setMessage('❌ Invalid verification link');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await axios.post('http://localhost:8000/api/auth/verify-email', {
          token
        });

        setMessage('✅ ' + res.data.message);
        setIsSuccess(true);

        // Auto-login user
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          onLogin();
        }, 3000);

      } catch (err) {
        setMessage('❌ ' + (err.response?.data?.message || 'Verification failed'));
      }
    };

    verifyEmail();
  }, [searchParams, onLogin]);

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
      <h2>Email Verification</h2>
      <p style={{ color: isSuccess ? 'green' : 'red' }}>
        {message}
      </p>
      {isSuccess && <p>Redirecting you to the app...</p>}
    </div>
  );
}

export default VerifyEmail;