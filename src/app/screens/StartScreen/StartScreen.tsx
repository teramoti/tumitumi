// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
import { useEffect, useState } from 'react'
import './StartScreen.css'

const startBgm = '/assets/start_bgm.wav'

import { AUDIO_LEVELS } from '../../audio/audioLevels'
import { playClickSound } from '../../audio/playClickSound'
import { DIFFICULTY_LABELS, getMaxTurns, type Difficulty } from '../../data/gameRules'

type Props = {
  playerCount: number
  onStart: (settings: {
    difficulty: Difficulty
  }) => void
}

const difficultyOrder: Difficulty[] = ['easy', 'normal', 'hard']

const howToSlides = [
  { image: '/assets/ui_jam_howto_1.png', alt: '位置・角度・落とす' },
  { image: '/assets/ui_jam_howto_4.png', alt: '勝敗とリザルト' }
]

function TowerPreview() {
  return (
    <div className="animalTowerPreview finalPosterPreview jamTitleStage" aria-hidden="true">
      <div className="jamTitleMountains" />
      <div className="jamTitleSpotlight jamTitleSpotlightLeft" />
      <div className="jamTitleSpotlight jamTitleSpotlightRight" />
      <div className="jamTitleDropRail" />
      <div className="jamTitleArrow" />
      <div className="jamAnimalMiniStack">
        <img className="jamMiniAnimal jamMiniGiraffe" src="/assets/animal_giraffe.png" alt="" />
        <img className="jamMiniAnimal jamMiniRabbit" src="/assets/animal_rabbit.png" alt="" />
        <img className="jamMiniAnimal jamMiniPanda" src="/assets/animal_panda.png" alt="" />
        <img className="jamMiniAnimal jamMiniFox" src="/assets/animal_fox.png" alt="" />
        <img className="jamMiniAnimal jamMiniTurtle" src="/assets/animal_turtle.png" alt="" />
        <img className="jamMiniAnimal jamMiniElephant" src="/assets/animal_elephant.png" alt="" />
      </div>
      <div className="jamTitleStageBase">DROP ZONE</div>
      <div className="finalPreviewScanline" />
    </div>
  )
}

