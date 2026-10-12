export type CellState = 'hidden' | 'revealed' | 'flagged'
export type Status = 'idle' | 'playing' | 'won' | 'lost'

export interface Cell {
  mine: boolean
  adjacent: number
  state: CellState
}

export interface Config {
  width: number
  height: number
  mines: number
}

export interface Game extends Config {
  status: Status
  cells: Cell[]
}

export function newGame(config: Config): Game {
  const cells = Array.from({ length: config.width * config.height }, () => ({
    mine: false,
    adjacent: 0,
    state: 'hidden' as CellState,
  }))
  return { ...config, status: 'idle', cells }
}

export type Rng = () => number

const indexOf = (game: Config, x: number, y: number) => y * game.width + x
const coordsOf = (game: Config, i: number): [number, number] => [i % game.width, Math.floor(i / game.width)]

function neighborIndexes(game: Config, x: number, y: number): number[] {
  const result: number[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < game.width && ny < game.height) {
        result.push(indexOf(game, nx, ny))
      }
    }
  }
  return result
}

export function withAdjacency(game: Game): Game {
  const cells = game.cells.map((cell, i) => ({
    ...cell,
    adjacent: neighborIndexes(game, ...coordsOf(game, i)).filter(
      (n) => game.cells[n]?.mine,
    ).length,
  }))
  return { ...game, cells }
}

function placeMines(game: Game, x: number, y: number, rng: Rng): Cell[] {
  const cells = game.cells.map((c) => ({ ...c }))
  const safe = new Set([indexOf(game, x, y), ...neighborIndexes(game, x, y)])
  let placed = 0
  while (placed < game.mines) {
    const i = Math.floor(rng() * cells.length)
    const cell = cells[i]
    if (cell && !cell.mine && !safe.has(i)) {
      cell.mine = true
      placed++
    }
  }
  return withAdjacency({ ...game, cells }).cells
}

const isOver = (game: Game) => game.status === 'won' || game.status === 'lost'

export function reveal(game: Game, x: number, y: number, rng: Rng = Math.random): Game {
  if (isOver(game) || game.cells[indexOf(game, x, y)]?.state === 'flagged') return game

  const cells = game.status === 'idle' ? placeMines(game, x, y, rng) : game.cells.map((c) => ({ ...c }))
  let status: Status = 'playing'

  const pending = [indexOf(game, x, y)]
  while (pending.length > 0) {
    const i = pending.pop()!
    const cell = cells[i]
    if (!cell || cell.state !== 'hidden') continue
    cell.state = 'revealed'
    if (cell.mine) status = 'lost'
    else if (cell.adjacent === 0) {
      pending.push(...neighborIndexes(game, ...coordsOf(game, i)))
    }
  }

  if (status === 'playing' && cells.every((c) => c.mine || c.state === 'revealed')) status = 'won'
  return { ...game, status, cells }
}

export function toggleFlag(game: Game, x: number, y: number): Game {
  const i = indexOf(game, x, y)
  const cell = game.cells[i]
  if (isOver(game) || !cell || cell.state === 'revealed') return game

  const cells = game.cells.map((c) => ({ ...c }))
  cells[i]!.state = cell.state === 'flagged' ? 'hidden' : 'flagged'
  return { ...game, cells }
}

export function remainingMines(game: Game): number {
  return game.mines - game.cells.filter((c) => c.state === 'flagged').length
}

export function chord(game: Game, x: number, y: number): Game {
  const i = indexOf(game, x, y)
  const cell = game.cells[i]
  if (isOver(game) || !cell || cell.state !== 'revealed' || cell.adjacent === 0) return game

  const neighbors = neighborIndexes(game, x, y)
  const flags = neighbors.filter((n) => game.cells[n]?.state === 'flagged').length
  if (flags !== cell.adjacent) return game

  return neighbors.reduce(
    (g, n) => reveal(g, ...coordsOf(game, n)),
    game,
  )
}
