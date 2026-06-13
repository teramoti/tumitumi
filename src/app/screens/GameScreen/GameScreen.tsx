import { useEffect, useRef, useState } from 'react'
import './GameScreen.css'
import gameBgm from '../../../../assets/audio/game_bgm.mp3'
import { playClickSound } from '../../audio/playClickSound'
import { destroyGame, startGame } from '../../../game/GameManager'
import { DIFFICULTY_LABELS, getMaxTurns, PLAYER_START_HP, type Difficulty } from '../../data/gameRules'
import type { GameSettings, GameResult } from '../../App'

type Props = {
  settings: GameSettings
  onFinish: (result: GameResult) => void
}

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
  statusMessage?: string
  selectedItemLabel?: string
  selectedItemDescription?: string
  selectedItemKey?: string
  selectedLaneIndex?: number
  aliveCount?: number
  difficultyLabel?: string
}

const ROBOT_IMAGE_PATHS = [
  '/assets/images/characters/robot_p1.png',
  '/assets/images/characters/robot_p2.png',
  '/assets/images/characters/robot_p3.png',
  '/assets/images/characters/robot_p4.png'
]

const ITEM_IMAGE_PATHS: Record<string, string> = {
  book: '/assets/images/items/book.png',
  notebook: '/assets/images/items/notebook.png',
  eraser: '/assets/images/items/eraser.png',
  box: '/assets/images/items/box.png',
  pencilCase: '/assets/images/items/pencilCase.png',
  smallCan: '/assets/images/items/smallCan.png',
  tape: '/assets/images/items/tape.png',
  ruler: '/assets/images/items/ruler.png',
  mug: '/assets/images/items/mug.png',
  battery: '/assets/images/items/battery.png'
}

