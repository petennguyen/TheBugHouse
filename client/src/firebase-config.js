// client/src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Helpful guard so the app doesn't white-screen silently
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.error('❌ Missing Firebase API key. Did you create client/.env and restart?');
  throw new Error('Firebase config is missing. Check client/.env');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// optional: keep users signed in
setPersistence(auth, browserLocalPersistence).catch(() => {});

export default app;
