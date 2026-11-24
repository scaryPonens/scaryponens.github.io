function Contact() {
  return (
    <>
      <hr className="section-rule" />
      <footer className="site-footer" id="links">
        <p className="footer-prompt">
          Have a note or counterpoint? Reply on{' '}
          <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          {' '}or by{' '}
          <a href="mailto:reuben.peterpaul@protonmail.com">email</a>.
        </p>
        <div className="footer-links">
          <a href="/feed.xml">RSS</a>
          <span className="footer-sep" aria-hidden="true">·</span>
          <a href="https://github.com/scaryponens" target="_blank" rel="noopener noreferrer">GitHub</a>
          <span className="footer-sep" aria-hidden="true">·</span>
          <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <span className="footer-sep" aria-hidden="true">·</span>
          <a href="mailto:reuben.peterpaul@protonmail.com">Email</a>
        </div>
      </footer>
    </>
  )
}

export default Contact
