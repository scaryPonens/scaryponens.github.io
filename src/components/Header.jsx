import DarkModeToggle from './DarkModeToggle'

function Header() {
  return (
    <header className="header-section">
      <div className="topbar">
        <a href="/" className="site-kicker">REUBEN PETER-PAUL</a>
        <DarkModeToggle />
      </div>

      <h1 className="hero-title">
        Systems, shaping,
        <em className="hero-title-italic">and field notes.</em>
      </h1>

      <p className="hero-lead">
        Why certain engineering approaches hold up, how I judge whether I am actually
        improving, and reads worth a peer&rsquo;s time outside social media.
      </p>

      <nav className="hero-nav" aria-label="Primary">
        <a href="#worth-looking-at">Worth looking at</a>
        <a href="#field-notes">Field notes</a>
        <a href="#projects">Projects</a>
        <a href="/feed.xml">RSS</a>
        <a href="https://github.com/scaryponens" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="mailto:reuben.peterpaul@protonmail.com">Email</a>
      </nav>
    </header>
  )
}

export default Header
