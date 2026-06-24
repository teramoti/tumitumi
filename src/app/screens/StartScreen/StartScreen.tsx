/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
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
  easy: 'やさしめ / 最大16ターン',
  normal: 'ふつう / 最大20ターン',
  hard: 'ぐらぐら / 最大24ターン'
}

const howToSlides = [
  {
    title: '遊び方 1/3',
    body: '落とす場所をねらう',
    image: '/assets/ui_battle_howto_1.png'
  },
  {
    title: '遊び方 2/3',
    body: '上から落とす',
    image: '/assets/ui_battle_howto_2.png'
  },
  {
    title: '遊び方 3/3',
    body: 'ラウンドごとに増える',
    image: '/assets/ui_battle_howto_3.png'
  }
]

function TowerPreview() {
  return (
    <div className="stationeryPreview" aria-hidden="true">
      <img className="previewMarker previewMarkerLeft" src="/assets/player_badge_p1.png" alt="" />
      <img className="previewMarker previewMarkerRight" src="/assets/player_badge_p2.png" alt="" />
      <img className="previewObject previewBook" src="/assets/kumi_block_wide.png" alt="" />
      <img className="previewObject previewNotebook" src="/assets/kumi_block_normal.png" alt="" />
      <img className="previewObject previewCan" src="/assets/kumi_block_light.png" alt="" />
      <img className="previewObject previewEraser" src="/assets/kumi_block_risky.png" alt="" />
      <img className="previewObject previewRuler" src="/assets/kumi_block_guard.png" alt="" />
      <img className="previewObject previewBox" src="/assets/kumi_block_normal.png" alt="" />
      <img className="previewObject previewCore" src="/assets/tower_core.png" alt="" />
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

  useEffect(() => {
    const audio = new Audio(startBgm)
    audio.loop = true

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

  return (
    <div className="backColor startScreenYellowBackground">
      <div className="startScreen richStartPanel">
        <header className="titleArea richTitleArea">
          <img className="titleLogoImage" src="/assets/ui_battle_title.png" alt="逆ジェンガバトル" />
        </header>

        <section className="startMainArea compactStartMainArea">
          <div className="previewCard compactPreviewCard">
            <TowerPreview />
            <img className="startRuleSticker" src="/assets/ui_battle_rule.png" alt="場所を選ぶ、落とす、たえる" />
          </div>

          <div className="settingCard compactSettingCard">
            <div className="playerSetting compactBlock">
              <label className="label">プレイヤー</label>
              <div className="playerCountRow compactPlayerRow">
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

            <div className="difficultySetting compactBlock">
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
                {difficultyDescriptions[difficulty]} / {maxTurns}ターン
              </p>
            </div>

            <div className="buttonArea compactButtonArea">
              <button
                className="startButton"
                type="button"
                onClick={() => {
                  playClickSound()
                  onStart({ playerCount, difficulty })
                }}
              >
                START
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
                HOW TO
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
              <img className="howToImage" src={howToSlides[howToIndex].image} alt={howToSlides[howToIndex].body} />
              <p>{howToSlides[howToIndex].body}</p>
              <div className="howToNavRow">
                <button
                  className="howToNav"
                  type="button"
                  disabled={howToIndex === 0}
                  onClick={() => {
                    playClickSound()
                    setHowToIndex((value) => Math.max(0, value - 1))
                  }}
                >
                  まえ
                </button>
                {howToIndex < howToSlides.length - 1 ? (
                  <button
                    className="howToNav"
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setHowToIndex((value) => Math.min(howToSlides.length - 1, value + 1))
                    }}
                  >
                    つぎ
                  </button>
                ) : (
                  <button
                    className="howToClose"
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setIsHowToOpen(false)
                    }}
                  >
                    とじる
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
