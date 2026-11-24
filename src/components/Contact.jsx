function Contact() {
  const links = [
    { name: 'GitHub', url: 'https://github.com/scaryponens', icon: 'fa-brands fa-github', external: true },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/reubenpeterpaul/', icon: 'fa-brands fa-linkedin', external: true },
    { name: 'Email', url: 'mailto:reuben.peterpaul@protonmail.com', icon: 'fa-solid fa-envelope', external: false },
    { name: 'RSS', url: '/feed.xml', icon: 'fa-solid fa-rss', external: false },
  ]

  return (
    <section className="links-section" id="links">
      <div className="section-container">
        <h2 className="section-title">Links</h2>
        <p className="reply-prompt">
          Have a note or counterpoint? Reply on{' '}
          <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          {' '}or by{' '}
          <a href="mailto:reuben.peterpaul@protonmail.com">email</a>.
        </p>
        <div className="links-list">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              className="link-item"
              {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              <i className={link.icon} aria-hidden="true"></i>
              <span>{link.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Contact
