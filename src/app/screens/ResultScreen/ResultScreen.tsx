import { useEffect, useMemo, useRef, useState } from 'react'
import './ResultScreen.css'
import { getRanksFromScores } from '../../../utils/Result.js'
import type { GameResult } from '../../App'
const resultBgm = '/assets/result_bgm.wav'
import { playClickSound } from '../../audio/playClickSound'

type Props = {
  result: GameResult
  onBack: () => void
}

const PLAYER_MARKER_IMAGE_PATHS = [
  '/assets/player_badge_p1.png',
  '/assets/player_badge_p2.png',
  '/assets/player_badge_p3.png',
  '/assets/player_badge_p4.png'
]

function getDisplayedRank(results: GameResult['results']) {
  let currentRank = 0
  let previousScore: number | null = null
  return results.map((entry, index) => {
    if (previousScore === null || entry.score !== previousScore) {
      currentRank = index + 1
      previousScore = entry.score
    }
    return currentRank
  })
}

export default function ResultScreen({ result, onBack }: Props) {
  const [showRanks, setShowRanks] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const rankTimerRef = useRef<number | null>(null)
  const backTimerRef = useRef<number | null>(null)

  const rankedResults = useMemo(
    () => [...result.results].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.player - b.player
    }),
    [result.results]
  )

  const displayedRanks = useMemo(() => getDisplayedRank(rankedResults), [rankedResults])
  const winner = rankedResults[0]

  useEffect(() => {
    const audio = new Audio(resultBgm)
    audio.loop = true

    const playBgm = () => {
      void audio.play().catch(() => {
        // 自動再生が拒否された場合は、次のユーザー操作で再試行する。
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
    rankTimerRef.current = window.setTimeout(() => {
      setShowRanks(true)
      rankTimerRef.current = null
    }, 160)
    backTimerRef.current = window.setTimeout(() => {
      setShowBack(true)
      backTimerRef.current = null
    }, 720)

    return () => {
      if (rankTimerRef.current !== null) window.clearTimeout(rankTimerRef.current)
      if (backTimerRef.current !== null) window.clearTimeout(backTimerRef.current)
    }
  }, [])

  const handleBack = () => {
    playClickSound()

    const scoresByPlayer = [...result.results]
      .sort((a, b) => a.player - b.player)
      .map((entry) => entry.score)
    const rank = getRanksFromScores(scoresByPlayer)

    window.parent.postMessage({ type: 'GameClear', rank }, '*')
    onBack()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="animalResultBack">
      <main className="animalResultScreen">
        <header className="animalResultHeader">
          <img className="animalResultLogo" src="/assets/ui_animal_result.png" alt="RESULT" />
        </header>

        {winner && (
          <section className="animalWinner">
            <img className="animalWinnerStar" src="/assets/animal_star.png" alt="" />
            <img className="animalWinnerBadge" src={PLAYER_MARKER_IMAGE_PATHS[winner.player - 1]} alt={`P${winner.player}`} />
            <div className="animalWinnerText">
              <span>WINNER</span>
              <strong>P{winner.player}</strong>
            </div>
            <div className="animalWinnerScore">{winner.score}</div>
          </section>
        )}

        <section className="animalRankGrid" aria-label="順位">
          {rankedResults.map((entry, index) => {
            const rank = displayedRanks[index]
            return (
              <article
                className={`animalRankCard rank${rank} ${showRanks ? 'animalRankCardShow' : ''}`}
                key={entry.player}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="animalRankNo">{rank}</div>
                <img className="animalRankBadge" src={PLAYER_MARKER_IMAGE_PATHS[entry.player - 1]} alt="" />
                <div className="animalRankPlayer">P{entry.player}</div>
                <div className="animalRankScore">{entry.score}</div>
                <div className="animalRankMini">SAFE {entry.successes ?? 0} / MISS {entry.misses ?? 0}</div>
              </article>
            )
          })}
        </section>

        <div className={`animalBackButton animalBackKeyPanel ${showBack ? 'animalBackButtonShow' : ''}`}>
          SPACE / ENTER  TITLE
        </div>
      </main>
    </div>
  )
}
