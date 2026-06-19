import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '',
};

const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId;
const app = hasConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;

export { auth };

export async function signInWithGoogle() {
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Google sign-in failed' };
  }
}

export async function signInWithApple() {
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const provider = new OAuthProvider('apple.com');
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Apple sign-in failed' };
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Sign-in failed' };
  }
}

export async function signUpWithEmail(email: string, password: string) {
  if (!auth) return { user: null, error: 'Firebase not configured' };
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Sign-up failed' };
  }
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}
