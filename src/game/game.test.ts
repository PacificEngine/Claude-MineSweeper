import { describe, expect, it } from 'vitest'
import { chord, newGame, remainingMines, reveal, toggleFlag, withAdjacency, type Game } from './game'

// Small deterministic RNG so tests are repeatable.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Build a game in progress from ASCII rows: '*' is a mine, '.' is safe.
function fromLayout(rows: string[]): Game {
  const game = newGame({ width: rows[0]!.length, height: rows.length, mines: 0 })
  const flat = rows.join('')
  game.cells.forEach((cell, i) => (cell.mine = flat[i] === '*'))
  return withAdjacency({ ...game, mines: [...flat].filter((c) => c === '*').length, status: 'playing' })
}

const beginner = { width: 9, height: 9, mines: 10 }

describe('newGame', () => {
  it('creates an idle board of hidden cells with the requested size', () => {
    const game = newGame({ width: 4, height: 3, mines: 2 })

    expect(game.status).toBe('idle')
    expect(game.cells).toHaveLength(12)
    expect(game.cells.every((c) => c.state === 'hidden')).toBe(true)
  })
})

describe('first reveal', () => {
  it('places exactly the configured number of mines', () => {
    const game = reveal(newGame(beginner), 4, 4, seeded(1))

    expect(game.cells.filter((c) => c.mine)).toHaveLength(10)
  })

  it('never puts a mine on the clicked cell or its neighbors', () => {
    for (let seed = 0; seed < 50; seed++) {
      const game = reveal(newGame(beginner), 0, 0, seeded(seed))
      const safe = [0, 1, 9, 10] // (0,0) and its neighbors in a 9-wide grid

      expect(safe.some((i) => game.cells[i]?.mine)).toBe(false)
    }
  })

  it('starts the game and reveals the clicked cell', () => {
    const game = reveal(newGame(beginner), 4, 4, seeded(1))

    expect(game.status).toBe('playing')
    expect(game.cells[4 * 9 + 4]?.state).toBe('revealed')
  })
})

describe('withAdjacency', () => {
  it('counts neighboring mines for every cell', () => {
    const game = newGame({ width: 3, height: 2, mines: 1 })
    game.cells[1]!.mine = true // top-middle

    const counted = withAdjacency(game)

    expect(counted.cells.map((c) => c.adjacent)).toEqual([1, 0, 1, 1, 1, 1])
  })
})

describe('first reveal adjacency', () => {
  it('populates adjacent counts after mines are placed', () => {
    const game = reveal(newGame(beginner), 4, 4, seeded(3))

    game.cells.forEach((cell, i) => {
      if (cell.mine) return
      const x = i % 9
      const y = Math.floor(i / 9)
      let expected = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (game.cells[(y + dy) * 9 + (x + dx)]?.mine && x + dx >= 0 && x + dx < 9) expected++
      expect(cell.adjacent).toBe(expected)
    })
  })
})

describe('reveal during play', () => {
  it('flood-fills through zero cells and stops at numbered cells', () => {
    const game = reveal(fromLayout(['.*...']), 4, 0)

    expect(game.cells.map((c) => c.state)).toEqual([
      'hidden', 'hidden', 'revealed', 'revealed', 'revealed',
    ])
  })

  it('loses when a mine is revealed', () => {
    const game = reveal(fromLayout(['.*...']), 1, 0)

    expect(game.status).toBe('lost')
    expect(game.cells[1]?.state).toBe('revealed')
  })
})

describe('winning', () => {
  it('wins once every safe cell is revealed', () => {
    const game = reveal(fromLayout(['*.']), 1, 0)

    expect(game.status).toBe('won')
  })

  it('keeps playing while safe cells remain hidden', () => {
    const game = reveal(fromLayout(['*..']), 1, 0)

    expect(game.status).toBe('playing')
  })
})

describe('flags', () => {
  it('toggles a flag on a hidden cell', () => {
    const flagged = toggleFlag(fromLayout(['*..']), 1, 0)
    expect(flagged.cells[1]?.state).toBe('flagged')

    const unflagged = toggleFlag(flagged, 1, 0)
    expect(unflagged.cells[1]?.state).toBe('hidden')
  })

  it('cannot flag a revealed cell', () => {
    const game = toggleFlag(reveal(fromLayout(['*..']), 2, 0), 2, 0)

    expect(game.cells[2]?.state).toBe('revealed')
  })

  it('does not reveal a flagged cell', () => {
    const game = reveal(toggleFlag(fromLayout(['*..']), 2, 0), 2, 0)

    expect(game.cells[2]?.state).toBe('flagged')
  })

  it('does not flood-fill into flagged cells', () => {
    const game = reveal(toggleFlag(fromLayout(['.*...']), 3, 0), 4, 0)

    expect(game.cells[3]?.state).toBe('flagged')
  })

  it('counts remaining mines as mines minus flags, and may go negative', () => {
    let game = fromLayout(['*..'])
    expect(remainingMines(game)).toBe(1)

    game = toggleFlag(toggleFlag(game, 1, 0), 2, 0)
    expect(remainingMines(game)).toBe(-1)
  })
})

describe('after the game is over', () => {
  it('ignores further reveals and flags', () => {
    const lost = reveal(fromLayout(['*..']), 0, 0)

    expect(reveal(lost, 1, 0)).toEqual(lost)
    expect(toggleFlag(lost, 1, 0)).toEqual(lost)
  })
})

describe('chord', () => {
  // Row of numbers: mine at (0,1); (1,1) shows 1.
  const layout = ['...', '*..', '...']

  it('reveals unflagged neighbors when flags match the number', () => {
    let game = reveal(fromLayout(layout), 1, 1)
    game = toggleFlag(game, 0, 1)

    game = chord(game, 1, 1)

    expect(game.cells.filter((c) => c.state === 'hidden')).toHaveLength(0)
    expect(game.status).toBe('won')
  })

  it('does nothing when the flag count differs from the number', () => {
    const before = reveal(fromLayout(layout), 1, 1)

    expect(chord(before, 1, 1)).toEqual(before)
  })

  it('does nothing on a hidden cell', () => {
    const before = fromLayout(layout)

    expect(chord(before, 1, 1)).toEqual(before)
  })

  it('loses when a flag is misplaced', () => {
    let game = reveal(fromLayout(layout), 1, 1)
    game = toggleFlag(game, 1, 0) // wrong cell; the mine is at (0,1)

    game = chord(game, 1, 1)

    expect(game.status).toBe('lost')
  })
})
