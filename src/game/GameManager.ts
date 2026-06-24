import Phaser from 'phaser'
// @ts-expect-error: Phaser scene is authored as JavaScript for Vite runtime compatibility.
import TowerCrashScene, { configureTowerCrashScene } from './towerCrash/TowerCrashScene.js'
import type { GameResult } from '../app/App'
import type { Difficulty } from '../app/data/gameRules'

export const DEFAULT_PLAYER_COUNT = 4

export function normalizePlayerCount(value: unknown): number {
  const count = Number(value)
  if (!Number.isFinite(count)) return DEFAULT_PLAYER_COUNT
  return Math.max(1, Math.min(4, Math.floor(count)))
}

export function getGameManagerPlayerCount(value?: unknown): number {
  return normalizePlayerCount(value ?? DEFAULT_PLAYER_COUNT)
}

type GameSettings = {
  playerCount: number
  hudTarget?: EventTarget
  difficulty: Difficulty
}

let game: Phaser.Game | null = null

export function startGame(
  parent: HTMLElement,
  settings: GameSettings,
  onFinish: (result: GameResult) => void
) {
  const { difficulty } = settings
  const playerCount = normalizePlayerCount(settings.playerCount)
  const normalizedSettings = { ...settings, playerCount }

  configureTowerCrashScene(normalizedSettings, onFinish)

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent,
    backgroundColor: '#86d9f5',
    scene: new TowerCrashScene({ playerCount, difficulty }),
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.08 },
        debug: false,
        enableSleeping: true
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  })
}

export function destroyGame() {
  game?.destroy(true)
  game = null
}
