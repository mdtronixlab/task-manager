import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import { ToastProvider } from './context/ToastContext'
import App from './App'
import './styles/index.css'

// Registered unconditionally (not just on push opt-in, unlike
// usePushNotifications.js's own registration of the same file) — a
// browser only offers to install the app (usePwaInstall.js's
// `beforeinstallprompt`) once an active service worker is actually
// controlling the page. register() is idempotent for the same script URL,
// so this and usePushNotifications.js's later call just resolve to the
// same registration.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.error('Service worker registration failed:', err)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <BrandingProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrandingProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
