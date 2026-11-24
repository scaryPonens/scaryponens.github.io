import { useEffect } from 'react'
import Header from './components/Header'
import Now from './components/Now'
import Radar from './components/Radar'
import BlogList from './components/BlogList'
import Projects from './components/Projects'
import Contact from './components/Contact'
import './styles/components.css'

function App() {
  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (stored === 'true' || (stored === null && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className="app">
      <div className="content">
        <Header />
        <main>
          <Now />
          <Radar />
          <BlogList />
          <Projects />
        </main>
        <Contact />
      </div>
    </div>
  )
}

export default App
