/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
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
    body: '毎ターン3つの候補から1つを選ぶ。重いもの、転がるもの、細いものは点が高い。',
    command: '↑ ↓'
  },
  {
    title: '置き位置を決める',
    body: '左右キーでカーソルを動かす。TARGETに近いほど追加点を狙える。',
    command: '← →'
  },
  {
    title: 'BOOSTとタイミング',
    body: 'Bで1回だけBOOST。SPACEで置く。PERFECTなら追加点。2周目から障害物が落ちる。',
    command: 'B / SPACE'
  }
]

const difficulties: Difficulty[] = ['easy', 'normal', 'hard']

function TowerPreview() {
  return (
    <div className="stationeryPreview" aria-hidden="true">
      <div className="previewSky" />
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
      <div className="previewTargetBadge">TARGET</div>
      <div className="previewBoostBadge">BOOST x2.5</div>
      <div className="previewCursor" />
      <div className="previewDesk" />
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

  const maxTurns = getMaxTurns(difficulty)

  return (
    <div className="startShell">
      <main className="startStage">
        <header className="startTitleBlock">
          <span className="startBadge">DESK STACK</span>
          <h1>デスクつみタワー</h1>
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
