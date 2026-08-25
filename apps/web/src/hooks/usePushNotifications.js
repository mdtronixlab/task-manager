import { useCallback, useEffect, useState } from 'react'
import {
  getPushPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPushNotification,
} from '../services/api'

// Standard VAPID-key conversion — the Push API wants the applicationServerKey
// as a Uint8Array, the server hands it over as a URL-safe base64 string.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

const SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

/**
 * Push notification plumbing: permission + subscribe/unsubscribe + a manual
 * test send. Server-side triggers (the 8am/8:30/9am "add your task"
 * reminder) live in apps/api/src/services/taskReminderService.js and reuse
 * whatever subscription this hook creates — ProfileMenu also calls
 * `unsubscribe` on sign-out so a signed-out staff member stops getting
 * pinged to add a task they can't reach.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(SUPPORTED ? Notification.permission : 'unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!SUPPORTED) return
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch((err) => console.error('Failed to check push subscription status:', err))
  }, [])

  const subscribe = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        throw new Error('Notification permission was not granted.')
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const { publicKey } = await getPushPublicKey()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      await subscribeToPush(subscription.toJSON())
      setSubscribed(true)
    } catch (err) {
      setError(err.message || 'Could not enable push notifications.')
    } finally {
      setBusy(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        // Browser-side unsubscribe first. If this throws, we bail out with
        // `subscribed` still true — the previous order (server first) could
        // delete the server-side row and then fail here, leaving the UI
        // stuck claiming "subscribed" for a subscription the server had
        // already forgotten. Doing it this way round, the worst case is the
        // opposite: the browser unsubscribes but the server call below
        // fails, leaving one harmless orphaned row that sendToUser() prunes
        // automatically the next time a push to it 404s/410s.
        await subscription.unsubscribe()
        try {
          await unsubscribeFromPush(subscription.endpoint)
        } catch (err) {
          console.error('Failed to remove push subscription server-side:', err)
        }
      }
      setSubscribed(false)
    } catch (err) {
      setError(err.message || 'Could not disable push notifications.')
    } finally {
      setBusy(false)
    }
  }, [])

  const sendTest = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await sendTestPushNotification()
      return true
    } catch (err) {
      setError(err.message || 'Could not send test notification.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { supported: SUPPORTED, permission, subscribed, busy, error, subscribe, unsubscribe, sendTest }
}

export default usePushNotifications