export default function StartScreen({ playerCount, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(1)
  const [isHowToOpen, setIsHowToOpen] = useState(false)
  const [howToIndex, setHowToIndex] = useState(0)

  useEffect(() => {
    const audio = new Audio(startBgm)
    audio.loop = true
    audio.volume = AUDIO_LEVELS.startBgm

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
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key

      if (isHowToOpen) {
        if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
          event.preventDefault()
          playClickSound()
          setHowToIndex((value) => Math.max(0, value - 1))
          return
        }

        if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
          event.preventDefault()
          playClickSound()
          setHowToIndex((value) => {
            if (value >= howToSlides.length - 1) {
              setIsHowToOpen(false)
              return 0
            }
            return value + 1
          })
          return
        }

        if (key === ' ' || key === 'Enter' || key === 'Escape') {
          event.preventDefault()
          playClickSound()
          setIsHowToOpen(false)
          setHowToIndex(0)
          return
        }

        return
      }

      if (key === 'ArrowUp' || key.toLowerCase() === 'w') {
        event.preventDefault()
        playClickSound()
        setSelectedMenuIndex((value) => (value + 2) % 3)
        return
      }

      if (key === 'ArrowDown' || key.toLowerCase() === 's') {
        event.preventDefault()
        playClickSound()
        setSelectedMenuIndex((value) => (value + 1) % 3)
        return
      }

      if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
        event.preventDefault()
        if (selectedMenuIndex === 0) {
          playClickSound()
          setDifficulty((value) => {
            const index = difficultyOrder.indexOf(value)
            return difficultyOrder[(index + difficultyOrder.length - 1) % difficultyOrder.length]
          })
        }
        return
      }

      if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
        event.preventDefault()
        if (selectedMenuIndex === 0) {
          playClickSound()
          setDifficulty((value) => {
            const index = difficultyOrder.indexOf(value)
            return difficultyOrder[(index + 1) % difficultyOrder.length]
          })
        }
        return
      }

      if (key === ' ' || key === 'Enter') {
        event.preventDefault()
        playClickSound()
        if (selectedMenuIndex === 1) onStart({ difficulty })
        if (selectedMenuIndex === 0) {
          setDifficulty((value) => {
            const index = difficultyOrder.indexOf(value)
            return difficultyOrder[(index + 1) % difficultyOrder.length]
          })
        }
        if (selectedMenuIndex === 2) {
          setHowToIndex(0)
          setIsHowToOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [difficulty, isHowToOpen, onStart, selectedMenuIndex])

  const maxTurns = getMaxTurns(difficulty)

  return (
    <div className="animalStartBack finalStartBack">
      <main className="animalStartScreen finalStartScreen">
        <TowerPreview />

        <header className="finalHeroHeader">
          <div className="finalHeroMeta">GAME JAM FINAL / 30-60 SEC PARTY</div>
          <h1>ぐらぐら<br />アニマルタワー</h1>
          <p>会場で説明なしでも遊べる。動物は手番開始で固定、操作は位置・角度・落とすだけ。</p>
        </header>

        <aside className="finalCommandDeck" aria-label="タイトルメニュー">
          <div className="finalDeckInfo">
            <span>LOCAL JAM</span>
            <strong>{playerCount}P</strong>
            <em>交代制</em>
          </div>

          <div
            className={`finalDifficultyCard ${selectedMenuIndex === 0 ? 'menuFocus' : ''}`}
            onMouseEnter={() => setSelectedMenuIndex(0)}
            onClick={() => {
              playClickSound()
              setDifficulty((value) => {
                const index = difficultyOrder.indexOf(value)
                return difficultyOrder[(index + 1) % difficultyOrder.length]
              })
            }}
            onWheel={(event) => {
              event.preventDefault()
              playClickSound()
              setDifficulty((value) => {
                const index = difficultyOrder.indexOf(value)
                return difficultyOrder[(index + (event.deltaY > 0 ? 1 : difficultyOrder.length - 1)) % difficultyOrder.length]
              })
            }}
          >
            <span>DIFFICULTY</span>
            <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
            <em>{maxTurns} TURN</em>
          </div>

          <img className="finalRuleStrip" src="/assets/ui_jam_rule_strip.png" alt="操作説明" />


          <div className="finalDeckButtons">
            <button
              type="button"
              className={`finalStartButton ${selectedMenuIndex === 1 ? 'menuFocus' : ''}`}
              onMouseEnter={() => setSelectedMenuIndex(1)}
              onClick={() => {
                playClickSound()
                onStart({ difficulty })
              }}
            >
              START
            </button>
            <button
              type="button"
              className={`finalHowToButton ${selectedMenuIndex === 2 ? 'menuFocus' : ''}`}
              onMouseEnter={() => setSelectedMenuIndex(2)}
              onClick={() => {
                playClickSound()
                setHowToIndex(0)
                setIsHowToOpen(true)
              }}
            >
              HOW TO
            </button>
          </div>
        </aside>

        <div className="finalKeyHint" aria-hidden="true">
          <span>↑↓ SELECT</span>
          <span>←→ DIFFICULTY</span>
          <span>ENTER / CLICK</span>
        </div>

        {isHowToOpen && (
          <div className="animalDialogLayer finalHowToLayer" role="presentation">
            <div
              className="animalHowToDialog finalHowToDialog"
              role="dialog"
              aria-modal="true"
              aria-label="遊び方"
              onClick={() => {
                playClickSound()
                setHowToIndex((value) => {
                  if (value >= howToSlides.length - 1) {
                    setIsHowToOpen(false)
                    return 0
                  }
                  return value + 1
                })
              }}
              onWheel={(event) => {
                event.preventDefault()
                playClickSound()
                setHowToIndex((value) => Math.max(0, Math.min(howToSlides.length - 1, value + (event.deltaY > 0 ? 1 : -1))))
              }}
            >
              <img className="animalHowToImage finalHowToImage" src={howToSlides[howToIndex].image} alt={howToSlides[howToIndex].alt} />
              <div className="animalHowToFooter finalHowToFooter">
                <span>{howToIndex + 1} / {howToSlides.length}</span>
                <strong>クリックで次へ / SPACEで閉じる</strong>
                <em>ESCでも閉じる</em>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
