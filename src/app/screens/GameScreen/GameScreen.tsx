// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
import { useEffect, useRef, useState } from 'react'
import './GameScreen.css'
const gameBgm = '/assets/game_bgm.wav'
import { AUDIO_LEVELS } from '../../audio/audioLevels'
import { destroyGame, startGame } from '../../../game/GameManager'
import { DIFFICULTY_LABELS, getMaxTurns, PLAYER_START_HP, type Difficulty } from '../../data/gameRules'
import type { GameSettings, GameResult } from '../../App'

type Props = {
  settings: GameSettings
  onFinish: (result: GameResult) => void
}

// PhaserからCustomEventで送られてくるHUD状態。表示追加時はここにも型を追加します。
type GameHudState = {
  currentPlayerIndex: number
  playerCount: number
  hp: number[]
  alive: boolean[]
  successes: number[]
  misses: number[]
  turnNumber: number
  maxTurns: number
  round: number
  scores: Array<number | null>
  currentScore: number
  combo: number
  timeLeft: number
  isAnswerChecked: boolean
  nextButtonLabel: string
  actionButtonLabel?: string
  ruleName?: string
  selectedItemLabel?: string
  selectedItemDescription?: string
  selectedItemKey?: string
  selectedItemScore?: number
  selectedItemRisk?: number
  previewScore?: number
  selectedLaneIndex?: number
  selectedRotationDegrees?: number
  aliveCount?: number
  difficultyLabel?: string
  isActionLocked?: boolean
}

const PLAYER_MARKER_IMAGE_PATHS = [
  '/assets/player_badge_p1.png',
  '/assets/player_badge_p2.png',
  '/assets/player_badge_p3.png',
  '/assets/player_badge_p4.png'
]

// HUDで表示する次の動物画像。TowerCrashScene.jsのanimal keyと対応します。
const ITEM_IMAGE_PATHS: Record<string, string> = {
  cat: '/assets/animal_cat.png',
  dog: '/assets/animal_dog.png',
  panda: '/assets/animal_panda.png',
  turtle: '/assets/animal_turtle.png',
  penguin: '/assets/animal_penguin.png',
  elephant: '/assets/animal_elephant.png',
  giraffe: '/assets/animal_giraffe.png',
  seal: '/assets/animal_seal.png',
  lion: '/assets/animal_lion.png',
  bear: '/assets/animal_bear.png',
  rabbit: '/assets/animal_rabbit.png',
  fox: '/assets/animal_fox.png',
  hippo: '/assets/animal_hippo.png',
  crocodile: '/assets/animal_crocodile.png',
  monkey: '/assets/animal_monkey.png',
  hedgehog: '/assets/animal_hedgehog.png',
  drop: '/assets/animal_cat.png'
}

// HPをハートで表示します。脱落時はCSSで暗くします。
function Hearts({ hp, alive }: { hp: number, alive: boolean }) {
  return (
    <span className={`heartRow ${alive ? '' : 'heartRowDead'}`} aria-label={`HP ${hp}`}>
      {Array.from({ length: PLAYER_START_HP }, (_, index) => (
        <span className={index < hp ? 'heartOn' : 'heartOff'} key={index}>♥</span>
      ))}
    </span>
  )
}

