// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
// スコア配列から順位配列を作ります。同点は同順位です。
export function getRanksFromScores(scores) {
    if (!Array.isArray(scores)) {
        throw new TypeError('scores must be an array')
    }

    const indexedScores = scores.map((score, index) => {
        if (typeof score !== 'number' || Number.isNaN(score)) {
            throw new TypeError('scores must contain only numbers')
        }

        return { index, score }
    })

    indexedScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score
        }

        return a.index - b.index
    })

    const ranks = new Array(scores.length)
    let currentRank = 0
    let previousScore = null

    indexedScores.forEach((entry, sortedIndex) => {
        if (previousScore === null || entry.score !== previousScore) {
            currentRank = sortedIndex + 1
            previousScore = entry.score
        }

        ranks[entry.index] = currentRank
    })

    return ranks
}
