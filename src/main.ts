import './ui/style.css'
import { DIFFICULTIES, type DifficultyName } from './game/difficulty'
import { chord, newGame, remainingMines, reveal, toggleFlag, type Game } from './game/game'
import { pad, renderBoard } from './ui/render'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const board = $('board')
const level = $<HTMLSelectElement>('level')
const resetButton = $('reset')
const minesEl = $('mines')
const timeEl = $('time')
const msg = $('msg')

let game: Game
let seconds = 0
let timer: number | undefined

function stopTimer() {
  clearInterval(timer)
  timer = undefined
}

function startTimer() {
  timer = window.setInterval(() => {
    seconds++
    timeEl.textContent = pad(seconds)
  }, 1000)
}

function update(next: Game) {
  const wasIdle = game.status === 'idle'
  game = next
  if (wasIdle && game.status !== 'idle') startTimer()
  if (game.status === 'won' || game.status === 'lost') stopTimer()

  renderBoard(board, game)
  minesEl.textContent = pad(remainingMines(game))
  resetButton.textContent = { idle: '🙂', playing: '🙂', won: '😎', lost: '😵' }[game.status]
  if (game.status === 'won') msg.textContent = `You win! Time: ${seconds}s`
  else if (game.status === 'lost') msg.textContent = 'Boom! You hit a mine.'
}

function start() {
  stopTimer()
  seconds = 0
  timeEl.textContent = pad(0)
  msg.textContent = 'Left-click reveal · Right-click flag · Click a number (or middle-click) to chord'
  game = newGame(DIFFICULTIES[level.value as DifficultyName])
  update(game)
}

function cellAt(e: Event): [number, number] | undefined {
  const el = (e.target as HTMLElement).closest<HTMLElement>('.cell')
  return el ? [Number(el.dataset.x), Number(el.dataset.y)] : undefined
}

board.addEventListener('click', (e) => {
  const pos = cellAt(e)
  if (!pos) return
  const cell = game.cells[pos[1] * game.width + pos[0]]
  update(cell?.state === 'revealed' ? chord(game, ...pos) : reveal(game, ...pos))
})

board.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  const pos = cellAt(e)
  if (pos) update(toggleFlag(game, ...pos))
})

board.addEventListener('auxclick', (e) => {
  if (e.button !== 1) return
  e.preventDefault()
  const pos = cellAt(e)
  if (pos) update(chord(game, ...pos))
})

resetButton.addEventListener('click', start)
level.addEventListener('change', start)
start()