// Phaser canvasとReact HUDを重ねるゲーム画面です。
export default function GameScreen({ settings, onFinish }: Props) {
  const difficultyForInit: Difficulty = settings.difficulty ?? 'normal'
  const [hud, setHud] = useState<GameHudState>({
    currentPlayerIndex: 0,
    playerCount: settings.playerCount,
    hp: Array(settings.playerCount).fill(PLAYER_START_HP),
    alive: Array(settings.playerCount).fill(true),
    successes: Array(settings.playerCount).fill(0),
    misses: Array(settings.playerCount).fill(0),
    turnNumber: 0,
    maxTurns: getMaxTurns(difficultyForInit),
    round: 1,
    scores: Array(settings.playerCount).fill(null),
    currentScore: 0,
    combo: 0,
    timeLeft: getMaxTurns(difficultyForInit),
    isAnswerChecked: false,
    nextButtonLabel: '次の人へ',
    actionButtonLabel: 'つむ！',
    ruleName: 'どうぶつタワーバトル',
    selectedItemLabel: 'どうぶつ x1',
    selectedItemDescription: 'DROP x1',
    selectedItemKey: 'cat',
    selectedItemScore: 120,
    selectedItemRisk: 2,
    previewScore: 120,
    selectedLaneIndex: 3,
    selectedRotationDegrees: 0,
    aliveCount: settings.playerCount,
    difficultyLabel: DIFFICULTY_LABELS[difficultyForInit],
    isActionLocked: false
  })

  const ref = useRef<HTMLDivElement | null>(null)
  const hudTargetRef = useRef<EventTarget>(new EventTarget())
  const initialSettingsRef = useRef(settings)
  const onFinishRef = useRef(onFinish)

  // Phaserから届くgame-hud-updateを受け取り、React側HUDへ反映します。
  useEffect(() => {
    const hudTarget = hudTargetRef.current
    const audio = new Audio(gameBgm)
    audio.loop = true
    audio.volume = AUDIO_LEVELS.gameBgm

    const playBgm = () => {
      void audio.play().catch(() => {
        // 自動再生が拒否された場合は最初の操作で再試行する。
      })
    }

    playBgm()
    window.addEventListener('keydown', playBgm, { once: true })

    const stopBgm = () => {
      window.removeEventListener('keydown', playBgm)
      audio.pause()
      audio.currentTime = 0
    }

    const handleHudUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<GameHudState>>
      setHud((current) => ({
        ...current,
        ...customEvent.detail
      }))
    }

    hudTarget.addEventListener('game-hud-update', handleHudUpdate)

    if (ref.current) {
      startGame(
        ref.current,
        {
          ...initialSettingsRef.current,
          difficulty: initialSettingsRef.current.difficulty ?? 'normal',
          hudTarget
        },
        onFinishRef.current
      )
    }

    return () => {
      stopBgm()
      destroyGame()
      hudTarget.removeEventListener('game-hud-update', handleHudUpdate)
    }
  }, [])


  const selectedItemImage = ITEM_IMAGE_PATHS[hud.selectedItemKey ?? 'cat'] ?? ITEM_IMAGE_PATHS.cat

  return (
    <div className="gameScreenShell">
      <div className="gameScreenPanel">
        <div className="gameCanvasHost" ref={ref} />

        <aside className="consoleHud jamCompactHud" aria-label="ゲーム情報">
          <div className="consoleTurn">
            <img src={PLAYER_MARKER_IMAGE_PATHS[hud.currentPlayerIndex]} alt="" />
            <strong>P{hud.currentPlayerIndex + 1}</strong>
            <span>TURN {hud.turnNumber}/{hud.maxTurns}</span>
            <em>{hud.timeLeft}</em>
          </div>

          <div className="consoleNextAnimal">
            <img src={selectedItemImage} alt="" style={{ transform: `rotate(${hud.selectedRotationDegrees ?? 0}deg)` }} />
            <span>固定 {hud.selectedItemLabel?.replace(' x1', '') ?? 'どうぶつ'}</span>
            <strong>回転 {hud.selectedRotationDegrees ?? 0}°</strong>
            <div className="consoleAnimalStats">
              <em>+{hud.previewScore ?? hud.selectedItemScore ?? 0}</em>
              <em>RISK {hud.selectedItemRisk ?? 1}</em>
            </div>
          </div>

          <div className="consoleJamScore">
            <span>CURRENT SCORE</span>
            <strong>{hud.currentScore}</strong>
            <em>ALIVE {hud.aliveCount ?? hud.playerCount}/{hud.playerCount}</em>
          </div>

          <div className="consolePlayers">
            {Array.from({ length: hud.playerCount }, (_, index) => {
              const isCurrent = index === hud.currentPlayerIndex
              const alive = hud.alive[index] ?? true
              return (
                <div className={`consolePlayer ${isCurrent ? 'consolePlayerCurrent' : ''} ${alive ? '' : 'consolePlayerDead'}`} key={index}>
                  <img src={PLAYER_MARKER_IMAGE_PATHS[index]} alt="" />
                  <span>P{index + 1}</span>
                  <Hearts hp={hud.hp[index] ?? 0} alive={alive} />
                </div>
              )
            })}
          </div>
        </aside>
        <div className="jamStageCallout" aria-hidden="true">
          <span>JAM MODE</span>
          <strong>{hud.timeLeft <= 1 ? 'DROP NOW!' : `P${hud.currentPlayerIndex + 1} STACK`}</strong>
          <em>動物固定 / 位置と角度だけ調整</em>
        </div>

        <div className="gameInputGuide" aria-hidden="true">
          <span>移動 マウス / ←→</span>
          <span>回転 Q/E長押し</span>
          <strong>落とす クリック / SPACE</strong>
        </div>
      </div>
    </div>
  )
}
