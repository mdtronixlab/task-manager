import { useBranding } from '../context/BrandingContext'

// Falls back to a rounded-square check badge in the fixed --color-brand
// blue (styles/index.css) when no custom logo has been uploaded (Settings
// → Branding, Super Admin only). Reused wherever the app's mark appears
// (headers, LoginPage) so it stays one consistent icon everywhere at once.

/**
 * @param {{showWordmark?: boolean, size?: 'sm'|'md'|'lg', className?: string}} props
 */
export default function Logo({ showWordmark = true, size = 'md', className = '' }) {
  const { applicationName, logoUrl } = useBranding()
  const iconSize = { sm: 'size-6', md: 'size-7', lg: 'size-9' }[size]
  const wordmarkClass = { sm: 'text-body-sm', md: 'text-body-md', lg: 'text-body-lg' }[size]

  return (
    <div className={['flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={showWordmark ? '' : applicationName}
          className={`${iconSize} shrink-0 rounded-md object-contain`}
        />
      ) : (
        <svg
          viewBox="0 0 32 32"
          className={`${iconSize} shrink-0`}
          role={showWordmark ? undefined : 'img'}
          aria-label={showWordmark ? undefined : applicationName}
          aria-hidden={showWordmark ? true : undefined}
        >
          <rect width="32" height="32" rx="9" className="fill-brand" />
          <path
            d="M9.5 16.5l4 4 9-9"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {showWordmark && (
        <span className={`${wordmarkClass} font-headline font-semibold tracking-tight text-on-surface`}>
          {applicationName}
        </span>
      )}
    </div>
  )
}
