/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import './StartScreen.css'

import startBgm from '../../../../assets/audio/start.mp3'
import { playClickSound } from '../../audio/playClickSound'
import { DIFFICULTY_LABELS, getMaxTurns, type Difficulty } from '../../data/gameRules'

type Props = {
  onStart: (settings: {
    playerCount: number
    difficulty: Difficulty
  }) => void
}

const difficultyDescriptions: Record<Difficulty, string> = {
  easy: '置きやすい雑貨が多め。まずはここから',
  normal: '本・缶・定規が混ざる標準ルール',
  hard: '不安定な雑貨も増えるハラハラ設定'
}

const howToSlides = [
  {
    title: '遊び方 1/3',
    body: 'P1→P2→P3→P4の順番で、1人1個ずつ雑貨を置いて交代します。置ける雑貨は毎ターン3択です。'
  },
  {
    title: '遊び方 2/3',
    body: '本は安定、缶やテープは転がる、定規は細長くて危険。どの雑貨をどこへ置くかで次の人にプレッシャーを渡せます。'
  },
  {
    title: '遊び方 3/3',
    body: '机から雑貨が落ちたら、その番のプレイヤーがHP-1。HPは2。最後まで残った人が勝ちです。'
  }
]

function TowerPreview() {
  return (
    <div className="stationeryPreview" aria-hidden="true">
      <img className="previewRobot previewRobotLeft" src="/assets/images/characters/robot_p1.png" alt="" />
      <img className="previewRobot previewRobotRight" src="/assets/images/characters/robot_p2.png" alt="" />
      <img className="previewObject previewBook" src="/assets/images/items/book.png" alt="" />
      <img className="previewObject previewNotebook" src="/assets/images/items/notebook.png" alt="" />
      <img className="previewObject previewCan" src="/assets/images/items/smallCan.png" alt="" />
      <img className="previewObject previewEraser" src="/assets/images/items/eraser.png" alt="" />
      <img className="previewObject previewRuler" src="/assets/images/items/ruler.png" alt="" />
      <img className="previewObject previewBox" src="/assets/images/items/box.png" alt="" />
      <div className="previewDesk" />
    </div>
  )
}

