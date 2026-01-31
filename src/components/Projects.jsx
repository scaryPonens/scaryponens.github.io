import { useState, useEffect } from 'react'

function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/projects/manifest.json')
      .then(res => res.json())
      .then(data => {
        setProjects(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading projects manifest:', err)
        setLoading(false)
      })
  }, [])

  if (loading || projects.length === 0) {
    return null
  }

  return (
    <section className="projects-section">
      <div className="section-container">
        <h2 className="section-title">Projects</h2>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <a 
              key={index} 
              href={`/projects/${project.filename}`}
              className="project-card"
            >
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.excerpt}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Projects