function Hearts({ hp, alive }: { hp: number, alive: boolean }) {
  return (
    <span className={`heartRow ${alive ? '' : 'heartRowDead'}`} aria-label={`HP ${hp}`}>
      {Array.from({ length: PLAYER_START_HP }, (_, index) => (
        <span className={index < hp ? 'heartOn' : 'heartOff'} key={index}>♥</span>
      ))}
    </span>
  )
}

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
    actionButtonLabel: '置く！',
    ruleName: '雑貨つみタワー',
    statusMessage: '雑貨を1個置いたら交代 / 崩した人はHP-1',
    selectedItemLabel: '雑貨',
    selectedItemDescription: '置くものを選んでね',
    selectedItemKey: 'book',
    selectedLaneIndex: 3,
    aliveCount: settings.playerCount,
    difficultyLabel: DIFFICULTY_LABELS[difficultyForInit]
  })

  const ref = useRef<HTMLDivElement | null>(null)
  const hudTargetRef = useRef<EventTarget>(new EventTarget())
  const initialSettingsRef = useRef(settings)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    const hudTarget = hudTargetRef.current
    const audio = new Audio(gameBgm)
    audio.loop = true

    const playBgm = () => {
      void audio.play().catch(() => {
        // 自動再生が拒否された場合は最初の操作で再試行する。
      })
    }

    playBgm()
    window.addEventListener('pointerdown', playBgm, { once: true })
    window.addEventListener('keydown', playBgm, { once: true })

    const stopBgm = () => {
      window.removeEventListener('pointerdown', playBgm)
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

  const sendGameCommand = (type: 'answer' | 'next') => {
    playClickSound()
    hudTargetRef.current.dispatchEvent(new CustomEvent('game-command', {
      detail: { type }
    }))
  }

  const progressRatio = Math.max(0, Math.min(1, hud.turnNumber / Math.max(1, hud.maxTurns)))
  const selectedItemImage = ITEM_IMAGE_PATHS[hud.selectedItemKey ?? 'book'] ?? ITEM_IMAGE_PATHS.book

  return (
    <div className="gameScreenShell">
      <div className="gameScreenPanel">
        <div className="gameCanvasHost" ref={ref} />

        <aside className="gameMiniHud" aria-label="ゲーム情報">
          <div className="hudCornerTape hudCornerTapeLeft" aria-hidden="true" />
          <div className="hudCornerTape hudCornerTapeRight" aria-hidden="true" />

          <div className="miniHudTopRow">
            <span className="miniHudBadge">{hud.ruleName || '雑貨つみタワー'}</span>
            <span className="miniHudDifficulty">{hud.difficultyLabel}</span>
          </div>

          <section className="turnHeroCard">
            <img
              className="turnHeroRobot"
              src={ROBOT_IMAGE_PATHS[hud.currentPlayerIndex]}
              alt={`Player ${hud.currentPlayerIndex + 1}`}
            />
            <div className="turnHeroInfo">
              <div className="turnHeroRow">
                <span className="turnHeroChip">ROUND {hud.round}</span>
                <span className="turnHeroChip">TURN {hud.turnNumber}/{hud.maxTurns}</span>
              </div>
              <p className="turnHeroPlayer">P{hud.currentPlayerIndex + 1} TURN</p>
              <p className="turnHeroText">{hud.isAnswerChecked ? 'つぎの人へ交代！' : 'どこに置く？'}</p>
            </div>
          </section>

          <div className="miniStatusRow">
            <div className="selectedItemMiniCard">
              <img className="selectedItemMiniImage" src={selectedItemImage} alt={hud.selectedItemLabel ?? '雑貨'} />
              <div className="selectedItemMiniText">
                <span className="selectedMiniLabel">SELECT</span>
                <strong>{hud.selectedItemLabel ?? '雑貨'}</strong>
              </div>
            </div>
            <div className="laneMiniBadge">
              <span className="selectedMiniLabel">LANE</span>
              <strong>{hud.selectedLaneIndex ?? 3}</strong>
            </div>
          </div>

          <div className="miniProgressRail" aria-hidden="true">
            <span style={{ width: `${progressRatio * 100}%` }} />
          </div>

          <img className="controlsSticker" src="/assets/images/ui/controls_hint.png" alt="操作説明" />

          <section className="miniPlayersSection" aria-label="プレイヤーHP">
            <div className="miniPlayersHeader">
              <span>PLAYERS</span>
              <span>{hud.aliveCount ?? hud.playerCount}/{hud.playerCount} ALIVE</span>
            </div>
            <div className="miniPlayersGrid">
              {Array.from({ length: hud.playerCount }, (_, index) => {
                const isCurrent = index === hud.currentPlayerIndex
                const alive = hud.alive[index] ?? true
                return (
                  <div className={`miniPlayerCard ${isCurrent ? 'miniPlayerCardCurrent' : ''} ${alive ? '' : 'miniPlayerCardDead'}`} key={index}>
                    <img className="miniPlayerRobot" src={ROBOT_IMAGE_PATHS[index]} alt="" />
                    <div className="miniPlayerText">
                      <div className="miniPlayerHead">
                        <span className="miniPlayerName">P{index + 1}</span>
                        <span className="miniPlayerState">{alive ? (isCurrent ? 'TURN' : 'OK') : 'OUT'}</span>
                      </div>
                      <Hearts hp={hud.hp[index] ?? 0} alive={alive} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <p className="miniHudStatus">{hud.statusMessage || '雑貨を1個置いたら交代 / 崩した人はHP-1'}</p>

          <button
            className={`gameHudButton ${hud.isAnswerChecked ? 'gameHudNextButton' : 'gameHudAnswerButton'}`}
            type="button"
            onClick={() => sendGameCommand(hud.isAnswerChecked ? 'next' : 'answer')}
          >
            {hud.isAnswerChecked ? hud.nextButtonLabel : (hud.actionButtonLabel || '置く！')}
          </button>
        </aside>
      </div>
    </div>
  )
}
