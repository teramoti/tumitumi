export const PLAYER_START_HP = 2

export const MAX_TURNS_BY_DIFFICULTY = {
  easy: 8,
  normal: 10,
  hard: 12,
} as const

export const DIFFICULTY_LABELS = {
  easy: 'ゆるめ',
  normal: 'ふつう',
  hard: 'ぐらぐら',
} as const

export type Difficulty = keyof typeof MAX_TURNS_BY_DIFFICULTY

export function getMaxTurns(difficulty?: Difficulty | string, playerCount = 4) {
  const baseTurns = difficulty
    ? (MAX_TURNS_BY_DIFFICULTY[difficulty as Difficulty] ?? MAX_TURNS_BY_DIFFICULTY.normal)
    : MAX_TURNS_BY_DIFFICULTY.normal
  const normalizedPlayerCount = Math.max(1, Math.min(4, Math.floor(playerCount)))

  return Math.max(
    normalizedPlayerCount,
    Math.floor(baseTurns / normalizedPlayerCount) * normalizedPlayerCount
  )
}

// 旧HUD互換用。積み上げゲームではタイマーとしては使わない。
export function getGameTimeLimitSeconds(difficulty?: Difficulty | string) {
  return getMaxTurns(difficulty)
}
