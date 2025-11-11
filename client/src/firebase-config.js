import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('❌ Missing Firebase API key. Did you create client/.env (next to package.json) and restart?');
  throw new Error('Firebase config is missing. Check client/.env');
}

// Ensure we only init once (hot reload friendly)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Ensure auth is fully initialized before the app renders:
 * - sets persistence
 * - waits one tick for the initial onAuthStateChanged to fire
 * Call this once before rendering your <App/>.
 */
export async function ensureAuthReady() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {

    console.warn('Auth persistence not applied:', e?.message || e);
  }
  await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}

export default app;
