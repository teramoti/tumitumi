import { useEffect, useRef, useState } from 'react'
import './GameScreen.css'
const gameBgm = '/assets/game_bgm.wav'
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
  selectedItemLabel?: string
  selectedItemDescription?: string
  selectedItemKey?: string
  selectedLaneIndex?: number
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

const ITEM_IMAGE_PATHS: Record<string, string> = {
  kumiNormal: '/assets/kumi_block_normal.png',
  kumiWide: '/assets/kumi_block_wide.png',
  kumiLight: '/assets/kumi_block_light.png',
  kumiRisky: '/assets/kumi_block_risky.png',
  kumiGuard: '/assets/kumi_block_guard.png',
  book: '/assets/item_book.png',
  eraser: '/assets/item_eraser.png',
  can: '/assets/item_smallCan.png',
  mug: '/assets/item_mug.png',
  tape: '/assets/item_tape.png',
  battery: '/assets/item_battery.png',
  ruler: '/assets/item_ruler.png',
  box: '/assets/item_box.png',
  drop: '/assets/item_smallCan.png'
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
    actionButtonLabel: '落とす！',
    ruleName: '逆ジェンガバトル',
    selectedItemLabel: '落下 1個',
    selectedItemDescription: 'DROP x1',
    selectedItemKey: 'can',
    selectedLaneIndex: 3,
    aliveCount: settings.playerCount,
    difficultyLabel: DIFFICULTY_LABELS[difficultyForInit],
    isActionLocked: false
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
            <span className="miniHudBadge">{hud.ruleName || '逆ジェンガバトル'}</span>
            <span className="miniHudDifficulty">{hud.difficultyLabel}</span>
          </div>

          <section className="turnHeroCard">
            <img
              className="turnHeroMarker"
              src={PLAYER_MARKER_IMAGE_PATHS[hud.currentPlayerIndex]}
              alt={`Player ${hud.currentPlayerIndex + 1}`}
            />
            <div className="turnHeroInfo">
              <div className="turnHeroRow">
                <span className="turnHeroChip">ROUND {hud.round}</span>
                <span className="turnHeroChip">TURN {hud.turnNumber}/{hud.maxTurns}</span>
                <span className="turnHeroChip turnHeroCombo">C{hud.combo}</span>
              </div>
              <p className="turnHeroPlayer">P{hud.currentPlayerIndex + 1} TURN</p>
              <p className="turnHeroText">{hud.isAnswerChecked ? 'つぎへ' : '落とす場所をねらう'}</p>
            </div>
          </section>

          <div className="miniStatusRow">
            <div className="selectedItemMiniCard">
              <img className="selectedItemMiniImage" src={selectedItemImage} alt={hud.selectedItemLabel ?? '落下物'} />
              <div className="selectedItemMiniText">
                <strong>{hud.selectedItemLabel ?? '落下物'}</strong>
              </div>
            </div>
            <div className={`laneMiniBadge ${hud.selectedItemDescription === 'BONUS' ? 'laneMiniBadgeBonus' : ''} ${hud.selectedItemDescription === 'FEVER' ? 'laneMiniBadgeFever' : ''} ${hud.selectedItemDescription?.startsWith('DROP') ? 'laneMiniBadgeDrop' : ''}`}>
              <span>{hud.selectedItemDescription === 'BONUS' ? 'BONUS' : hud.selectedItemDescription === 'FEVER' ? 'FEVER' : hud.selectedItemDescription?.startsWith('DROP') ? 'DROP' : 'L'}</span>
              <strong>{hud.selectedLaneIndex ?? 3}</strong>
            </div>
          </div>

          <div className="miniProgressRail" aria-hidden="true">
            <span style={{ width: `${progressRatio * 100}%` }} />
          </div>

          <img className="controlsSticker" src="/assets/ui_controls_hint.png" alt="操作説明" />

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
                    <img className="miniPlayerMarker" src={PLAYER_MARKER_IMAGE_PATHS[index]} alt="" />
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

          <button
            className={`gameHudButton ${hud.isActionLocked ? 'gameHudLockedButton' : hud.isAnswerChecked ? 'gameHudNextButton' : 'gameHudAnswerButton'}`}
            type="button"
            disabled={hud.isActionLocked}
            onClick={() => sendGameCommand(hud.isAnswerChecked ? 'next' : 'answer')}
          >
            {hud.isAnswerChecked ? hud.nextButtonLabel : (hud.actionButtonLabel || '落とす！')}
          </button>
        </aside>
      </div>
    </div>
  )
}
