import { useEffect } from 'react'
import Header from './components/Header'
import About from './components/About'
import Projects from './components/Projects'
import BlogList from './components/BlogList'
import Contact from './components/Contact'
import DarkModeToggle from './components/DarkModeToggle'
import './styles/components.css'

function App() {
  useEffect(() => {
    // Initialize dark mode on mount
    const stored = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (stored === 'true' || (stored === null && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="app">
      <DarkModeToggle />
      <div className="content">
        <Header />
        <About />
        <BlogList />
        <Projects />
        <Contact />
      </div>
    </div>
  )
}

export default App
