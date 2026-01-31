import { useState, useEffect } from 'react'
import Header from './components/Header'
import About from './components/About'
import Projects from './components/Projects'
import BlogList from './components/BlogList'
import Contact from './components/Contact'
import './styles/components.css'

function App() {
  return (
    <div className="app">
      <div className="crt-screen">
        <div className="scanlines"></div>
        <div className="content">
          <Header />
          <About />
          <BlogList />
          <Projects />
          <Contact />
        </div>
      </div>
    </div>
  )
}

export default App
