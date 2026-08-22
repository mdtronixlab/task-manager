// Firebase client — identity only (architecture.md §11). Firestore, Cloud
// Functions, and Firebase Hosting are explicitly out of scope; this file's
// only job is to obtain a signed Firebase ID token that the Express API
// verifies on every request (see services/api.js).

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** True once real Firebase Web SDK values have been filled into .env. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.appId,
)

// getAuth() throws synchronously ("auth/invalid-api-key") when apiKey is
// blank — verified locally (node --input-type=module repro). Calling it
// unconditionally at module scope would crash the entire app at import
// time, before AuthProvider/LoginPage ever get to render a helpful
// message. So: only initialize when the config looks real; every export
// below degrades gracefully to a no-op/rejection otherwise, and
// AuthContext surfaces `isFirebaseConfigured` as its own status so the
// login page can explain what's missing instead of showing a blank screen.
let auth = null
let googleProvider = null

if (isFirebaseConfigured) {
  const firebaseApp = initializeApp(firebaseConfig)
  auth = getAuth(firebaseApp)
  googleProvider = new GoogleAuthProvider()
  // Always show the account chooser rather than silently reusing whichever
  // Google account last signed in on this browser (rules.md §41 — staff
  // workflow should stay predictable, not "magically" pick an account).
  googleProvider.setCustomParameters({ prompt: 'select_account' })
}

export { auth }

/** Opens the Google sign-in popup. Resolves with the Firebase user. */
export function signInWithGoogle() {
  if (!auth) return Promise.reject(new Error('Firebase is not configured yet.'))
  return signInWithPopup(auth, googleProvider).then((result) => result.user)
}

export function signOut() {
  if (!auth) return Promise.resolve()
  return firebaseSignOut(auth)
}

/** @param {(user: import('firebase/auth').User | null) => void} callback */
export function subscribeToAuthState(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

/** Fresh Firebase ID token for the current user, or null if signed out. */
export function getIdToken(forceRefresh = false) {
  if (!auth?.currentUser) return Promise.resolve(null)
  return auth.currentUser.getIdToken(forceRefresh)
}
