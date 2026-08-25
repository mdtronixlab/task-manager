import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={[
        'inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-on-surface-variant transition-colors hover:neu-sm hover:text-on-surface active:neu-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isDark ? (
        <Sun key="sun" className="size-4 animate-scale-in" aria-hidden="true" />
      ) : (
        <Moon key="moon" className="size-4 animate-scale-in" aria-hidden="true" />
      )}
    </button>
  )
}
