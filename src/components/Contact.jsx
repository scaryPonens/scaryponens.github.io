function Contact() {
  const links = [
    { name: 'GitHub', url: 'https://github.com/scaryponens', icon: 'fa-brands fa-github' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/reubenpeterpaul/', icon: 'fa-brands fa-linkedin' },
    { name: 'Email', url: 'mailto:reuben.peterpaul@protonmail.com', icon: 'fa-solid fa-envelope' },
  ]

  return (
    <section className="links-section">
      <div className="section-container">
        <h2 className="section-title">Links</h2>
        <div className="links-list">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              className="link-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className={link.icon}></i>
              <span>{link.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Contact