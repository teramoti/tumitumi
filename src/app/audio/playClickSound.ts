const clickSound = '/assets/se_click.mp3'

export function playClickSound() {
  const audio = new Audio(clickSound)
  audio.loop = false
  void audio.play().catch(() => {
    // 効果音を再生できない環境では操作を妨げない。
  })
}
