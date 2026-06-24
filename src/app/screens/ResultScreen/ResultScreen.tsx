/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability */
import { useEffect, useMemo, useRef, useState } from 'react'
import './ResultScreen.css'
import type { CSSProperties } from 'react'
import { getRanksFromScores } from '../../../utils/Result.js'
import type { GameResult, PlayerResult } from '../../App'
const resultBgm = '/assets/result_bgm.wav'
import { playClickSound } from '../../audio/playClickSound'

type Props = {
  result: GameResult
  onBack: () => void
}

type ReviewGridProps = {
  playerResult: PlayerResult
  mode: 'selected' | 'correct'
}

const PLAYER_MARKER_IMAGE_PATHS = [
  '/assets/player_badge_p1.png',
  '/assets/player_badge_p2.png',
  '/assets/player_badge_p3.png',
  '/assets/player_badge_p4.png'
]

function getRankComment(rank: number) {
  if (rank === 1) return 'さいごまで耐えた！'
  if (rank === 2) return '崩さず落とせていた！'
  if (rank === 3) return 'おしい！次は優勝だ！'
  return 'チャレンジありがとう！'
}

function ReviewGrid({ playerResult, mode }: ReviewGridProps) {
  if (!playerResult.review) return null

  const selectedKeySet = new Set(playerResult.review.selectedKeys)
  const correctKeySet = new Set(playerResult.review.correctKeys)
  const gridSize = playerResult.review.rightGrid.length
  const cellSize = gridSize <= 3 ? 76 : gridSize >= 7 ? 44 : 62

  return (
    <div
      className="reviewGrid"
      style={{
        '--review-grid-size': gridSize,
        '--review-cell-size': `${cellSize}px`
      } as CSSProperties}
    >
      {playerResult.review.rightGrid.flatMap((row, rowIndex) =>
        row.map((symbol, colIndex) => {
          const key = `${rowIndex}-${colIndex}`
          const isSelected = selectedKeySet.has(key)
          const isCorrect = correctKeySet.has(key)
          const markClass = mode === 'correct'
            ? (isCorrect ? 'reviewCellCorrect' : '')
            : (isSelected ? (isCorrect ? 'reviewCellCorrect' : 'reviewCellWrong') : '')

          return (
            <div className={`reviewCell ${markClass}`} key={key}>
              {symbol}
            </div>
          )
        })
      )}
    </div>
  )
}

