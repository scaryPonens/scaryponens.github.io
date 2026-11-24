import { useState, useEffect } from 'react'

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      return stored === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }, [isDark])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setIsDark(!isDark)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden="true">◐</span>
      <span>Theme</span>
    </button>
  )
}

export default DarkModeToggle
