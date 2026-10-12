import type { Config } from './game'

export const DIFFICULTIES = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
} satisfies Record<string, Config>

export type DifficultyName = keyof typeof DIFFICULTIES
