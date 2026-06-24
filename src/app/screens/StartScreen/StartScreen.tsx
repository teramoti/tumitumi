import { useEffect, useState } from 'react'
import './StartScreen.css'

const startBgm = '/assets/start_bgm.wav'

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
  { image: '/assets/ui_animal_howto_1.png', alt: '左右でねらう' },
  { image: '/assets/ui_animal_howto_2.png', alt: '上下で作戦' },
  { image: '/assets/ui_animal_howto_3.png', alt: 'スペースでつむ' }
]

function TowerPreview() {
  return (
    <div className="animalTowerPreview" aria-hidden="true">
      <div className="dropGuide g1" />
      <div className="dropGuide g2" />
      <div className="dropGuide g3" />
      <div className="dropTargetArrow" />
      <img className="animalDrop drop1" src="/assets/animal_penguin.png" alt="" />
      <img className="animalDrop drop2" src="/assets/animal_cat.png" alt="" />
      <div className="animalStage" />
      <div className="previewBadge previewBadgeLeft">KEY ONLY</div>
      <div className="previewBadge previewBadgeRight">ROUND DROP</div>
    </div>
  )
}

export default function StartScreen({ playerCount, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0)
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
        if (selectedMenuIndex === 1) {
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
        if (selectedMenuIndex === 1) {
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
        if (selectedMenuIndex === 0) onStart({ difficulty })
        if (selectedMenuIndex === 1) {
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
    <div className="animalStartBack">
      <main className="animalStartScreen animalStartScreenFresh">
        <header className="animalStartHeader animalStartHeaderFresh">
          <img className="animalTitleLogo animalTitleLogoFresh" src="/assets/ui_animal_title.png" alt="ANIMAL TOWER BATTLE" />
        </header>

        <section className="animalStartBody animalStartBodyFresh">
          <TowerPreview />

          <aside className="animalStartMenu animalStartMenuFresh">
            <img className="animalRuleImage animalRuleImageFresh" src="/assets/ui_animal_rule.png" alt="操作説明" />

            <div className="animalInfoGrid animalInfoGridFresh">
              <div className="animalInfoCard animalInfoCardFresh">
                <span>PLAYERS</span>
                <strong>{playerCount}</strong>
              </div>
              <div className={`animalInfoCard animalInfoCardFresh animalModeButton ${selectedMenuIndex === 1 ? 'menuFocus' : ''}`}>
                <span>MODE</span>
                <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
                <em>{maxTurns} TURN</em>
              </div>
            </div>

            <div className="menuKeyHint">
              <span>↑↓ SELECT</span>
              <span>←→ MODE</span>
              <span>SPACE OK</span>
            </div>

            <button
              className={`animalStartButton ${selectedMenuIndex === 0 ? 'menuFocus' : ''}`}
              type="button"
              tabIndex={-1}
              onClick={() => onStart({ difficulty })}
            >
              START
            </button>

            <button
              className={`animalHowToButton ${selectedMenuIndex === 2 ? 'menuFocus' : ''}`}
              type="button"
              tabIndex={-1}
              onClick={() => {
                setHowToIndex(0)
                setIsHowToOpen(true)
              }}
            >
              HOW TO
            </button>
          </aside>
        </section>

        {isHowToOpen && (
          <div className="animalDialogLayer" role="presentation">
            <div className="animalHowToDialog animalHowToDialogFresh" role="dialog" aria-modal="true" aria-label="遊び方">
              <img className="animalHowToImage animalHowToImageFresh" src={howToSlides[howToIndex].image} alt={howToSlides[howToIndex].alt} />
              <div className="animalHowToFooter">
                <span>{howToIndex + 1} / {howToSlides.length}</span>
                <strong>← → NEXT / SPACE CLOSE</strong>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
