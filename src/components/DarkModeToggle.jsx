import { useState, useEffect } from 'react'

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      return stored === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Apply dark mode class to document root
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
      className="dark-mode-toggle"
      onClick={() => setIsDark(!isDark)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i className={isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
    </button>
  )
}

export default DarkModeToggle
