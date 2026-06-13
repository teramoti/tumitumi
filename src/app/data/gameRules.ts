export const PLAYER_START_HP = 2

export const MAX_TURNS_BY_DIFFICULTY = {
  easy: 32,
  normal: 36,
  hard: 40,
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

// 旧HUD互換用。積み上げゲームではタイマーとしては使わない。
export function getGameTimeLimitSeconds(difficulty?: Difficulty | string) {
  return getMaxTurns(difficulty)
}
