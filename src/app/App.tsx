import { useState, lazy, Suspense } from 'react'
import StartScreen from './screens/StartScreen/StartScreen'
import ResultScreen from './screens/ResultScreen/ResultScreen'
import { getGameManagerPlayerCount } from '../game/GameManager'

const GameScreen = lazy(() => import('./screens/GameScreen/GameScreen'))

type Screen = 'start' | 'game' | 'result'

export type GameSettings = {
  playerCount: number
  difficulty?: 'easy' | 'normal' | 'hard'
  pattern?: string
}

export type PlayerReview = {
  rightGrid: string[][]
  selectedKeys: string[]
  correctKeys: string[]
  pattern: string
}

export type PlayerResult = {
  player: number
  score: number
  review?: PlayerReview
  hp?: number
  alive?: boolean
  successes?: number
  misses?: number
  dropPoints?: number
  survivalBonus?: number
  hpBonus?: number
  missPenalty?: number
}

export type GameResult = {
  results: PlayerResult[]
}

type LoosePlayerResult = {
  player?: number
  playerNumber?: number
  score?: number
  review?: PlayerReview
  hp?: number
  alive?: boolean
  successes?: number
  misses?: number
  dropPoints?: number
  survivalBonus?: number
  hpBonus?: number
  missPenalty?: number
}

type RawGameResult = GameResult | {
  scores?: number[]
  results?: LoosePlayerResult[]
}

function normalizeGameResult(raw: RawGameResult): GameResult {
  if (Array.isArray(raw.results)) {
    const results = raw.results
      .map((entry, index) => ({
        player: entry.player ?? (('playerNumber' in entry) ? entry.playerNumber : undefined) ?? index + 1,
        score: typeof entry.score === 'number' ? entry.score : 0,
        review: entry.review,
        hp: entry.hp,
        alive: entry.alive,
        successes: entry.successes,
        misses: entry.misses,
        dropPoints: entry.dropPoints,
        survivalBonus: entry.survivalBonus,
        hpBonus: entry.hpBonus,
        missPenalty: entry.missPenalty
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.player - b.player
      })

    return { results }
  }

  if ('scores' in raw && Array.isArray(raw.scores)) {
    const results = raw.scores
      .map((score, index) => ({
        player: index + 1,
        score
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.player - b.player
      })

    return { results }
  }

  return { results: [] }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const playerCount = getGameManagerPlayerCount()

  const handleStart = (nextSettings: Omit<GameSettings, 'playerCount'>) => {
    setSettings({
      ...nextSettings,
      playerCount
    })
    setScreen('game')
  }

  const handleFinish = (rawResult: RawGameResult) => {
    setResult(normalizeGameResult(rawResult))
    setScreen('result')
  }

  const handleBack = () => {
    setSettings(null)
    setResult(null)
    setScreen('start')
  }

  return (
    <>
      {screen === 'start' && (
        <StartScreen playerCount={playerCount} onStart={handleStart} />
      )}

      {screen === 'game' && settings && (
        <Suspense fallback={<div>ゲーム読み込み中...</div>}>
          <GameScreen settings={settings} onFinish={handleFinish} />
        </Suspense>
      )}

      {screen === 'result' && result && (
        <ResultScreen result={result} onBack={handleBack} />
      )}
    </>
  )
}
