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
  { image: '/assets/ui_animal_howto_2.png', alt: '落とす場所を決める' },
  { image: '/assets/ui_animal_howto_3.png', alt: '崩さず積む' }
]

function TowerPreview() {
  const ringAnimals = [
    '/assets/animal_cat.png',
    '/assets/animal_panda.png',
    '/assets/animal_crocodile.png',
    '/assets/animal_giraffe.png',
    '/assets/animal_rabbit.png',
    '/assets/animal_elephant.png'
  ]

  return (
    <div className="animalTowerPreview steamPreview" aria-hidden="true">
      <div className="previewSun" />
      <div className="previewCloud cloudA" />
      <div className="previewCloud cloudB" />
      <div className="previewSpotlight" />
      <div className="shapeBadge shapeCircle">ROUND</div>
      <div className="shapeBadge shapeBox">BOX</div>
      <div className="shapeBadge shapeLong">LONG</div>
      <div className="animalOrbit">
        {ringAnimals.map((src, index) => (
          <img className={`orbitAnimal orbitAnimal${index + 1}`} src={src} alt="" key={src} />
        ))}
      </div>
      <img className="animalDrop drop1" src="/assets/animal_penguin.png" alt="" />
      <img className="animalDrop drop2" src="/assets/animal_lion.png" alt="" />
      <img className="animalDrop drop3" src="/assets/animal_crocodile.png" alt="" />
      <img className="animalDrop drop4" src="/assets/animal_giraffe.png" alt="" />
      <img className="animalDrop drop5" src="/assets/animal_panda.png" alt="" />
      <div className="comboRibbon">16 ANIMALS / PHYSICS STACK</div>
      <div className="animalStage" />
      <div className="stageGlow" />
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
    <div className="animalStartBack">
      <main className="animalStartScreen animalStartScreenFresh">
        <header className="animalStartHeader animalStartHeaderFresh">
          <img className="animalTitleLogo animalTitleLogoFresh" src="/assets/ui_animal_title.png" alt="ANIMAL TOWER BATTLE" />
        </header>

        <section className="animalStartBody animalStartBodyFresh">
          <TowerPreview />

          <aside className="animalStartMenu animalStartMenuFresh steamMenu">
            <div className="steamMenuHeader">
              <span>PARTY STACK MODE</span>
              <strong>LOCAL 4P</strong>
            </div>
            <img className="animalRuleImage animalRuleImageFresh" src="/assets/ui_animal_rule.png" alt="操作説明" />

            <div className="animalInfoGrid animalInfoGridFresh">
              <div className="animalInfoCard animalInfoCardFresh">
                <span>PLAYERS</span>
                <strong>{playerCount}</strong>
              </div>
              <div
                className={`animalInfoCard animalInfoCardFresh animalModeButton ${selectedMenuIndex === 0 ? 'menuFocus' : ''}`}
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
                <span>MODE</span>
                <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
                <em>{maxTurns} TURN</em>
              </div>
            </div>

            <div className="menuKeyHint mouseKeyHint">
              <span>MOUSE / ↑↓</span>
              <span>CLICK / SPACE</span>
              <span>WHEEL / Q E</span>
            </div>

            <div
              className={`animalStartButton animalKeyOnlyButton ${selectedMenuIndex === 1 ? 'menuFocus' : ''}`}
              onMouseEnter={() => setSelectedMenuIndex(1)}
              onClick={() => {
                playClickSound()
                onStart({ difficulty })
              }}
            >
              START
            </div>

            <div
              className={`animalHowToButton animalKeyOnlyButton ${selectedMenuIndex === 2 ? 'menuFocus' : ''}`}
              onMouseEnter={() => setSelectedMenuIndex(2)}
              onClick={() => {
                playClickSound()
                setHowToIndex(0)
                setIsHowToOpen(true)
              }}
            >
              HOW TO
            </div>
          </aside>
        </section>

        {isHowToOpen && (
          <div className="animalDialogLayer" role="presentation">
            <div
              className="animalHowToDialog animalHowToDialogFresh"
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
              <img className="animalHowToImage animalHowToImageFresh" src={howToSlides[howToIndex].image} alt={howToSlides[howToIndex].alt} />
              <div className="animalHowToFooter">
                <span>{howToIndex + 1} / {howToSlides.length}</span>
                <strong>CLICK / ← → NEXT / SPACE CLOSE</strong>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
