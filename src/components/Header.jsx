import GameOfLife from './GameOfLife'

function Header() {
  return (
    <header className="header-section">
      <div className="header-content">
        <div className="game-of-life-wrapper">
          <GameOfLife />
        </div>
        <h1 className="glitch" data-text="scaryponens">
          scaryponens
        </h1>
        <p className="subtitle">80s Retro Gamer Homepage</p>
      </div>
    </header>
  )
}

export default Header
