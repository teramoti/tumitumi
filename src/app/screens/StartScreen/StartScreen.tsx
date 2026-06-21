/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './StartScreen.css'

const startBgm = '/assets/start_bgm.wav'

import { playClickSound } from '../../audio/playClickSound'
import { DIFFICULTY_LABELS, getMaxTurns, type Difficulty } from '../../data/gameRules'

type Props = {
  onStart: (settings: {
    playerCount: number
    difficulty: Difficulty
  }) => void
}

const difficultyDescriptions: Record<Difficulty, string> = {
  easy: '安定雑貨中心',
  normal: '標準セット',
  hard: '危険雑貨多め'
}

const howToSlides = [
  {
    title: '雑貨を選ぶ',
    body: '毎ターン4〜5個の候補から1つを選ぶ。重いもの、転がるもの、細いものは点が高い。',
    command: '↑ ↓'
  },
  {
    title: '置き位置を決める',
    body: '左右キーでカーソルを動かす。TARGETに近いほど追加点を狙える。',
    command: '← →'
  },
  {
    title: 'BOOSTとタイミング',
    body: 'Bで1回だけBOOST。SPACEで置く。PERFECTなら追加点だけでなく、物理的にも少し安定する。2周目から障害物が落ちる。',
    command: 'B / SPACE'
  }
]

const difficulties: Difficulty[] = ['easy', 'normal', 'hard']

const CONFETTI_COLORS = ['#ef5947', '#ffd65f', '#2aa7a3', '#4b72d9', '#ffffff']

function TitleFxCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const colors = ['#ef5947', '#ffd65f', '#2aa7a3', '#4b72d9', '#ffffff']
    let animationFrame = 0
    let lastFrame = 0

    const drawStar = (x: number, y: number, radius: number, rotation: number, color: string, alpha: number) => {
      context.save()
      context.translate(x, y)
      context.rotate(rotation)
      context.globalAlpha = alpha
      context.fillStyle = color
      context.beginPath()
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5
        const distance = point % 2 === 0 ? radius : radius * 0.42
        context.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance)
      }
      context.closePath()
      context.fill()
      context.restore()
    }

    const render = (time: number) => {
      animationFrame = window.requestAnimationFrame(render)
      if (time - lastFrame < 33) return
      lastFrame = time

      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      const cycle = reduceMotion ? 0.18 : (time % 2200) / 2200
      const originX = width * 0.54
      const originY = height * 0.68
      const fade = Math.max(0, 1 - cycle)

      context.save()
      context.globalAlpha = fade * 0.8
      context.lineWidth = 5
      context.strokeStyle = '#fff4b8'
      context.beginPath()
      context.arc(originX, originY, 26 + cycle * 150, 0, Math.PI * 2)
      context.stroke()
      context.restore()

      for (let index = 0; index < 22; index += 1) {
        const angle = -Math.PI * 0.92 + index * (Math.PI * 1.84 / 21)
        const speed = 92 + (index % 6) * 18
        const distance = 20 + speed * cycle
        const x = originX + Math.cos(angle) * distance
        const y = originY + Math.sin(angle) * distance + cycle * cycle * 82
        const color = colors[index % colors.length]
        if (index % 5 === 0) {
          drawStar(x, y, 7 + (index % 3) * 2, cycle * 5 + index, color, fade)
        } else {
          context.save()
          context.globalAlpha = fade
          context.strokeStyle = color
          context.lineWidth = 4
          context.lineCap = 'round'
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(x - Math.cos(angle) * 14, y - Math.sin(angle) * 14)
          context.stroke()
          context.restore()
        }
      }

      if (reduceMotion) window.cancelAnimationFrame(animationFrame)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  return <canvas className="titleFxCanvas" ref={canvasRef} />
}

