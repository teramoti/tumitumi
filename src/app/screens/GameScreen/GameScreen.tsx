import { useEffect, useRef, useState } from 'react'
import './GameScreen.css'
const gameBgm = '/assets/game_bgm.wav'
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
  cat: '/assets/animal_cat.png',
  dog: '/assets/animal_dog.png',
  panda: '/assets/animal_panda.png',
  turtle: '/assets/animal_turtle.png',
  penguin: '/assets/animal_penguin.png',
  elephant: '/assets/animal_elephant.png',
  giraffe: '/assets/animal_giraffe.png',
  seal: '/assets/animal_seal.png',
  drop: '/assets/animal_cat.png'
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
    actionButtonLabel: 'つむ！',
    ruleName: 'どうぶつタワーバトル',
    selectedItemLabel: 'どうぶつ x1',
    selectedItemDescription: 'DROP x1',
    selectedItemKey: 'cat',
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


  const progressRatio = Math.max(0, Math.min(1, hud.turnNumber / Math.max(1, hud.maxTurns)))
  const selectedItemImage = ITEM_IMAGE_PATHS[hud.selectedItemKey ?? 'cat'] ?? ITEM_IMAGE_PATHS.cat

  return (
    <div className="gameScreenShell">
      <div className="gameScreenPanel">
        <div className="gameCanvasHost" ref={ref} />

        <aside className="gameMiniHud" aria-label="ゲーム情報">
          <div className="hudCornerTape hudCornerTapeLeft" aria-hidden="true" />
          <div className="hudCornerTape hudCornerTapeRight" aria-hidden="true" />

          <div className="miniHudTopRow">
            <span className="miniHudBadge">{hud.ruleName || 'どうぶつタワーバトル'}</span>
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
              <p className="turnHeroText">{hud.isAnswerChecked ? 'つぎへ' : '場所をねらう'}</p>
            </div>
          </section>

          <div className="miniStatusRow">
            <div className="selectedItemMiniCard">
              <img className="selectedItemMiniImage" src={selectedItemImage} alt={hud.selectedItemLabel ?? 'どうぶつ'} />
              <div className="selectedItemMiniText">
                <strong>{hud.selectedItemLabel ?? 'どうぶつ'}</strong>
              </div>
            </div>
            <div className={`laneMiniBadge ${hud.selectedItemDescription === 'BONUS' ? 'laneMiniBadgeBonus' : ''} ${hud.selectedItemDescription === 'FEVER' ? 'laneMiniBadgeFever' : ''} ${hud.selectedItemDescription?.startsWith('DROP') || hud.selectedItemDescription === 'ROUND DROP' ? 'laneMiniBadgeDrop' : ''} ${hud.selectedItemDescription?.startsWith('ATTACK') ? 'laneMiniBadgeAttack' : ''}`}>
              <span>{hud.selectedItemDescription === 'BONUS' ? 'BONUS' : hud.selectedItemDescription === 'FEVER' ? 'FEVER' : hud.selectedItemDescription === 'ROUND DROP' ? 'ROUND' : hud.selectedItemDescription?.startsWith('ATTACK') ? 'ATK' : hud.selectedItemDescription?.startsWith('DROP') ? 'DROP' : 'TARGET'}</span>
              <strong>{hud.selectedItemDescription?.startsWith('ATTACK') ? hud.selectedItemDescription.replace('ATTACK ', '') : '← →'}</strong>
            </div>
          </div>

          <div className="miniProgressRail" aria-hidden="true">
            <span style={{ width: `${progressRatio * 100}%` }} />
          </div>

          <img className="controlsSticker" src="/assets/ui_controls_animal.png" alt="操作説明" />

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

          <div className={`keyboardOnlyPanel ${hud.isActionLocked ? 'keyboardOnlyLocked' : hud.isAnswerChecked ? 'keyboardOnlyNext' : 'keyboardOnlyReady'}`} aria-label="キーボード操作">
            <span>{hud.isAnswerChecked ? 'SPACE / ENTER' : '← →  W S'}</span>
            <strong>{hud.isAnswerChecked ? hud.nextButtonLabel : 'SPACE つむ'}</strong>
          </div>
        </aside>
      </div>
    </div>
  )
}
