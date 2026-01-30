import { useEffect, useRef, useState } from 'react'

const CELL_SIZE = 5
const GRID_WIDTH = 80
const GRID_HEIGHT = 60
const UPDATE_INTERVAL = 100 // milliseconds

const COLORS = [
  '#00ffff', // cyan
  '#ff00ff', // magenta
  '#00ff00', // green
  '#ffff00', // yellow
]

function GameOfLife() {
  const canvasRef = useRef(null)
  const gridRef = useRef(createInitialGrid())
  const [isRunning, setIsRunning] = useState(true)

  function createInitialGrid() {
    const grid = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[y] = []
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Random initial state with ~30% alive cells
        grid[y][x] = Math.random() > 0.7 ? Math.floor(Math.random() * COLORS.length) + 1 : 0
      }
    }
    return grid
  }

  function countNeighbors(grid, x, y) {
    let count = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          if (grid[ny][nx] > 0) count++
        }
      }
    }
    return count
  }

  function nextGeneration(grid) {
    const newGrid = grid.map(row => [...row])
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const neighbors = countNeighbors(grid, x, y)
        const current = grid[y][x]
        
        if (current > 0) {
          // Living cell
          if (neighbors < 2 || neighbors > 3) {
            newGrid[y][x] = 0 // Dies
          } else {
            newGrid[y][x] = current // Survives
          }
        } else {
          // Dead cell
          if (neighbors === 3) {
            // Random color for new cell
            newGrid[y][x] = Math.floor(Math.random() * COLORS.length) + 1
          }
        }
      }
    }
    
    return newGrid
  }

  function drawGrid(ctx, grid) {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE)
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (grid[y][x] > 0) {
          const colorIndex = grid[y][x] - 1
          ctx.fillStyle = COLORS[colorIndex]
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
          
          // Add glow effect
          ctx.shadowBlur = 5
          ctx.shadowColor = COLORS[colorIndex]
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
          ctx.shadowBlur = 0
        }
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = GRID_WIDTH * CELL_SIZE
    canvas.height = GRID_HEIGHT * CELL_SIZE
    
    let animationFrameId
    let lastUpdate = Date.now()
    
    function animate() {
      const now = Date.now()
      
      if (isRunning && now - lastUpdate >= UPDATE_INTERVAL) {
        gridRef.current = nextGeneration(gridRef.current)
        lastUpdate = now
      }
      
      drawGrid(ctx, gridRef.current)
      animationFrameId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isRunning])

  return (
    <div className="game-of-life-container">
      <canvas
        ref={canvasRef}
        className="game-of-life-canvas"
        onClick={() => setIsRunning(!isRunning)}
        title="Click to pause/resume"
      />
    </div>
  )
}

export default GameOfLife