function TowerPreview() {
  return (
    <div className="stationeryPreview" aria-hidden="true">
      <div className="previewSky" />
      <div className="titleConfetti">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            style={{
              '--confetti-x': `${3 + ((index * 37) % 94)}%`,
              '--confetti-delay': `${-(index * 0.29)}s`,
              '--confetti-color': CONFETTI_COLORS[index % CONFETTI_COLORS.length]
            } as CSSProperties}
          />
        ))}
      </div>
      <div className="previewSpotlight previewSpotlightLeft" />
      <div className="previewSpotlight previewSpotlightRight" />
      <img className="previewRobot previewRobotLeft" src="/assets/char_robot_p1.png" alt="" />
      <img className="previewRobot previewRobotRight" src="/assets/char_robot_p2.png" alt="" />
      <img className="previewObject previewBook" src="/assets/item_book.png" alt="" />
      <img className="previewObject previewNotebook" src="/assets/item_notebook.png" alt="" />
      <img className="previewObject previewCan" src="/assets/item_smallCan.png" alt="" />
      <img className="previewObject previewEraser" src="/assets/item_eraser.png" alt="" />
      <img className="previewObject previewRuler" src="/assets/item_ruler.png" alt="" />
      <img className="previewObject previewBox" src="/assets/item_box.png" alt="" />
      <img className="previewObject previewTape" src="/assets/item_tape.png" alt="" />
      <img className="previewDropObject previewDropMug" src="/assets/item_mug.png" alt="" />
      <img className="previewDropObject previewDropBattery" src="/assets/item_battery.png" alt="" />
      <img className="previewDropObject previewDropEraser" src="/assets/item_eraser.png" alt="" />
      <div className="previewTargetBadge">TARGET</div>
      <div className="previewBoostBadge">BOOST x2.5</div>
      <div className="previewCursor" />
      <div className="previewDesk" />
      <div className="previewImpactRing" />
      <TitleFxCanvas />
    </div>
  )
}

