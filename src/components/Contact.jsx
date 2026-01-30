function Contact() {
  const socialLinks = [
    { name: 'GitHub', url: 'https://github.com/scaryponens', icon: '◉' },
    { name: 'Twitter', url: '#', icon: '◉' },
    { name: 'LinkedIn', url: '#', icon: '◉' },
    { name: 'Email', url: 'mailto:your@email.com', icon: '◉' },
  ]

  return (
    <section className="contact-section">
      <div className="section-container">
        <h2 className="section-title">
          <span className="neon-text">[ CONTACT ]</span>
        </h2>
        <div className="retro-panel">
          <p className="retro-text">Get in touch through these channels:</p>
          <div className="social-links">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="social-button"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="button-icon">{link.icon}</span>
                <span className="button-text">{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
