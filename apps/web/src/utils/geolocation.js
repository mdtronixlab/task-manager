// Best-effort GPS fix for task completion (gps-on-task-completion plan) —
// never throws and never blocks completion. `navigator.geolocation` needs a
// secure context; both tasker.mdtronix.in (HTTPS) and localhost dev already
// qualify.

const TIMEOUT_MS = 8000

/**
 * @return {Promise<{completionLat?: number, completionLng?: number, completionAccuracy?: number}>}
 *   Empty object on denial, timeout, or an unsupported browser.
 */
export function getCompletionLocation() {
  if (!('geolocation' in navigator)) return Promise.resolve({})

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          completionLat: position.coords.latitude,
          completionLng: position.coords.longitude,
          completionAccuracy: position.coords.accuracy,
        })
      },
      () => resolve({}),
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 },
    )
  })
}
