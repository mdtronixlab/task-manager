import { useCallback, useEffect, useState } from 'react'

// standalone display-mode (Android/desktop Chrome/Edge) or `navigator.standalone`
// (iOS Safari's own pre-standard flag) both mean "already installed, running
// as its own app" — checked once at mount since neither changes without a
// full relaunch of the installed app itself.
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

/**
 * Install-to-home-screen plumbing. Chrome/Edge/most Android browsers fire
 * `beforeinstallprompt` once the page qualifies (manifest.webmanifest +
 * sw.js registered — see index.html/main.jsx) — this captures that event
 * (the browser only lets it be triggered once, so it has to be stashed
 * rather than re-requested) and exposes `promptInstall()` to trigger the
 * browser's own install dialog from a menu item instead of the ignorable
 * mini-infobar Chrome shows by default.
 *
 * iOS Safari never fires `beforeinstallprompt` (no programmatic install API
 * at all) — `iosInstructions: true` lets ProfileMenu show manual "Share >
 * Add to Home Screen" copy instead of a button that would otherwise do
 * nothing on tap.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    if (installed) return undefined

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    function handleAppInstalled() {
      setDeferredPrompt(null)
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installed])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    // The prompt is one-shot regardless of the user's choice — clear it
    // either way so a dismissed prompt doesn't leave a dead "Install" item
    // that silently does nothing on a second click.
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return {
    canInstall: Boolean(deferredPrompt),
    installed,
    iosInstructions: isIos && !installed,
    promptInstall,
  }
}

export default usePwaInstall
