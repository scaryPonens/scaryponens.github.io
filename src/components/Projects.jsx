function Projects() {
  const projects = [
    // {
    //   title: 'Project One',
    //   description: 'A cool project description goes here.',
    //   tech: ['React', 'TypeScript', 'Vite'],
    // },
    // {
    //   title: 'Project Two',
    //   description: 'Another project description.',
    //   tech: ['JavaScript', 'CSS', 'HTML'],
    // },
    // {
    //   title: 'Project Three',
    //   description: 'Yet another project that showcases skills.',
    //   tech: ['Node.js', 'Express', 'MongoDB'],
    // },
  ]

  return (
    <section className="projects-section">
      <div className="section-container">
        <h2 className="section-title">Projects</h2>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <div key={index} className="project-card">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-tech">
                {project.tech.map((tech, techIndex) => (
                  <span key={techIndex} className="tech-tag">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Projects
