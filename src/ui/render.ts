import type { Cell, Game } from '../game/game'

export function renderCell(cell: Cell, x: number, y: number, lost: boolean): HTMLElement {
  const el = document.createElement('div')
  el.className = 'cell'
  el.dataset.x = String(x)
  el.dataset.y = String(y)
  el.setAttribute('role', 'gridcell')

  if (cell.state === 'revealed') {
    el.classList.add('revealed')
    if (cell.mine) {
      el.classList.add('mine')
      el.textContent = '💣'
    } else if (cell.adjacent > 0) {
      el.classList.add(`n${cell.adjacent}`)
      el.textContent = String(cell.adjacent)
    }
  } else if (cell.state === 'flagged') {
    if (lost && !cell.mine) {
      el.classList.add('wrong')
      el.textContent = '❌'
    } else {
      el.textContent = '🚩'
    }
  } else if (lost && cell.mine) {
    el.classList.add('revealed', 'mine')
    el.textContent = '💣'
  }
  return el
}

export function renderBoard(board: HTMLElement, game: Game): void {
  board.style.gridTemplateColumns = `repeat(${game.width}, 30px)`
  const lost = game.status === 'lost'
  board.replaceChildren(
    ...game.cells.map((cell, i) => renderCell(cell, i % game.width, Math.floor(i / game.width), lost)),
  )
}

export const pad = (n: number) => String(Math.min(Math.max(n, 0), 999)).padStart(3, '0')
