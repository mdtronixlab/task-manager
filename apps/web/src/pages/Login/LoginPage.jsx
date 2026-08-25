import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card, CardContent } from '../../components/Card'
import Button from '../../components/Button'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'

// prd.md §5 — Google is the only sign-in method. No password field, no
// "forgot password" link: rules.md §11 explicitly forbids custom password
// authentication.
export default function LoginPage() {
  const { status, error, signIn } = useAuth()
  const location = useLocation()

  if (status === 'authenticated') {
    const from = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Logo size="lg" />
            <h1 className="text-headline-md font-headline text-on-surface">Sign in to continue</h1>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Use your organisation Google account.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="w-full rounded-md bg-tone-error-bg px-3 py-2 text-body-sm text-tone-error-text"
            >
              {error}
            </p>
          )}

          {status === 'not-configured' && (
            <p
              role="alert"
              className="w-full rounded-md bg-tone-warning-bg px-3 py-2 text-body-sm text-tone-warning-text"
            >
              Firebase isn&rsquo;t configured yet. Add the Web SDK values (API key, auth domain, app
              ID) from the Firebase console to <code>apps/web/.env</code>, then restart the dev
              server.
            </p>
          )}

          <Button
            fullWidth
            size="lg"
            disabled={status === 'not-configured'}
            loading={status === 'authenticating'}
            loadingText="Signing in…"
            onClick={signIn}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.86.92 7.51 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
