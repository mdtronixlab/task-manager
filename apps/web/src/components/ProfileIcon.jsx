import { useState } from 'react'

const SIZE_CLASSES = {
  sm: 'size-7 text-label-md',
  md: 'size-9 text-body-sm',
}

/**
 * Rounded avatar. Falls back to an initial on a tinted circle when there's
 * no avatar URL yet — e.g. before the account's first authenticated
 * request has synced one from the Google profile (see profileUpdates in
 * apps/api/src/middleware/auth.js) — or if the image fails to load.
 *
 * @param {{name?: string, avatarUrl?: string, size?: 'sm'|'md', className?: string}} props
 */
export default function ProfileIcon({ name, avatarUrl, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false)
  const label = name ? `${name}'s profile photo` : 'Profile photo'
  const initial = name?.trim()?.[0]?.toUpperCase() || '?'

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        onError={() => setImgError(true)}
        className={[SIZE_CLASSES[size], 'shrink-0 rounded-full object-cover', className].filter(Boolean).join(' ')}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={[
        SIZE_CLASSES[size],
        'inline-flex shrink-0 items-center justify-center rounded-full bg-tone-primary-bg font-label font-medium text-tone-primary-text',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {initial}
    </span>
  )
}
