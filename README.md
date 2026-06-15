# デスクつみタワー

机の上に文房具や小物を1人1個ずつ置いていく、ターン制のバランスゲームです。

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

## ゲーム仕様

- 画面サイズは 1280 x 720。
- プレイヤー数は GameManager / iframe から受け取る。タイトル画面では変更しない。
- 最大ターンは `ゆるめ 8 / ふつう 10 / ぐらぐら 12`。
- 足場は短めで、置き位置の判断が勝敗に直結する。
- 2ラウンド目以降、1周ごとに中立障害物が複数個上から落ちる。
- ラウンドが進むほど置く物と障害物が大きくなる。
- 操作はキーボードのみ。
- `↑↓` で置く雑貨を選択。
- `←→` で置く位置を調整。
- 毎ターン `TARGET` 位置が出る。近くに置くと追加点。
- 各プレイヤーは最初から1回だけ使える `BOOST x2.5` を持つ。
- `B` でBOOSTを装備/解除。
- `SPACE / ENTER` で置く、または次へ進む。
- SPACEを押した瞬間のタイミングで `PERFECT / GOOD / LATE` を判定。
- 雑貨ごとに基礎点が異なる。
- イヤホンジャックなど、一部雑貨は複合ボディで当たり判定が不安定。
- `PERFECT` と `GOOD` は追加点、`LATE` は置いた雑貨が傾きやすくなる。
- 崩さず置けた場合、雑貨点とお題ボーナスを加算。
- ラウンドごとにイベントが変わる。
- 連続成功でボーナスが増える。
- 3連続成功目から `FEVER` ボーナスが入る。
- 逆転チャンスでは最下位プレイヤーに成功ボーナスが入る。
- 失敗したプレイヤーは HP が減る。
- リザルトでは順位を `GameClear` として親へ `postMessage` 送信。
- 同点は同率順位として扱う。

## 構成

```text
.
├─ public/assets/        # 画像 / BGM / 効果音
├─ src/
│  ├─ app/               # React UI
│  │  ├─ audio/
│  │  ├─ data/
│  │  └─ screens/
│  ├─ game/
│  │  ├─ GameManager.ts  # React と Phaser の接続
│  │  └─ towerCrash/     # Phaser ゲーム本体
│  ├─ main.css
│  └─ main.tsx
├─ index.html
├─ package.json
└─ vite.config.ts
```
