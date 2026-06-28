// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
const clickSound = '/assets/se_click.mp3'
import { AUDIO_LEVELS } from './audioLevels'

// ボタン・メニュー操作の短いSE。再生失敗時も進行は止めません。
export function playClickSound() {
  const audio = new Audio(clickSound)
  audio.loop = false
  audio.volume = AUDIO_LEVELS.menuClick
  void audio.play().catch(() => {
    // 効果音を再生できない環境では操作を妨げない。
  })
}
