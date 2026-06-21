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
  streaks?: number[]
  boostAvailable?: boolean[]
  boostArmed?: boolean
  boostMultiplier?: number
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
  selectedItemPoints?: number
  selectedItemIcon?: string
  selectedItemColor?: number
  selectedItemKey?: string
  selectedPlacementPercent?: number
  selectedLaneLabel?: string
  targetPlacementPercent?: number
  targetBonus?: number
  isTargetMatched?: boolean
  aliveCount?: number
  difficultyLabel?: string
  challengeLabel?: string
  challengeHint?: string
  challengeBonus?: number
  partyEventLabel?: string
  partyEventHint?: string
  roundDropLabel?: string
  roundItemScale?: number
  projectedTurnPoints?: number
  projectedBonusPoints?: number
  timingRuleLabel?: string
  feverLabel?: string
  feverReady?: boolean
  streak?: number
  stackHeight?: number
  choiceCount?: number
}

const ROBOT_IMAGE_PATHS = [
  '/assets/char_robot_p1.png',
  '/assets/char_robot_p2.png',
  '/assets/char_robot_p3.png',
  '/assets/char_robot_p4.png'
]

const ITEM_IMAGE_PATHS: Record<string, string> = {
  book: '/assets/item_book.png',
  notebook: '/assets/item_notebook.png',
  eraser: '/assets/item_eraser.png',
  box: '/assets/item_box.png',
  pencilCase: '/assets/item_pencilCase.png',
  smallCan: '/assets/item_smallCan.png',
  tape: '/assets/item_tape.png',
  ruler: '/assets/item_ruler.png',
  mug: '/assets/item_mug.png',
  battery: '/assets/item_battery.png',
  marker: '/assets/item_marker.png',
  glue: '/assets/item_glue.png',
  stapler: '/assets/item_stapler.png',
  scissors: '/assets/item_scissors.png',
  phone: '/assets/item_phone.png',
  dice: '/assets/item_dice.png',
  clip: '/assets/item_clip.png',
  key: '/assets/item_key.png',
  watch: '/assets/item_watch.png',
  card: '/assets/item_card.png',
  headphones: '/assets/item_headphones.png',
  earphoneJack: '/assets/item_earphoneJack.png'
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
    streaks: Array(settings.playerCount).fill(0),
    boostAvailable: Array(settings.playerCount).fill(true),
    boostArmed: false,
    boostMultiplier: 2.5,
    turnNumber: 0,
    maxTurns: getMaxTurns(difficultyForInit, settings.playerCount),
    round: 1,
    scores: Array(settings.playerCount).fill(null),
    currentScore: 0,
    combo: 0,
    timeLeft: getMaxTurns(difficultyForInit, settings.playerCount),
    isAnswerChecked: false,
    nextButtonLabel: '次の人へ',
    actionButtonLabel: '置く！',
    ruleName: 'デスクつみタワーEX',
    selectedItemLabel: '雑貨',
    selectedItemDescription: '置くものを選んでね',
    selectedItemPoints: 0,
    selectedItemIcon: 'ITEM',
    selectedItemColor: 0x4b72d9,
    selectedItemKey: 'book',
    selectedPlacementPercent: 50,
    selectedLaneLabel: '中央',
    targetPlacementPercent: 50,
    targetBonus: 60,
    isTargetMatched: true,
    aliveCount: settings.playerCount,
    difficultyLabel: DIFFICULTY_LABELS[difficultyForInit],
    challengeLabel: '安全第一',
    challengeHint: '崩さず置く',
    challengeBonus: 40,
    partyEventLabel: '通常ラウンド',
    partyEventHint: 'お題を狙う',
    roundDropLabel: '',
    roundItemScale: 1,
    projectedTurnPoints: 0,
    projectedBonusPoints: 0,
    timingRuleLabel: 'PERF +70',
    feverLabel: 'FVR +100',
    feverReady: false,
    streak: 0,
    stackHeight: 0,
    choiceCount: 3
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

  const progressRatio = Math.max(0, Math.min(1, hud.turnNumber / Math.max(1, hud.maxTurns)))
  const selectedItemImage = ITEM_IMAGE_PATHS[hud.selectedItemKey ?? '']
  const selectedItemColor = `#${(hud.selectedItemColor ?? 0x4b72d9).toString(16).padStart(6, '0')}`

  return (
    <div className="gameScreenShell">
      <div className="gameScreenPanel">
        <div className="gameCanvasHost" ref={ref} />

        <aside className="gameMiniHud" aria-label="ゲーム情報">
          <div className="hudCornerTape hudCornerTapeLeft" aria-hidden="true" />
          <div className="hudCornerTape hudCornerTapeRight" aria-hidden="true" />

          <div className="miniHudTopRow">
            <span className="miniHudBadge">{hud.ruleName || 'デスクつみタワーEX'}</span>
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
              <p className="turnHeroText">{hud.isAnswerChecked ? 'つぎへ' : 'えらんで おく'}</p>
            </div>
          </section>

          <div className="miniStatusRow">
            <div className="selectedItemMiniCard">
              {selectedItemImage ? (
                <img className="selectedItemMiniImage" src={selectedItemImage} alt={hud.selectedItemLabel ?? '雑貨'} />
              ) : (
                <span className="selectedItemFallback" style={{ backgroundColor: selectedItemColor }}>
                  {hud.selectedItemIcon ?? 'ITEM'}
                </span>
              )}
              <div className="selectedItemMiniText">
                <strong>{hud.selectedItemLabel ?? '雑貨'}</strong>
                <span>基礎点 +{hud.selectedItemPoints ?? 0}</span>
              </div>
            </div>
            <div className="laneMiniBadge">
              <span>位置</span>
              <strong>{hud.selectedLaneLabel ?? '中央'}</strong>
              <em>{hud.selectedPlacementPercent ?? 50}%</em>
            </div>
          </div>

          <div className="scoreStrip" aria-label="スコア">
            <span className={hud.isTargetMatched ? 'scoreTargetHit' : ''}>TGT {hud.targetPlacementPercent ?? 50}%</span>
            <span>NEXT +{hud.projectedTurnPoints ?? hud.selectedItemPoints ?? 0}</span>
            <span>HIGH {hud.stackHeight ?? 0}px</span>
            <span>TOTAL {hud.currentScore}</span>
          </div>

          <section className="partyEventCard" aria-label="ラウンドイベント">
            <div>
              <span>EVENT</span>
              <strong>{hud.partyEventLabel ?? '通常ラウンド'}</strong>
            </div>
            <p>{hud.partyEventHint ?? ''}</p>
            <p>CHOICE {hud.choiceCount ?? 3} / SIZE x{(hud.roundItemScale ?? 1).toFixed(1)} / {hud.boostArmed ? 'BST x2.5' : hud.boostAvailable?.[hud.currentPlayerIndex] ? 'B x2.5' : 'B USED'} / S{hud.streak ?? 0}</p>
          </section>

          <section className="challengeCard" aria-label="お題">
            <div>
              <span>CHALLENGE</span>
              <strong>{hud.challengeLabel ?? '安全第一'}</strong>
            </div>
            <p>{hud.challengeHint ?? '崩さず置く'} +{hud.challengeBonus ?? 40}</p>
          </section>

          <div className="miniProgressRail" aria-hidden="true">
            <span style={{ width: `${progressRatio * 100}%` }} />
          </div>

          <div className="controlStrip" aria-label="操作説明">
            <span>←→ 場所</span>
            <span>↑↓ 雑貨</span>
            <span>B BOOST</span>
            <span>PERFECTで安定</span>
          </div>

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

          <div
            className={`gameHudButton ${hud.isAnswerChecked ? 'gameHudNextButton' : 'gameHudAnswerButton'}`}
            aria-label={hud.isAnswerChecked ? 'SPACEまたはENTERで次へ' : 'SPACEまたはENTERで置く'}
          >
            {hud.isAnswerChecked ? 'SPACE / ENTER' : 'SPACE 置く'}
          </div>
        </aside>
      </div>
    </div>
  )
}
