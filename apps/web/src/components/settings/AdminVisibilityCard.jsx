import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../Card'
import LoadingState from '../LoadingState'
import ErrorState from '../ErrorState'
import { useToast } from '../../context/ToastContext'
import { getAdminVisibility, setAdminVisibility } from '../../services/users'

/**
 * Settings > Visibility (Super Admin only). By default an Admin's org-wide
 * Tasks page only shows their own tasks and every Staff member's — not
 * other Admins' (taskService.js's getTasks). This card lets a Super Admin
 * grant that per pair: each row is one Admin, and the chips below their
 * name are every *other* Admin whose tasks they're currently allowed to see.
 * @param {{admins: object[]}} props Users already filtered to role ADMIN (SettingsPage).
 */
export default function AdminVisibilityCard({ admins }) {
  const { showToast } = useToast()
  const [grants, setGrants] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingKey, setSavingKey] = useState(null) // `${viewerId}:${targetId}` currently toggling

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGrants(await getAdminVisibility())
    } catch (err) {
      setError(err.message || 'Could not load visibility settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(viewer, target) {
    const current = grants[viewer.userId] || []
    const next = current.includes(target.userId)
      ? current.filter((id) => id !== target.userId)
      : [...current, target.userId]

    setSavingKey(`${viewer.userId}:${target.userId}`)
    // Optimistic — reverted in the catch below on failure.
    setGrants((prev) => ({ ...prev, [viewer.userId]: next }))
    try {
      await setAdminVisibility(viewer.userId, next)
    } catch (err) {
      setGrants((prev) => ({ ...prev, [viewer.userId]: current }))
      showToast(err.message || 'Could not update visibility. Please try again.', { tone: 'error' })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Visibility</CardTitle>
        <CardDescription>
          By default, an Admin only sees their own tasks and every Staff member&rsquo;s on the Tasks
          page — not other Admins&rsquo;. Turn on a chip below to let that row&rsquo;s Admin also see the
          named Admin&rsquo;s tasks there.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState label="Loading visibility settings…" />
        ) : error ? (
          <ErrorState description={error} onRetry={load} />
        ) : admins.length < 2 ? (
          <p className="text-body-sm text-on-surface-variant">
            Add at least two Admins to configure task visibility between them.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {admins.map((viewer) => {
              const others = admins.filter((a) => a.userId !== viewer.userId)
              const visible = grants[viewer.userId] || []
              return (
                <div key={viewer.userId} className="flex flex-col gap-1.5">
                  <span className="text-body-sm font-medium text-on-surface">{viewer.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {others.map((target) => {
                      const selected = visible.includes(target.userId)
                      const busy = savingKey === `${viewer.userId}:${target.userId}`
                      return (
                        <button
                          key={target.userId}
                          type="button"
                          onClick={() => toggle(viewer, target)}
                          disabled={busy}
                          aria-pressed={selected}
                          className={[
                            'rounded-md border px-2.5 py-1.5 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            selected
                              ? 'border-primary bg-tone-primary-bg text-tone-primary-text'
                              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest',
                          ].join(' ')}
                        >
                          {target.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
