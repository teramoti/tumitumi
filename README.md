# 組体操タワー崩し

30〜45秒で遊べる、組体操版ジェンガ風ミニゲームです。下の生徒ブロックをタップで抜き、てっぺんの生徒を床まで落とさずにスコアを稼ぎます。

## 起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## 今回整理した構成

```text
.
├─ assets/
│  └─ audio/              # BGM / 効果音
├─ src/
│  ├─ app/                # React UI
│  │  ├─ audio/
│  │  ├─ data/
│  │  └─ screens/
│  ├─ game/
│  │  ├─ GameManager.ts   # React と Phaser の接続
│  │  └─ towerCrash/      # 組体操タワー崩し本体
│  ├─ utils/
│  ├─ main.css
│  └─ main.tsx
├─ index.html
├─ package.json
└─ vite.config.ts
```

## ゲーム仕様

- 画面サイズは 1280 × 720。
- デフォルトは1人プレイ。iframe から `playerCount` を受け取る既存仕様は維持。
- 難易度は `ゆっくり / ふつう / ハラハラ`。
- てっぺんの生徒が床まで落ちたら終了。
- 「ここで終了」を押すと安全終了ボーナス。
- リザルトでは順位を `GameClear` として親へ `postMessage` 送信。

## 整理メモ

- `node_modules/`, `dist/`, `.git/`, 古い Phaser テンプレ素材、旧スライドパズル系ソースを削除。
- zip直下に `src/` が来るようにして、`kumiko/src` の二重フォルダー構成を解消。
- `assets/bkue_ghost` の typo フォルダーを `assets/audio` に整理。
- ゲーム画面のHTML HUDを左上に集約し、Phaser内の重複スコアUIを削除。
- 旧宇宙テーマの `thumbnail.png` を現在のゲーム内容に合わせて差し替え。