export default function StartScreen({ onStart }: Props) {
  const [playerCount, setPlayerCount] = useState(4)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [isPlayerCountFixed, setIsPlayerCountFixed] = useState(false)
  const [isHowToOpen, setIsHowToOpen] = useState(false)
  const [isDifficultyDialogOpen, setIsDifficultyDialogOpen] = useState(false)
  const [howToIndex, setHowToIndex] = useState(0)
  const isPlayerCountFixedRef = useRef(false)
  const bgmRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(startBgm)
    audio.loop = true
    bgmRef.current = audio

    const playBgm = () => {
      void audio.play().catch(() => {
        // 自動再生が拒否された場合は、最初のユーザー操作で再試行する。
      })
    }

    playBgm()
    window.addEventListener('pointerdown', playBgm, { once: true })
    window.addEventListener('keydown', playBgm, { once: true })

    return () => {
      window.removeEventListener('pointerdown', playBgm)
      window.removeEventListener('keydown', playBgm)
      audio.pause()
      audio.currentTime = 0
      bgmRef.current = null
    }
  }, [])

  useEffect(() => {
    const queryPlayerCount = Number(
      new URLSearchParams(window.location.search).get('playerCount')
    )

    if (!Number.isNaN(queryPlayerCount) && queryPlayerCount >= 1) {
      const normalizedCount = Math.min(4, queryPlayerCount)
      setPlayerCount(normalizedCount)
      setIsPlayerCountFixed(true)
      isPlayerCountFixedRef.current = true
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'SET_PLAYER_COUNT') return
      if (isPlayerCountFixedRef.current) return

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

  const maxTurns = getMaxTurns(difficulty)
  const titleChars = Array.from('雑貨つみタワー')

  return (
    <div className="backColor startScreenYellowBackground">
      <div className="startScreen richStartPanel">
        <header className="titleArea richTitleArea">
          <div className="richTitleRow">
            <span className="titleDecoration" aria-hidden="true">◆</span>
            <h1 className="gameTitle richGameTitle jumpTitle" aria-label="雑貨つみタワー">
              {titleChars.map((char, index) => (
                <span
                  className="jumpTitleChar"
                  style={{ animationDelay: `${index * 0.08}s` }}
                  aria-hidden="true"
                  key={`${char}-${index}`}
                >
                  {char}
                </span>
              ))}
            </h1>
            <span className="titleDecoration" aria-hidden="true">◆</span>
          </div>

          <p className="titleLead">
            1人1個ずつ雑貨を積む、4人ターン制パーティゲーム！
          </p>
        </header>

        <section className="startMainArea">
          <div className="previewCard">
            <TowerPreview />
            <p className="previewCaption">置く / 後退 / 交代。崩した人がHP-1！</p>
          </div>

          <div className="settingCard">
            <div className="playerSetting">
              <label className="label">プレイヤー人数</label>
              <div className="playerCountRow">
                <p className="playerCount">{playerCount} 人</p>
                {!isPlayerCountFixed && (
                  <input
                    className="numberInput"
                    type="number"
                    min={1}
                    max={4}
                    value={playerCount}
                    onChange={(event) => {
                      setPlayerCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))
                    }}
                  />
                )}
              </div>
            </div>

            <div className="difficultySetting">
              <label className="label">難易度</label>
              <button
                className="difficultyOpenButton"
                type="button"
                onClick={() => {
                  playClickSound()
                  setIsDifficultyDialogOpen(true)
                }}
              >
                {DIFFICULTY_LABELS[difficulty]}
              </button>
              <p className="difficultyCaption">
                {difficultyDescriptions[difficulty]} / 最大{maxTurns}ターン
              </p>
            </div>

            <div className="buttonArea">
              <button
                className="startButton"
                type="button"
                onClick={() => {
                  playClickSound()
                  onStart({ playerCount, difficulty })
                }}
              >
                GAME START
              </button>

              <button
                className="howToButton"
                type="button"
                onClick={() => {
                  playClickSound()
                  setHowToIndex(0)
                  setIsHowToOpen(true)
                }}
              >
                遊び方
              </button>
            </div>
          </div>
        </section>

        {isDifficultyDialogOpen && (
          <div className="difficultyDialogLayer" role="presentation">
            <div className="difficultyDialog" role="dialog" aria-modal="true" aria-label="難易度選択">
              <h2>難易度を選ぶ</h2>
              <div className="difficultyChoiceList">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
                  <button
                    className={`difficultyChoiceButton ${difficulty === level ? 'difficultyChoiceSelected' : ''}`}
                    type="button"
                    key={level}
                    onClick={() => {
                      playClickSound()
                      setDifficulty(level)
                      setIsDifficultyDialogOpen(false)
                    }}
                  >
                    <strong>{DIFFICULTY_LABELS[level]}</strong>
                    <span>{difficultyDescriptions[level]}</span>
                  </button>
                ))}
              </div>
              <button
                className="difficultyDialogClose"
                type="button"
                onClick={() => {
                  playClickSound()
                  setIsDifficultyDialogOpen(false)
                }}
              >
                とじる
              </button>
            </div>
          </div>
        )}

        {isHowToOpen && (
          <div className="howToLayer" role="presentation">
            <div className="howToDialog" role="dialog" aria-modal="true" aria-label="遊び方">
              <h2>{howToSlides[howToIndex].title}</h2>
              <p>{howToSlides[howToIndex].body}</p>
              <div className="howToNavRow">
                <button
                  className="howToNav"
                  type="button"
                  disabled={howToIndex === 0}
                  onClick={() => {
                    playClickSound()
                    setHowToIndex((current) => Math.max(0, current - 1))
                  }}
                >
                  もどる
                </button>
                <button
                  className="howToNav"
                  type="button"
                  disabled={howToIndex === howToSlides.length - 1}
                  onClick={() => {
                    playClickSound()
                    setHowToIndex((current) => Math.min(howToSlides.length - 1, current + 1))
                  }}
                >
                  つぎ
                </button>
              </div>
              <button
                className="howToClose"
                type="button"
                onClick={() => {
                  playClickSound()
                  setIsHowToOpen(false)
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
