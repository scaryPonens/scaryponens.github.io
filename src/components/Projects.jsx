import { useState, useEffect } from 'react'

function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/projects/manifest.json?v=${__BUILD_ID__}`)
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
    <>
      <hr className="section-rule" />
      <section className="editorial-section" id="projects" aria-labelledby="projects-heading">
        <p className="section-kicker">03 / PROJECTS</p>
        <h2 id="projects-heading" className="section-heading">Built things &amp; experiments.</h2>
        <div className="projects-list">
          {projects.map((project, index) => {
            const metaText = [project.year, project.stack].filter(Boolean).join(' · ')
            return (
              <a
                key={project.slug || index}
                href={`/projects/${project.filename}`}
                className="project-row"
              >
                <div className="project-header">
                  <h3 className="project-title">{project.title}</h3>
                  {metaText && <span className="project-meta">{metaText}</span>}
                </div>
                <p className="project-description">{project.excerpt}</p>
              </a>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default Projects