export default function StartScreen({ onStart }: Props) {
  const [playerCount, setPlayerCount] = useState(4)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [isHowToOpen, setIsHowToOpen] = useState(false)
  const [howToIndex, setHowToIndex] = useState(0)

  useEffect(() => {
    const audio = new Audio(startBgm)
    audio.loop = true

    const playBgm = () => {
      void audio.play().catch(() => {
        // 自動再生が拒否された場合は、最初のユーザー操作で再試行する。
      })
    }

    playBgm()
    window.addEventListener('keydown', playBgm, { once: true })

    return () => {
      window.removeEventListener('keydown', playBgm)
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  useEffect(() => {
    const queryPlayerCount = Number(
      new URLSearchParams(window.location.search).get('playerCount')
    )

    if (!Number.isNaN(queryPlayerCount) && queryPlayerCount >= 1) {
      const normalizedCount = Math.min(4, queryPlayerCount)
      setPlayerCount(normalizedCount)
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'SET_PLAYER_COUNT') return

      const count = Number(event.data.playerCount)
      if (!Number.isNaN(count) && count >= 1) {
        setPlayerCount(Math.min(4, count))
      }
    }

    window.parent.postMessage({ type: 'READY' }, '*')
    window.addEventListener('message', handler)

    return () => {
      window.removeEventListener('message', handler)
    }
  }, [])

  useEffect(() => {
    const moveDifficulty = (direction: number) => {
      setDifficulty((current) => {
        const currentIndex = difficulties.indexOf(current)
        const nextIndex = (currentIndex + direction + difficulties.length) % difficulties.length
        return difficulties[nextIndex]
      })
    }

    const moveHowTo = (direction: number) => {
      setHowToIndex((current) => Math.max(0, Math.min(howToSlides.length - 1, current + direction)))
    }

    const handler = (event: KeyboardEvent) => {
      const key = event.key
      const isConfirmKey = key === ' ' || key === 'Space' || key === 'Spacebar' || key === 'Enter'

      if (isHowToOpen) {
        if (['ArrowLeft', 'ArrowUp'].includes(key)) {
          event.preventDefault()
          playClickSound()
          moveHowTo(-1)
          return
        }

        if (['ArrowRight', 'ArrowDown'].includes(key) || isConfirmKey) {
          event.preventDefault()
          playClickSound()
          if (howToIndex >= howToSlides.length - 1) {
            setIsHowToOpen(false)
          } else {
            moveHowTo(1)
          }
          return
        }

        if (key === 'Escape') {
          event.preventDefault()
          playClickSound()
          setIsHowToOpen(false)
        }
        return
      }

      if (key === 'ArrowUp') {
        event.preventDefault()
        playClickSound()
        moveDifficulty(-1)
        return
      }

      if (key === 'ArrowDown') {
        event.preventDefault()
        playClickSound()
        moveDifficulty(1)
        return
      }

      if (key === 'ArrowLeft') {
        event.preventDefault()
        playClickSound()
        moveDifficulty(-1)
        return
      }

      if (key === 'ArrowRight') {
        event.preventDefault()
        playClickSound()
        moveDifficulty(1)
        return
      }

      if (!event.repeat && isConfirmKey) {
        event.preventDefault()
        playClickSound()
        onStart({ playerCount, difficulty })
        return
      }

      if (!event.repeat && key.toLowerCase() === 'h') {
        event.preventDefault()
        playClickSound()
        setHowToIndex(0)
        setIsHowToOpen(true)
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [difficulty, howToIndex, isHowToOpen, onStart, playerCount])

  const maxTurns = getMaxTurns(difficulty, playerCount)

  return (
    <div className="startShell">
      <main className="startStage">
        <div className="titleScreenFlash" aria-hidden="true" />
        <header className="startTitleBlock">
          <span className="startBadge">DESK STACK EX</span>
          <h1>デスクつみタワーEX</h1>
          <p>短い足場で一気に勝負するターン制バランスゲーム</p>
        </header>

        <section className="startPreviewArea" aria-label="ゲームプレビュー">
          <TowerPreview />
          <div className="startRuleRibbon" aria-label="基本操作">
            <span>↑↓ SELECT</span>
            <span>←→ AIM</span>
            <span>B BOOST</span>
            <span>SPACE DROP</span>
          </div>
        </section>

        <aside className="startControlDock" aria-label="ゲーム設定">
          <div className="startDockTop">
            <span>PLAYERS</span>
            <strong>{playerCount}</strong>
            <em>GAME MANAGER</em>
          </div>

          <div className="difficultyDock">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
              <div
                className={`difficultyDockItem ${difficulty === level ? 'difficultyDockItemActive' : ''}`}
                key={level}
              >
                <strong>{DIFFICULTY_LABELS[level]}</strong>
                <span>{difficultyDescriptions[level]}</span>
              </div>
            ))}
          </div>

          <div className="turnInfoPanel">
            <span>最大ターン</span>
            <strong>{maxTurns}</strong>
          </div>

          <div
            className="startPrimaryButton"
          >
            SPACE / ENTER
          </div>

          <div
            className="startSubButton"
          >
            H HOW TO
          </div>
        </aside>

        {isHowToOpen && (
          <div className="howToLayer" role="presentation">
            <div className="howToDialog" role="dialog" aria-modal="true" aria-label="遊び方">
              <div className="howToHeader">
                <span>{howToIndex + 1}/3</span>
                <h2>{howToSlides[howToIndex].title}</h2>
              </div>

              <div className="howToCommand">
                <strong>{howToSlides[howToIndex].command}</strong>
              </div>

              <p>{howToSlides[howToIndex].body}</p>

              <div className="howToNavRow">
                <div
                  className="howToNav"
                  aria-disabled={howToIndex === 0}
                >
                  まえ
                </div>
                {howToIndex < howToSlides.length - 1 ? (
                  <div
                    className="howToNav howToNavPrimary"
                  >
                    つぎ
                  </div>
                ) : (
                  <div
                    className="howToNav howToNavPrimary"
                  >
                    とじる
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
