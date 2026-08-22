import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { subscribeToAuthState, signInWithGoogle, signOut, isFirebaseConfigured } from '../services/auth'
import { getCurrentUser, ApiError } from '../services/api'

const AuthContext = createContext(null)

// prd.md §5 / architecture.md §11 — Firebase confirms *identity*; the
// backend then decides whether that identity may use the app (registered +
// active) and which role it has. `status` tracks progress through both
// steps so the UI never has to guess which one it's waiting on.
const STATUS = {
  LOADING: 'loading', // resolving Firebase's initial persisted session
  NOT_CONFIGURED: 'not-configured', // apps/web/.env is missing real Firebase Web SDK values
  SIGNED_OUT: 'signed-out',
  AUTHENTICATING: 'authenticating', // Firebase identity confirmed, verifying with the backend
  AUTHENTICATED: 'authenticated',
  ERROR: 'error',
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(isFirebaseConfigured ? STATUS.LOADING : STATUS.NOT_CONFIGURED)
  const [appUser, setAppUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setAppUser(null)
        setError(null)
        setStatus(STATUS.SIGNED_OUT)
        return
      }

      setStatus(STATUS.AUTHENTICATING)
      try {
        const user = await getCurrentUser()
        setAppUser(user)
        setError(null)
        setStatus(STATUS.AUTHENTICATED)
      } catch (err) {
        // Backend rejected this identity — unregistered email, disabled
        // account, or an invalid session (phases.md Phase 2 test cases).
        // Sign the Firebase session back out too, otherwise the browser
        // stays "signed in" to Firebase but can never reach the app.
        await signOut()
        setAppUser(null)
        setStatus(STATUS.ERROR)
        setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.')
      }
    })

    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) return
    setError(null)
    setStatus(STATUS.AUTHENTICATING)
    try {
      await signInWithGoogle()
      // subscribeToAuthState's callback above fires next and takes over.
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setStatus(STATUS.SIGNED_OUT)
        return
      }
      setStatus(STATUS.ERROR)
      setError('Google sign-in failed. Please try again.')
    }
  }, [])

  const signOutUser = useCallback(() => signOut(), [])

  const value = {
    status,
    appUser,
    error,
    isAuthenticated: status === STATUS.AUTHENTICATED,
    signIn,
    signOut: signOutUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
