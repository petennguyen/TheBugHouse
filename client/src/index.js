// client/src/index.js
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ensureAuthReady } from './firebase-config';

function Boot() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureAuthReady();
        setReady(true);
      } catch (e) {
        setErr(e);
      }
    })();
  }, []);

  if (err) return <pre style={{ padding: 16, whiteSpace: 'pre-wrap' }}>{String(err)}</pre>;
  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;
  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Boot />);
