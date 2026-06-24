export const PLAYER_START_HP = 2

export const MAX_TURNS_BY_DIFFICULTY = {
  easy: 16,
  normal: 20,
  hard: 24,
} as const

export const DIFFICULTY_LABELS = {
  easy: 'ゆるめ',
  normal: 'ふつう',
  hard: 'ぐらぐら',
} as const

export type Difficulty = keyof typeof MAX_TURNS_BY_DIFFICULTY

export function getMaxTurns(difficulty?: Difficulty | string) {
  if (!difficulty) return MAX_TURNS_BY_DIFFICULTY.normal
  return MAX_TURNS_BY_DIFFICULTY[difficulty as Difficulty] ?? MAX_TURNS_BY_DIFFICULTY.normal
}

// 旧HUD互換用。ターン上限として使う。
export function getGameTimeLimitSeconds(difficulty?: Difficulty | string) {
  return getMaxTurns(difficulty)
}