// リザルト画面
export default function ResultScreen({ result, onBack }: Props) {
  // リザルト画面
  // 設定方法:
  // 1. GameManager.ts の onFinish(...) で results(プレイヤー番号とスコア)を返す
  // 2. App.tsx の handleFinish で result state に保存する
  // 3. <ResultScreen result={result} onBack={...} /> としてこの画面に渡す
  const [reviewIndex, setReviewIndex] = useState(0)
  const hasReviewData = result.results.some((entry) => entry.review)
  const [isRankingVisible, setIsRankingVisible] = useState(!hasReviewData)
  const [isFading, setIsFading] = useState(false)
  const [isRankingAnimationStarted, setIsRankingAnimationStarted] = useState(false)
  const [isConfettiVisible, setIsConfettiVisible] = useState(false)
  const [isBackButtonVisible, setIsBackButtonVisible] = useState(false)
  const fadeTimerRef = useRef<number | null>(null)
  const rankingTimerRef = useRef<number | null>(null)
  const confettiTimerRef = useRef<number | null>(null)
  const backButtonTimerRef = useRef<number | null>(null)
  const resultBgmRef = useRef<HTMLAudioElement | null>(null)
  const reviewsByPlayer = useMemo(
    () => result.results
      .filter((entry) => entry.review)
      .sort((a, b) => a.player - b.player),
    [result.results]
  )
  const currentReview = reviewsByPlayer[reviewIndex]
  const rankedResults = useMemo(
    () => [...result.results].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.player - b.player
    }),
    [result.results]
  )
  const displayedRanks = useMemo(() => {
    let currentRank = 0
    let previousScore: number | null = null

    return rankedResults.map((entry, index) => {
      if (previousScore === null || entry.score !== previousScore) {
        currentRank = index + 1
        previousScore = entry.score
      }

      return currentRank
    })
  }, [rankedResults])

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current)
      }
      if (rankingTimerRef.current !== null) {
        window.clearTimeout(rankingTimerRef.current)
      }
      if (confettiTimerRef.current !== null) {
        window.clearTimeout(confettiTimerRef.current)
      }
      if (backButtonTimerRef.current !== null) {
        window.clearTimeout(backButtonTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isRankingVisible) return

    const audio = new Audio(resultBgm)
    audio.loop = true
    resultBgmRef.current = audio

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
      resultBgmRef.current = null
    }
  }, [isRankingVisible])

  useEffect(() => {
    if (!isRankingVisible) return

    setIsRankingAnimationStarted(false)
    setIsConfettiVisible(false)
    setIsBackButtonVisible(false)

    rankingTimerRef.current = window.setTimeout(() => {
      setIsRankingAnimationStarted(true)
      rankingTimerRef.current = null
    }, 350)

    const revealDelay = 350 + (rankedResults.length * 450) + 700

    confettiTimerRef.current = window.setTimeout(() => {
      setIsConfettiVisible(true)
      confettiTimerRef.current = null
    }, revealDelay)

    backButtonTimerRef.current = window.setTimeout(() => {
      setIsBackButtonVisible(true)
      backButtonTimerRef.current = null
    }, revealDelay)

    return () => {
      if (rankingTimerRef.current !== null) {
        window.clearTimeout(rankingTimerRef.current)
        rankingTimerRef.current = null
      }
      if (confettiTimerRef.current !== null) {
        window.clearTimeout(confettiTimerRef.current)
        confettiTimerRef.current = null
      }
      if (backButtonTimerRef.current !== null) {
        window.clearTimeout(backButtonTimerRef.current)
        backButtonTimerRef.current = null
      }
    }
  }, [isRankingVisible, rankedResults.length])

  // 順位配列生成
  // 戻るボタン押下時の処理
  const handleBack = () => {
    playClickSound()

    const scoresByPlayer = [...result.results]
      .sort((a, b) => a.player - b.player)
      .map((entry) => entry.score)
    const rank = getRanksFromScores(scoresByPlayer)

    // console.log('************ タイトル戻る時のイベントで親に送信する内容 ***********')

    // console.log('type: GameClear')
    // console.log(rank)

    // 親へ送信
    window.parent.postMessage(
      {
        type: 'GameClear',
        rank
      },
      '*' // 本番は origin 指定推奨
    )

    // console.log('************ 送信イベント終了 ***********')

    // タイトルへ戻る
    onBack()
  }

  const handleNextReview = () => {
    if (!hasReviewData) return
    if (isFading) return

    playClickSound()
    setIsFading(true)
    fadeTimerRef.current = window.setTimeout(() => {
      if (reviewIndex < reviewsByPlayer.length - 1) {
        setReviewIndex((current) => current + 1)
      } else {
        setIsRankingVisible(true)
      }

      setIsFading(false)
      fadeTimerRef.current = null
    }, 250)
  }

  const handleSkipReview = () => {
    if (isFading) return

    playClickSound()
    setIsFading(true)
    fadeTimerRef.current = window.setTimeout(() => {
      setIsRankingVisible(true)
      setIsFading(false)
      fadeTimerRef.current = null
    }, 250)
  }

  // 以下でリザルト部分の画面HTML生成
  return (
    <div className={`resultBackColor ${isRankingVisible ? 'rankingBackground' : 'answerCheckBackground'}`}>

      {/* リザルト画面本体 */}
      <div className={`resultScreen ${isRankingVisible ? 'rankingScreen' : 'answerCheckScreen'} ${isFading ? 'resultScreenFading' : ''}`}>

        {!isRankingVisible && (
          <button
            className="skipReviewButton"
            type="button"
            onClick={handleSkipReview}
            disabled={isFading}
          >
            スキップ
          </button>
        )}

        {isRankingVisible && isConfettiVisible && (
          <div className="confettiLayer" aria-hidden="true">
            {Array.from({ length: 48 }, (_, index) => (
              <span
                className={`confettiPiece confettiColor${index % 6}`}
                key={index}
                style={{
                  left: `${(index * 73 + 11) % 100}%`,
                  width: `${7 + ((index * 17) % 8)}px`,
                  height: `${12 + ((index * 29) % 14)}px`,
                  animationDelay: `${(index * 137) % 1800}ms`,
                  animationDuration: `${2600 + ((index * 211) % 2200)}ms`,
                  '--confetti-drift': `${-120 + ((index * 47) % 240)}px`,
                  '--confetti-rotation': `${540 + ((index * 89) % 900)}deg`
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* タイトルエリア */}
        <header className={`resultHeader ${isRankingVisible ? 'rankingHeader' : 'answerCheckHeader'}`}>

          <h1 className={`rankTitle ${isRankingVisible ? '' : 'answerCheckTitle'}`}>
            {isRankingVisible ? 'タワーバトル結果発表！' : 'プレイ確認'}
          </h1>

          {!isRankingVisible && (
            <p className="resultSubTitle">
              {currentReview ? `Player${currentReview.player} の結果確認` : ''}
            </p>
          )}

        </header>

        {isRankingVisible ? (
          /* ランキング一覧 */
          <section className="rankingArea">

            <ul className="rankList">
              {rankedResults.map((r, i) => {
                const isFirstPlace = displayedRanks[i] === 1

                return (
                <li
                  className={`rankItem rankItemWaiting ${isFirstPlace ? 'rankItemFirst' : ''} ${isRankingAnimationStarted ? 'animatedRankItem' : ''}`}
                  key={r.player}
                  style={{ animationDelay: `${i * 450}ms` }}
                >

                  {/* 左側：順位 */}
                  <div className="rankLeft">
                    <span className="rankNo">
                      {displayedRanks[i]}位
                    </span>
                    <span
                      className={`rankDecoration ${isFirstPlace ? 'rankStar' : 'rankTriangle'}`}
                      aria-hidden="true"
                    >
                      {isFirstPlace ? <>&#9733;</> : <>&#9650;</>}
                    </span>
                  </div>

                  {/* 中央：プレイヤー名 */}
                  <div className="rankCenter">
                    <img className="rankMarker" src={PLAYER_MARKER_IMAGE_PATHS[r.player - 1]} alt="" />
                    <div className="rankCenterText">
                      <span className="rankPlayer">
                        Player{r.player}
                      </span>
                      <span className="rankComment">{getRankComment(displayedRanks[i])}</span>
                    </div>
                  </div>

                  {/* 右側：スコア */}
                  <div className="rankRight">
                    <span className="rankScore">
                      SCORE {r.score}
                    </span>
                  </div>

                </li>
                )
              })}
            </ul>

          </section>
        ) : (
          <section className="reviewArea compactReviewArea">
            <div className="reviewSummary">
              <span>{currentReview?.review?.pattern}</span>
              <strong>POINT : {currentReview?.score ?? 0}</strong>
            </div>

            <div className="reviewBoards compactReviewBoards">
              <div className="reviewBoard">
                <h2 className="reviewBoardTitle">正解</h2>
                <ReviewGrid playerResult={currentReview} mode="correct" />
              </div>

              <div className="reviewBoard">
                <h2 className="reviewBoardTitle">選んだ結果</h2>
                <ReviewGrid playerResult={currentReview} mode="selected" />
              </div>
            </div>

            <div className="reviewLegend">
              <span className="reviewLegendItem">
                <span className="reviewLegendMark reviewLegendGreen" />
                赤丸：正しく選んだマス・正解のマス
              </span>
              <span className="reviewLegendItem">
                <span className="reviewLegendCross" />
                青いバツ：まちがえて選んだマス
              </span>
            </div>
          </section>
        )}


        {/* ボタンエリア */}
        <footer className={`resultFooter ${isRankingVisible ? '' : 'answerCheckFooter'}`}>

          {isRankingVisible ? (
            <button
              className={`backButton rankingBackButton ${isBackButtonVisible ? 'rankingBackButtonVisible' : ''}`}
              hidden={!isBackButtonVisible}
              onClick={handleBack}
            >
              タイトルへ戻る
            </button>
          ) : (
            <button
              className="nextReviewButton"
              onClick={handleNextReview}
              disabled={isFading}
            >
              {reviewIndex < reviewsByPlayer.length - 1
                ? '次のプレイヤー'
                : '最終順位を見る'}
            </button>
          )}

        </footer>

      </div>

    </div>
  )
}
