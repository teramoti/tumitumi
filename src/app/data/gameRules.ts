// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
// 全プレイヤー共通の初期HP。ゲーム時間を伸ばすならここを増やします。
export const PLAYER_START_HP = 2

// 難易度ごとの最大ターン数。hardだけ長くして、逆転余地を増やしています。
export const MAX_TURNS_BY_DIFFICULTY = {
  easy: 8,
  normal: 8,
  hard: 12,
} as const

// タイトル画面に表示する難易度名。UI文言を変える場合はここです。
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
