import GameOfLife from './GameOfLife'

function Header() {
  return (
    <header className="header-section">
      <div className="header-content">
        <div className="game-of-life-wrapper">
          <GameOfLife />
        </div>
        <h1 className="glitch" data-text="Reuben Peter-Paul">
          Reuben Peter-Paul
        </h1>
        <p className="subtitle">Architect of Systems That Behave When Reality Misbehaves</p>
      </div>
    </header>
  )
}

export default Header
