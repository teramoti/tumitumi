// メンバー向けコメント: このファイルの役割と、変更時に触るべき場所を追いやすくするための注釈を入れています。
import Phaser from 'phaser'

import {
    PLAYER_START_HP,
    getMaxTurns,
} from '../../app/data/gameRules'

// React側から受け取る実行時設定。GameManager.tsのstartGameから更新されます。
let runtimeSettings = { playerCount: 4, difficulty: 'normal' }
let runtimeOnFinish = () => {}
let runtimeHudTarget = null

// ReactのGameScreenへ結果とHUD更新を返すための入口。
export const configureTowerCrashScene = (settings, onFinish) => {
    runtimeSettings = settings
    runtimeOnFinish = onFinish
    runtimeHudTarget = settings.hudTarget ?? null
}

const FONT = '"Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif'
const MATTER = Phaser.Physics.Matter.Matter

// 画面・台・落下判定ラインの基準値。台幅や落下ミス判定を触る場合はここが起点です。
const WORLD = {
    width: 1280,
    height: 720,
    stageCenterX: 650,
    matTopY: 606,
    matWidth: 460,
    matHeight: 44,
    floorY: 688,
    faultLineY: 655,
}

const DROP_LANE_OFFSETS = [-220, -110, 0, 110, 220]
const PLAYER_COLORS = [0xe94834, 0x2f73c9, 0x2da65d, 0xf0a51f]
const PLAYER_DARK_COLORS = [0xa22d24, 0x1e4f91, 0x1f7143, 0x9b6413]

// 難易度別の物理バランス。重力・安定判定待ち・一巡後追加数をまとめています。
const DIFFICULTY_CONFIG = {
    easy: { gravity: 1.7, settleMs: 180, label: 'ゆるめ', maxDrop: 3 },
    normal: { gravity: 1.9, settleMs: 200, label: 'ふつう', maxDrop: 4 },
    hard: { gravity: 2.08, settleMs: 220, label: 'ぐらぐら', maxDrop: 5 },
}

// 動物ごとの表示サイズ・重さ・点数・物理形状。ゲーム性を変える一番重要な表です。
const ANIMAL_TYPES = [
    { key: 'cat', label: 'ねこ', imageKey: 'animal-cat', width: 138, height: 68, density: 0.0042, points: 120, shape: 'capsule', risk: 2 },
    { key: 'dog', label: 'いぬ', imageKey: 'animal-dog', width: 150, height: 70, density: 0.0044, points: 125, shape: 'capsule', risk: 2 },
    { key: 'panda', label: 'パンダ', imageKey: 'animal-panda', width: 112, height: 112, density: 0.0046, points: 190, shape: 'circle', risk: 4 },
    { key: 'turtle', label: 'カメ', imageKey: 'animal-turtle', width: 152, height: 58, density: 0.0052, points: 125, shape: 'longBox', risk: 1 },
    { key: 'penguin', label: 'ペンギン', imageKey: 'animal-penguin', width: 70, height: 124, density: 0.0036, points: 215, shape: 'tallBox', risk: 4 },
    { key: 'seal', label: 'アザラシ', imageKey: 'animal-seal', width: 168, height: 60, density: 0.004, points: 145, shape: 'longBox', risk: 2 },
    { key: 'elephant', label: 'ぞう', imageKey: 'animal-elephant', width: 190, height: 92, density: 0.0056, points: 170, shape: 'heavyBox', risk: 2 },
    { key: 'giraffe', label: 'キリン', imageKey: 'animal-giraffe', width: 78, height: 166, density: 0.0038, points: 270, shape: 'tallBox', risk: 5 },
    { key: 'lion', label: 'ライオン', imageKey: 'animal-lion', width: 148, height: 82, density: 0.0048, points: 160, shape: 'capsule', risk: 2 },
    { key: 'bear', label: 'くま', imageKey: 'animal-bear', width: 130, height: 110, density: 0.0051, points: 175, shape: 'square', risk: 3 },
    { key: 'rabbit', label: 'うさぎ', imageKey: 'animal-rabbit', width: 76, height: 148, density: 0.0033, points: 245, shape: 'tallBox', risk: 5 },
    { key: 'fox', label: 'きつね', imageKey: 'animal-fox', width: 158, height: 72, density: 0.0041, points: 185, shape: 'wedge', risk: 3 },
    { key: 'hippo', label: 'カバ', imageKey: 'animal-hippo', width: 150, height: 108, density: 0.0058, points: 180, shape: 'square', risk: 3 },
    { key: 'crocodile', label: 'ワニ', imageKey: 'animal-crocodile', width: 220, height: 54, density: 0.0054, points: 150, shape: 'longBox', risk: 1 },
    { key: 'monkey', label: 'サル', imageKey: 'animal-monkey', width: 116, height: 116, density: 0.004, points: 200, shape: 'circle', risk: 4 },
    { key: 'hedgehog', label: 'ハリネズミ', imageKey: 'animal-hedgehog', width: 146, height: 74, density: 0.0046, points: 205, shape: 'wedge', risk: 3 },
]

const DROP_PLANS = [
    { key: 'animal', label: 'ANIMAL', countBonus: 0, forceBonus: 0, spreadBonus: 0, scoreMultiplier: 1, risk: 1, color: 0xf0a51f },
]

const TURN_SELECT_MS = 4800
const PLAYER_DROP_START_OFFSET = 132
const STORM_DROP_START_OFFSET = 158
const PLAYER_DROP_MIN_VELOCITY = 8.2
const STORM_DROP_MIN_VELOCITY = 8.6

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default // Matter.js物理で、動物を積む本体シーン。
class TowerCrashScene extends Phaser.Scene {
    constructor(data = {}) {
        super('TowerCrash')
        this.bootData = data
        this.playerCount = clamp(Number(data.playerCount ?? runtimeSettings.playerCount ?? 4), 1, 4)
        this.turnOrder = []
        this.turnOrderCursor = -1
        this.currentPlayerIndex = 0
        this.phase = 'boot'
        this.hp = []
        this.alive = []
        this.successes = []
        this.misses = []
        this.dropPoints = []
        this.combo = []
        this.turnNumber = 0
        this.roundNumber = 1
        this.maxTurns = 8
        this.animals = []
        this.staticBodies = []
        this.playerViews = []
        this.laneViews = []
        this.loadCards = []
        this.selectedLaneIndex = 2
        this.selectedDropX = WORLD.stageCenterX
        this.selectedRotation = 0
        this.rotationPreview = null
        this.selectedPlanIndex = 0
        this.bonusLaneIndex = 2
        this.dropProfile = null
        this.pendingScore = 0
        this.pendingBonus = false
        this.droppedThisTurn = []
        this.incomingAttack = []
        this.towerPressure = 0
        this.difficultyConfig = DIFFICULTY_CONFIG.normal
        this.messageText = null
        this.hintText = null
        this.turnText = null
        this.targetText = null
        this.timerText = null
        this.nextTurnPrompt = null
        this.cursorView = null
        this.turnStartedAt = 0
        this.dropStartedAt = 0
        this.dropReachedAt = null
        this.dropContactY = WORLD.matTopY
        this.stableSince = null
        this.roundStormDone = new Set()
        this.roundStormStartedAt = 0
        this.roundStormStableSince = null
        this.attackStormStartedAt = 0
        this.attackStormStableSince = null
        this.attackStormCount = 0
        this.keyHandlers = null
        this.sfx = null
        this.qRotateHeld = false
        this.eRotateHeld = false
        this.qRotateRepeatAt = 0
        this.eRotateRepeatAt = 0
        this.inputLockedUntil = 0
        this.messageAdvanceLockedUntil = 0
        this.openingOverlay = null
        this.openingLabel = null
        this.openingSub = null
        this.openingTimers = []
        this.openingCanSkipAt = 0
    }

    // 画像・SEを事前読み込みします。public/assets配下のファイル名と対応します。
    preload() {
        this.load.image('animal-cat', '/assets/animal_cat.png')
        this.load.image('animal-dog', '/assets/animal_dog.png')
        this.load.image('animal-panda', '/assets/animal_panda.png')
        this.load.image('animal-turtle', '/assets/animal_turtle.png')
        this.load.image('animal-penguin', '/assets/animal_penguin.png')
        this.load.image('animal-elephant', '/assets/animal_elephant.png')
        this.load.image('animal-giraffe', '/assets/animal_giraffe.png')
        this.load.image('animal-seal', '/assets/animal_seal.png')
        this.load.image('animal-lion', '/assets/animal_lion.png')
        this.load.image('animal-bear', '/assets/animal_bear.png')
        this.load.image('animal-rabbit', '/assets/animal_rabbit.png')
        this.load.image('animal-fox', '/assets/animal_fox.png')
        this.load.image('animal-hippo', '/assets/animal_hippo.png')
        this.load.image('animal-crocodile', '/assets/animal_crocodile.png')
        this.load.image('animal-monkey', '/assets/animal_monkey.png')
        this.load.image('animal-hedgehog', '/assets/animal_hedgehog.png')
        this.load.image('ui-stamp-safe', '/assets/ui_stamp_safe.png')
        this.load.image('ui-stamp-miss', '/assets/ui_stamp_miss.png')
        this.load.image('ui-turn-plate', '/assets/ui_turn_plate.png')
        this.load.image('ui-controls-hint', '/assets/ui_controls_animal.png')
        this.load.image('ui-bonus-badge', '/assets/ui_bonus_badge.png')
        this.load.image('ui-fever-alert', '/assets/ui_fever_alert.png')
        this.load.image('ui-combo-badge', '/assets/ui_combo_badge.png')
        this.load.image('ui-game-arena-bg', '/assets/ui_game_arena_bg.png')
        for (let index = 1; index <= 4; index += 1) {
            this.load.image(`player-marker-p${index}`, `/assets/player_badge_p${index}.png`)
        }
        this.load.audio('se-place', '/assets/se_place.wav')
        this.load.audio('se-safe', '/assets/se_safe.wav')
        this.load.audio('se-miss', '/assets/se_miss.wav')
        this.load.audio('se-turn', '/assets/se_turn.wav')
        this.load.audio('se-select', '/assets/se_select.wav')
        this.load.audio('se-lane', '/assets/se_lane.wav')
        this.load.audio('se-bonus', '/assets/se_bonus.wav')
    }

    // シーン開始時の初期化。人数・難易度・ターン順・HUD・入力をここで準備します。
    create() {
        const difficulty = runtimeSettings.difficulty || this.bootData.difficulty || 'normal'
        this.difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal
        this.playerCount = clamp(Number(this.bootData.playerCount ?? runtimeSettings.playerCount ?? 4), 1, 4)
        this.turnOrder = this.createTurnOrder(this.playerCount)
        this.turnOrderCursor = -1
        this.maxTurns = getMaxTurns(difficulty)
        this.hp = Array(this.playerCount).fill(PLAYER_START_HP)
        this.alive = Array(this.playerCount).fill(true)
        this.successes = Array(this.playerCount).fill(0)
        this.misses = Array(this.playerCount).fill(0)
        this.dropPoints = Array(this.playerCount).fill(0)
        this.combo = Array(this.playerCount).fill(0)
        this.incomingAttack = Array(this.playerCount).fill(0)
        this.turnNumber = 0
        this.roundNumber = 1
        this.phase = 'boot'

        this.input.setTopOnly(true)
        this.matter.world.setGravity(0, this.difficultyConfig.gravity)

        this.drawBackground()
        this.createStageBodies()
        this.createPlayerViews()
        this.createHudTexts()
        this.registerExternalCommands()
        this.registerKeyboard()
        this.registerPointerControls()
        this.sfx = {
            place: this.sound.add('se-place', { volume: 0.58 }),
            safe: this.sound.add('se-safe', { volume: 0.50 }),
            miss: this.sound.add('se-miss', { volume: 0.56 }),
            turn: this.sound.add('se-turn', { volume: 0.42 }),
            select: this.sound.add('se-select', { volume: 0.30 }),
            lane: this.sound.add('se-lane', { volume: 0.28 }),
            bonus: this.sound.add('se-bonus', { volume: 0.58 }),
        }

        this.resetArena()
        this.showOpeningCountdown()
    }

    // ゲームジャム展示向けの開始演出。開始直後に何をするゲームかを短時間で伝えます。
    showOpeningCountdown() {
        this.phase = 'opening'
        this.inputLockedUntil = Number.POSITIVE_INFINITY
        this.showMessage('', '')
        const overlay = this.add.container(WORLD.width / 2, WORLD.height / 2).setDepth(120).setAlpha(0)
        const bg = this.add.graphics()
        bg.fillStyle(0x071421, 0.82)
        bg.fillRoundedRect(-360, -128, 720, 256, 44)
        bg.lineStyle(5, 0xffffff, 0.26)
        bg.strokeRoundedRect(-360, -128, 720, 256, 44)
        const label = this.add.text(0, -48, 'READY?', {
            fontFamily: FONT, fontSize: '72px', color: '#ffffff', fontStyle: 'bold', stroke: '#071421', strokeThickness: 8,
        }).setOrigin(0.5)
        const sub = this.add.text(0, 44, 'クリック / SPACE で開始', {
            fontFamily: FONT, fontSize: '30px', color: '#fff4a2', fontStyle: 'bold', stroke: '#071421', strokeThickness: 6,
        }).setOrigin(0.5)
        overlay.add([bg, label, sub])
        this.openingOverlay = overlay
        this.openingLabel = label
        this.openingSub = sub
        this.openingCanSkipAt = this.time.now + 260
        this.tweens.add({ targets: overlay, alpha: 1, scaleX: 1.02, scaleY: 1.02, duration: 150, ease: 'Back.easeOut' })
        this.openingTimers = [
            this.time.delayedCall(460, () => {
                if (this.phase !== 'opening') return
                label.setText('STACK!')
                sub.setText('動物は固定。すぐ置ける')
                this.playSfx('turn')
                this.showScreenFlash(0xffd641, 0.14)
            }),
            this.time.delayedCall(880, () => this.finishOpeningCountdown(true))
        ]
    }

    finishOpeningCountdown(force = false) {
        if (this.phase !== 'opening') return
        if (!force && this.time.now < this.openingCanSkipAt) return
        this.openingTimers.forEach((timer) => timer?.remove(false))
        this.openingTimers = []
        const overlay = this.openingOverlay
        this.openingOverlay = null
        this.openingLabel = null
        this.openingSub = null
        this.inputLockedUntil = this.time.now
        if (overlay?.active) {
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                y: WORLD.height / 2 - 26,
                duration: 180,
                onComplete: () => overlay.destroy()
            })
        }
        this.beginTurn(0)
    }

    // React HUD側から送られる「つむ」「次へ」などのイベントを受け取ります。
    registerExternalCommands() {
        this.commandHandler = (event) => {
            const type = event.detail?.type
            if (type === 'answer' && this.phase === 'select' && this.time.now >= this.inputLockedUntil) this.dropSelectedLoad()
            if (type === 'next' && this.phase === 'message' && this.time.now >= this.messageAdvanceLockedUntil) this.advanceTurn()
        }
        runtimeHudTarget?.addEventListener('game-command', this.commandHandler)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            runtimeHudTarget?.removeEventListener('game-command', this.commandHandler)
        })
    }

    // キーボード補助操作。マウス操作がメインでも展示時の予備操作として残しています。
    registerKeyboard() {
        this.keyHandlers = this.input.keyboard?.addKeys('LEFT,RIGHT,A,D,Q,E,SPACE,ENTER')
    }

    // マウス操作。移動=マウスX、落下=左クリック、回転=ホイール。
    registerPointerControls() {
        this.input.on('pointermove', (pointer) => {
            if (this.phase !== 'select') return
            this.selectedDropX = clamp(pointer.worldX, this.getPlacementMinX(), this.getPlacementMaxX())
            this.updateTargetCursor()
            this.dispatchHud(false)
        })

        this.input.on('pointerdown', (pointer) => {
            if (pointer.button !== 0) return
            if (this.phase === 'opening') {
                this.finishOpeningCountdown()
                return
            }
            if (this.phase === 'message') {
                if (this.time.now < this.messageAdvanceLockedUntil) return
                this.advanceTurn()
                return
            }
            if (this.phase !== 'select') return
            if (this.time.now < this.inputLockedUntil) return
            this.selectedDropX = clamp(pointer.worldX, this.getPlacementMinX(), this.getPlacementMaxX())
            this.dropSelectedLoad()
        })

        this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
            if (this.phase !== 'select') return
            if (this.time.now < this.inputLockedUntil) return
            this.rotateSelectedAnimal(deltaY > 0 ? 1 : -1)
        })
    }

    // 次に落とす動物の角度を変更します。実際の物理bodyにもdrop時に反映されます。
    rotateSelectedAnimal(direction) {
        const step = Phaser.Math.DegToRad(11.25)
        this.selectedRotation = Phaser.Math.Angle.Wrap((this.selectedRotation ?? 0) + direction * step)
        if (this.time.now - (this.lastRotateSfxAt ?? 0) > 110) {
            this.playSfx('select')
            this.lastRotateSfxAt = this.time.now
        }
        this.updateTargetCursor()
        this.dispatchHud(false)
    }

    playSfx(key) {
        try {
            this.sfx?.[key]?.play()
        } catch {
            // 音声ロック時もゲーム進行を止めない。
        }
    }

    // Phaser側の背景と台を描画します。タイトル画面ではなく、ゲーム中の見た目用です。
    drawBackground() {
        this.cameras.main.setBackgroundColor('#061321')
        const bg = this.add.graphics().setDepth(-20)
        bg.fillStyle(0x061321, 1)
        bg.fillRect(0, 0, WORLD.width, WORLD.height)
        bg.fillStyle(0x08263a, 1)
        bg.fillRect(0, 0, WORLD.width, 455)
        bg.fillStyle(0x075236, 0.96)
        bg.fillRect(0, 455, WORLD.width, WORLD.height - 455)
        bg.fillStyle(0x03101c, 0.72)
        bg.fillTriangle(0, 455, 160, 255, 326, 455)
        bg.fillTriangle(240, 455, 470, 265, 690, 455)
        bg.fillTriangle(760, 455, 1030, 265, 1280, 455)
        bg.lineStyle(1, 0x7ee7ff, 0.10)
        for (let x = 0; x <= WORLD.width; x += 80) {
            bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, WORLD.height); bg.strokePath()
        }
        for (let y = 40; y <= WORLD.height; y += 80) {
            bg.beginPath(); bg.moveTo(0, y); bg.lineTo(WORLD.width, y); bg.strokePath()
        }

        // UIではなく、実際に遊ぶ場所として見えるよう、中央をステージ化する。
        bg.fillStyle(0x071421, 0.32)
        bg.fillRoundedRect(332, 174, 636, 412, 42)
        bg.lineStyle(4, 0x7ee7ff, 0.18)
        bg.strokeRoundedRect(332, 174, 636, 412, 42)
        bg.lineStyle(2, 0xffffff, 0.13)
        for (let x = WORLD.stageCenterX - WORLD.matWidth / 2; x <= WORLD.stageCenterX + WORLD.matWidth / 2; x += 46) {
            bg.beginPath()
            bg.moveTo(x, 152)
            bg.lineTo(x, WORLD.matTopY + 18)
            bg.strokePath()
        }

        // 落下ラインと選択範囲。操作の意味が一瞬で分かるようにステージ側にも常時表示。
        bg.lineStyle(3, 0x7ee7ff, 0.14)
        bg.beginPath()
        bg.moveTo(this.getPlacementMinX(), 102)
        bg.lineTo(this.getPlacementMinX(), WORLD.matTopY + 28)
        bg.moveTo(this.getPlacementMaxX(), 102)
        bg.lineTo(this.getPlacementMaxX(), WORLD.matTopY + 28)
        bg.strokePath()
        bg.fillStyle(0x7ee7ff, 0.018)
        bg.fillRoundedRect(this.getPlacementMinX(), 206, this.getPlacementMaxX() - this.getPlacementMinX(), WORLD.matTopY - 198, 18)

        // ミス判定ライン。見た目を強くしすぎず、落ちたらアウトの意味だけ伝える。
        bg.lineStyle(3, 0xff705f, 0.36)
        bg.beginPath()
        bg.moveTo(WORLD.stageCenterX - WORLD.matWidth / 2 - 86, WORLD.faultLineY)
        bg.lineTo(WORLD.stageCenterX + WORLD.matWidth / 2 + 86, WORLD.faultLineY)
        bg.strokePath()
        bg.fillStyle(0x071421, 0.48)
        bg.fillRoundedRect(WORLD.stageCenterX - 142, WORLD.faultLineY + 12, 284, 30, 15)
        this.add.text(WORLD.stageCenterX, WORLD.faultLineY + 27, 'OUT LINE', {
            fontFamily: FONT, fontSize: '14px', color: '#ffdbd3', fontStyle: 'bold', stroke: '#071421', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(-9)

        // 台は前よりゲーム内オブジェクト感を出す。
        const matX = WORLD.stageCenterX - WORLD.matWidth / 2
        bg.fillStyle(0x020a0e, 0.44)
        bg.fillEllipse(WORLD.stageCenterX, WORLD.matTopY + 48, WORLD.matWidth + 160, 84)
        bg.fillStyle(0x033423, 1)
        bg.fillRoundedRect(matX - 18, WORLD.matTopY + 14, WORLD.matWidth + 36, WORLD.matHeight + 18, 18)
        bg.fillStyle(0x06764f, 1)
        bg.fillRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 15)
        bg.fillStyle(0x44c996, 1)
        bg.fillRoundedRect(matX + 14, WORLD.matTopY + 8, WORLD.matWidth - 28, 11, 5)
        bg.lineStyle(7, 0x052f22, 1)
        bg.strokeRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 15)
        bg.lineStyle(3, 0x9fffd2, 0.5)
        bg.strokeRoundedRect(matX + 10, WORLD.matTopY + 8, WORLD.matWidth - 20, WORLD.matHeight - 16, 11)
        bg.fillStyle(0x052f22, 0.92)
        for (let x = matX + 12; x < matX + WORLD.matWidth - 12; x += 28) {
            bg.fillTriangle(x, WORLD.matTopY + WORLD.matHeight - 2, x + 14, WORLD.matTopY + WORLD.matHeight + 31, x + 28, WORLD.matTopY + WORLD.matHeight - 2)
        }

        this.add.text(WORLD.stageCenterX, WORLD.matTopY + 22, 'DROP ZONE', {
            fontFamily: FONT, fontSize: '16px', color: '#eafff3', fontStyle: 'bold', stroke: '#043523', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(-8)
    }

    // Matter.js用の床・台・左右壁。見た目の台と物理の台を同期させます。
    createStageBodies() {
        this.staticBodies.push(this.matter.add.rectangle(WORLD.stageCenterX, WORLD.matTopY + WORLD.matHeight / 2, WORLD.matWidth, WORLD.matHeight, {
            isStatic: true,
            friction: 0.98,
            restitution: 0,
        }))
        this.staticBodies.push(this.matter.add.rectangle(640, WORLD.floorY + 18, 1280, 36, {
            isStatic: true,
            friction: 0.98,
            restitution: 0,
        }))
    }

    createHudTexts() {
        this.messageText = this.add.text(650, 150, '', {
            fontFamily: FONT, fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#071421', strokeThickness: 6, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.hintText = this.add.text(650, 178, '', {
            fontFamily: FONT, fontSize: '15px', color: '#fff4a2', fontStyle: 'bold',
            stroke: '#071421', strokeThickness: 4, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.turnText = this.add.text(650, 202, '', {
            fontFamily: FONT, fontSize: '14px', color: '#dff3ff', fontStyle: 'bold',
            stroke: '#071421', strokeThickness: 4, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.targetText = this.add.text(1038, 96, '', {
            fontFamily: FONT, fontSize: '22px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 220, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55).setVisible(false)
        this.timerText = this.add.text(1118, 96, '', {
            fontFamily: FONT, fontSize: '24px', color: '#e94834', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center',
        }).setOrigin(0.5).setDepth(55).setVisible(false)
    }

    createPlayerViews() {
        for (let index = 0; index < this.playerCount; index += 1) {
            const x = 440 + index * 78
            const view = this.add.container(x, 640).setDepth(40).setAlpha(0)
            const shadow = this.add.graphics()
            shadow.fillStyle(0x000000, 0.16)
            shadow.fillEllipse(0, 30, 66, 15)
            const marker = this.add.image(0, -8, `player-marker-p${index + 1}`).setDisplaySize(66, 66)
            const label = this.add.text(0, 50, `P${index + 1}`, {
                fontFamily: FONT, fontSize: '15px', color: '#1b1b1b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3,
            }).setOrigin(0.5)
            view.add([shadow, marker, label])
            this.playerViews.push(view)
        }
    }

    // リトライや開始時に、積まれた動物と一時UIを全削除します。
    resetArena() {
        this.animals.forEach((animal) => {
            if (animal.body) this.matter.world.remove(animal.body)
            animal.view?.destroy()
        })
        this.animals = []
        this.cursorView?.destroy()
        this.cursorView = null
        this.rotationPreview?.destroy()
        this.rotationPreview = null
        this.clearNextTurnPrompt()
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.stableSince = null
        this.droppedThisTurn = []
        this.towerPressure = 0
    }

    // 動物ごとのshape指定をMatter.jsのbodyへ変換します。丸/四角/横長/縦長/台形の差がゲーム性です。
    createAnimalMatterBody(type, x, y) {
        const baseOptions = {
            friction: type.shape === 'circle' ? 0.62 : 0.88,
            frictionStatic: type.shape === 'circle' ? 0.38 : 0.68,
            restitution: type.shape === 'circle' ? 0.08 : 0.035,
            density: type.density,
            frictionAir: 0.0015,
        }

        if (type.shape === 'circle') {
            return MATTER.Bodies.circle(x, y, Math.max(type.width, type.height) * 0.46, baseOptions, 28)
        }

        if (type.shape === 'square') {
            return MATTER.Bodies.rectangle(x, y, type.width, type.height, {
                ...baseOptions,
                chamfer: { radius: 4 },
            })
        }

        if (type.shape === 'longBox') {
            return MATTER.Bodies.rectangle(x, y, type.width, type.height, {
                ...baseOptions,
                chamfer: { radius: 5 },
            })
        }

        if (type.shape === 'tallBox') {
            return MATTER.Bodies.rectangle(x, y, type.width, type.height, {
                ...baseOptions,
                chamfer: { radius: 6 },
            })
        }

        if (type.shape === 'heavyBox') {
            return MATTER.Bodies.rectangle(x, y, type.width, type.height, {
                ...baseOptions,
                chamfer: { radius: 7 },
            })
        }

        if (type.shape === 'wedge') {
            return MATTER.Bodies.trapezoid(x, y, type.width, type.height, 0.34, {
                ...baseOptions,
                chamfer: { radius: 5 },
            })
        }

        return MATTER.Bodies.rectangle(x, y, type.width, type.height, {
            ...baseOptions,
            chamfer: { radius: Math.min(16, Math.max(6, type.height * 0.24)) },
        })
    }

    // 動物を1匹生成して落とします。ownerがある場合は現在プレイヤーの手番ドロップです。
    createAnimalBody(type, x, y, force = 2.7, owner = null, storm = false, angle = null) {
        const body = this.createAnimalMatterBody(type, x, y)
        this.matter.world.add(body)
        const initialAngle = angle ?? Phaser.Math.FloatBetween(-0.55, 0.55)
        MATTER.Body.setAngle(body, initialAngle)
        const minVelocity = storm ? STORM_DROP_MIN_VELOCITY : PLAYER_DROP_MIN_VELOCITY
        MATTER.Body.setVelocity(body, { x: Phaser.Math.FloatBetween(-0.18, 0.18), y: Math.max(force, minVelocity) })
        const angularBase = type.shape === 'circle' ? 0.08 : type.shape === 'tallBox' ? 0.06 : type.shape === 'wedge' ? 0.055 : 0.035
        MATTER.Body.setAngularVelocity(body, angle === null ? Phaser.Math.FloatBetween(-angularBase, angularBase) : Phaser.Math.FloatBetween(-angularBase * 0.35, angularBase * 0.35))
        const view = this.add.container(x, y).setDepth(26)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, type.height / 2 + 7, Math.max(42, type.width * 0.72), 8)
        const image = this.add.image(0, 0, type.imageKey).setDisplaySize(type.width, type.height)
        view.add([shadow, image])
        const animal = { body, view, type, active: true, owner, storm }
        this.animals.push(animal)
        if (!storm) this.droppedThisTurn.push(animal)
        this.showPlaceBurst(x, y + 34, storm ? 0x6bdcff : (PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffd23d))
        this.playSfx('lane')
        return animal
    }

    getTowerTopY() {
        let minY = WORLD.matTopY
        this.animals.forEach((animal) => {
            if (animal.active && animal.body && animal.body.position.y < WORLD.floorY + 80) {
                minY = Math.min(minY, animal.body.bounds.min.y)
            }
        })
        return clamp(minY, 128, WORLD.matTopY - 58)
    }

    getPlacementMinX() {
        return WORLD.stageCenterX - WORLD.matWidth / 2 + 46
    }

    getPlacementMaxX() {
        return WORLD.stageCenterX + WORLD.matWidth / 2 - 46
    }

    getSelectedLaneX() {
        return clamp(this.selectedDropX ?? WORLD.stageCenterX, this.getPlacementMinX(), this.getPlacementMaxX())
    }

    createLaneViews() {
        this.destroyLaneViews()
        const zone = this.add.container(WORLD.stageCenterX, WORLD.matTopY - 24).setDepth(42)
        const g = this.add.graphics()
        zone.add([g])
        this.laneViews.push({ lane: zone, g, index: 0 })
        this.updateLaneViews()
    }

    destroyLaneViews() {
        this.laneViews.forEach(({ lane }) => lane.destroy())
        this.laneViews = []
    }

    updateLaneViews() {
        this.laneViews.forEach(({ g }) => {
            const width = WORLD.matWidth - 72
            g.clear()
            g.fillStyle(0xffffff, 0.045)
            g.fillRoundedRect(-width / 2, -218, width, 226, 20)
            g.lineStyle(2, 0xffffff, 0.22)
            g.strokeRoundedRect(-width / 2, -218, width, 226, 20)
        })
    }

    createLoadCards() {
        this.destroyLoadCards()
    }

    destroyLoadCards() {
        this.loadCards.forEach(({ card }) => card.destroy())
        this.loadCards = []
    }

    selectPlan() {
        if (this.phase !== 'select') return
        this.selectedPlanIndex = 0
        this.dropProfile = this.getDropProfile()
        this.updateLoadCards()
        this.updateTargetCursor()
        this.dispatchHud(false)
    }

    updateLoadCards() {
        const profile = this.dropProfile ?? this.getDropProfile()
        const type = profile.types[0]
        this.loadCards.forEach(({ bg, card, icon }) => {
            bg.clear()
            bg.fillStyle(0xffffff, 0.52)
            bg.fillCircle(0, 0, 42)
            bg.lineStyle(3, 0xffffff, 0.62)
            bg.strokeCircle(0, 0, 42)
            icon?.setTexture(type.imageKey).setDisplaySize(type.width * 0.42, type.height * 0.42).setRotation(this.selectedRotation ?? 0)
            card.setScale(1)
        })
        const degrees = Math.round(Phaser.Math.RadToDeg(this.selectedRotation ?? 0))
        this.targetText?.setText(`次 ${profile.label}  ${degrees}°`)
    }


    updateTargetCursor() {
        if (!this.cursorView) this.cursorView = this.add.graphics().setDepth(44)
        this.cursorView.clear()
        const laneX = this.getSelectedLaneX()
        const topY = this.getTowerTopY()
        const color = PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffffff
        const profile = this.dropProfile ?? this.getDropProfile()
        const type = profile.types[0]
        const previewY = Math.max(54, topY - 214)
        this.cursorView.lineStyle(4, color, 0.72)
        this.cursorView.beginPath()
        this.cursorView.moveTo(laneX, Math.max(42, topY - 250))
        this.cursorView.lineTo(laneX, topY - 36)
        this.cursorView.strokePath()
        this.cursorView.fillStyle(color, 0.72)
        this.cursorView.fillTriangle(laneX - 20, topY - 68, laneX + 20, topY - 68, laneX, topY - 34)
        this.cursorView.fillStyle(color, 0.07)
        this.cursorView.fillRoundedRect(laneX - 54, topY - 220, 108, 220, 18)
        this.cursorView.lineStyle(3, color, 0.68)
        this.cursorView.strokeRoundedRect(laneX - 54, topY - 220, 108, 220, 18)
        this.cursorView.lineStyle(2, 0xffffff, 0.48)
        this.cursorView.strokeCircle(laneX, previewY, Math.max(36, Math.max(type.width, type.height) * 0.34))
        this.cursorView.fillStyle(0xffffff, 0.28)
        this.cursorView.fillCircle(laneX, previewY, 5)

        if (!this.rotationPreview || this.rotationPreview.texture.key !== type.imageKey) {
            this.rotationPreview?.destroy()
            this.rotationPreview = this.add.image(laneX, previewY, type.imageKey).setDepth(45).setAlpha(0.72)
        }
        this.rotationPreview
            .setPosition(laneX, previewY)
            .setDisplaySize(type.width * 0.82, type.height * 0.82)
            .setRotation(this.selectedRotation ?? 0)
            .setAlpha(0.72)

        this.updateLaneViews()
        this.updateLoadCards()
    }

    updatePlayerViews() {
        this.playerViews.forEach((view, index) => {
            const isCurrent = index === this.currentPlayerIndex && this.phase !== 'finished'
            const isAlive = this.alive[index]
            const targetX = isCurrent ? 1046 : 440 + index * 78
            const targetY = isCurrent ? 548 : 680
            const scale = isCurrent ? 0.82 : 0.6
            const alpha = isCurrent && isAlive ? 0.86 : 0
            this.tweens.killTweensOf(view)
            this.tweens.add({ targets: view, x: targetX, y: targetY, scaleX: scale, scaleY: scale, alpha, duration: 220, ease: 'Quad.easeOut' })
        })
    }

    // 次の生存プレイヤーへ手番を回します。ターン順は開始時にシャッフル済みです。
    beginTurn(preferredIndex = this.currentPlayerIndex) {
        this.clearNextTurnPrompt()
        if (this.phase === 'finished') return
        if (this.shouldFinish()) {
            this.finishGame()
            return
        }
        const nextIndex = this.findNextTurnOrderAlive(preferredIndex)
        this.currentPlayerIndex = nextIndex
        this.phase = 'preTurn'
        this.turnNumber += 1
        this.roundNumber = Math.floor((this.turnNumber - 1) / Math.max(1, this.playerCount)) + 1
        this.selectedDropX = clamp(WORLD.stageCenterX + Phaser.Math.Between(-120, 120), this.getPlacementMinX(), this.getPlacementMaxX())
        this.selectedRotation = Phaser.Math.DegToRad(Phaser.Math.Between(-20, 20))
        this.selectedPlanIndex = 0
        this.bonusLaneIndex = (this.turnNumber + this.currentPlayerIndex * 2) % DROP_LANE_OFFSETS.length
        this.droppedThisTurn = []
        this.dropProfile = this.getDropProfile()
        this.playSfx('turn')
        this.updatePlayerViews()
        this.turnText?.setText(`TURN ${this.turnNumber}/${this.maxTurns}`)
        this.dispatchHud(false)

        const attackCount = this.incomingAttack[this.currentPlayerIndex] ?? 0
        if (attackCount > 0) {
            this.incomingAttack[this.currentPlayerIndex] = 0
            this.startAttackDrop(attackCount)
            return
        }
        this.enterSelectPhase()
    }

    // プレイヤーが位置と角度を決めるフェーズへ入ります。
    enterSelectPhase() {
        if (this.phase === 'finished') return
        this.phase = 'select'
        this.inputLockedUntil = this.time.now
        this.turnStartedAt = this.time.now
        this.stableSince = null
        if (!this.dropProfile) this.dropProfile = this.getDropProfile()
        this.createLaneViews()
        this.createLoadCards()
        this.showTurnSplash(this.currentPlayerIndex)
        this.showMessage('', '')
        this.updateTargetCursor()
        this.dispatchHud(false)
    }

    // 全プレイヤーが1回ずつ置いた後の追加どうぶつイベント。誰かのミス扱いにはしません。
    startRoundDrop() {
        this.phase = 'roundDrop'
        this.roundStormDone.add(this.roundNumber)
        this.roundStormStartedAt = this.time.now
        this.roundStormStableSince = null
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.cursorView?.clear()
        this.rotationPreview?.setAlpha(0)
        const count = Math.min(this.difficultyConfig.maxDrop + 2, 1 + this.roundNumber)
        this.showMessage('一巡おわり！', `上から追加 ${count}匹`)
        this.showStormWarning(count)
        this.showScreenFlash(0xffd641, 0.14)
        this.time.delayedCall(90, () => this.spawnRoundAnimals(count, 6.1 + this.roundNumber * 0.18))
        this.dispatchHud(false)
    }

    startAttackDrop(count = 1) {
        this.phase = 'attackDrop'
        this.attackStormStartedAt = this.time.now
        this.attackStormStableSince = null
        this.attackStormCount = clamp(count, 1, 3)
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.cursorView?.clear()
        this.rotationPreview?.setAlpha(0)
        this.showMessage('追加どうぶつ', `上から ${this.attackStormCount}匹`)
        this.time.delayedCall(100, () => this.spawnStormAnimals(this.attackStormCount, 6.3 + this.roundNumber * 0.18, true))
        this.dispatchHud(false)
    }


    // 一巡後の追加どうぶつを台全体へ散らして落とします。
    spawnRoundAnimals(count, force) {
        for (let index = 0; index < count; index += 1) {
            const type = ANIMAL_TYPES[(this.roundNumber * 3 + index * 2) % ANIMAL_TYPES.length]
            const minX = this.getPlacementMinX()
            const maxX = this.getPlacementMaxX()
            const ratio = count === 1 ? 0.5 : index / Math.max(1, count - 1)
            const x = minX + (maxX - minX) * ratio + Phaser.Math.Between(-22, 22)
            const y = Math.max(62, this.getTowerTopY() - STORM_DROP_START_OFFSET - index * 30)
            this.time.delayedCall(index * 70, () => this.createAnimalBody(type, x, y, force, null, true))
        }
        this.time.delayedCall(Math.max(160, count * 70), () => this.nudgeTower(0.0008 + this.roundNumber * 0.00022))
    }

    spawnStormAnimals(count, force, storm = true) {
        for (let index = 0; index < count; index += 1) {
            const type = ANIMAL_TYPES[(this.turnNumber + this.roundNumber + index * 2) % ANIMAL_TYPES.length]
            const x = clamp(this.getSelectedLaneX() + Phaser.Math.Between(-120, 120), this.getPlacementMinX(), this.getPlacementMaxX())
            const y = Math.max(64, this.getTowerTopY() - STORM_DROP_START_OFFSET - index * 28)
            this.time.delayedCall(index * 85, () => this.createAnimalBody(type, x, y, force, null, storm))
        }
    }

    // 現在プレビュー中の動物を実際に落とします。位置と回転はここで確定します。
    dropSelectedLoad() {
        if (this.phase !== 'select') return
        if (this.time.now < this.inputLockedUntil) return
        this.phase = 'settling'
        this.cursorView?.clear()
        this.rotationPreview?.setAlpha(0)
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.timerText?.setText('')
        this.dropStartedAt = this.time.now
        this.stableSince = null
        this.dropReachedAt = null
        this.droppedThisTurn = []
        const targetTopY = this.getTowerTopY()
        this.dropContactY = targetTopY
        const profile = this.dropProfile ?? this.getDropProfile()
        const comboRate = 1 + Math.min(this.combo[this.currentPlayerIndex] ?? 0, 5) * 0.14
        this.pendingBonus = false
        this.pendingScore = Math.round(profile.score * comboRate)
        const baseX = this.getSelectedLaneX()
        const baseY = Math.max(116, targetTopY - PLAYER_DROP_START_OFFSET)
        this.playSfx('place')
        this.showMessage('', '')
        profile.types.forEach((type, index) => {
            this.time.delayedCall(150 * index, () => {
                this.createAnimalBody(type, baseX + profile.offsets[index], baseY - index * 30, profile.force, this.currentPlayerIndex, false, this.selectedRotation ?? 0)
            })
        })
        this.time.delayedCall(120, () => this.nudgeTower(0.00045 + profile.risk * 0.00022 + this.towerPressure * 0.00012))
        this.dispatchHud(false)
    }

    getDropProfile() {
        return this.getDropProfileForPlan(this.selectedPlanIndex)
    }

    // 次に出る動物を決めます。位置・ターン・プレイヤーで変わるため、毎回同じになりません。
    getDropProfileForPlan() {
        const round = Math.max(1, this.roundNumber)
        const pool = ANIMAL_TYPES
        const pickIndex = (this.turnNumber * 3 + this.currentPlayerIndex * 5 + Math.floor((this.getSelectedLaneX() - this.getPlacementMinX()) / 44) + round) % pool.length
        const type = pool[pickIndex]
        return {
            plan: DROP_PLANS[0],
            label: type.label,
            key: 'animal',
            hudKey: type.key,
            count: 1,
            types: [type],
            offsets: [0],
            force: 8.0 + Math.min(round, 5) * 0.2,
            risk: type.risk ?? Math.max(1, Math.round((type.points ?? 100) / 120)),
            score: type.points ?? 100,
        }
    }

    // Phaserの毎フレーム更新。フェーズごとに入力・安定判定・追加落下判定を分岐します。
    update() {
        this.syncViews()
        this.handleKeyboardInput()
        if (this.phase === 'select') {
            this.updateTurnTimer()
            this.updateTargetCursor()
        }
        if (this.phase === 'settling') this.checkPlayerDropSettle()
        if (this.phase === 'roundDrop') this.checkStormSettle('round')
        if (this.phase === 'attackDrop') this.checkStormSettle('attack')
    }

    syncViews() {
        this.animals.forEach((animal) => {
            if (!animal.active || !animal.body || !animal.view?.active) return
            animal.view.setPosition(animal.body.position.x, animal.body.position.y)
            animal.view.setRotation(animal.body.angle)
        })
    }

    // 手番タイマー。0になったら自動で落とし、展示プレイで止まらないようにしています。
    updateTurnTimer() {
        const leftMs = Math.max(0, TURN_SELECT_MS - (this.time.now - this.turnStartedAt))
        const left = Math.ceil(leftMs / 1000)
        this.timerText?.setText(`${left}`)
        if (leftMs <= 0) this.dropSelectedLoad()
    }

    handleKeyboardInput() {
        const keys = this.keyHandlers
        if (!keys) return
        if (this.phase === 'opening') {
            if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) this.finishOpeningCountdown()
            return
        }
        if (this.phase === 'message') {
            this.qRotateHeld = false
            this.eRotateHeld = false
            if (this.time.now >= this.messageAdvanceLockedUntil && (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER))) this.advanceTurn()
            return
        }
        if (this.phase !== 'select') {
            this.qRotateHeld = false
            this.eRotateHeld = false
            return
        }
        if (this.time.now < this.inputLockedUntil) {
            this.qRotateHeld = false
            this.eRotateHeld = false
            return
        }
        const move = 5.8
        const rotateRepeatDelay = 170
        const rotateRepeatInterval = 72
        const now = this.time.now
        let moved = false
        if (keys.LEFT?.isDown || keys.A?.isDown) {
            this.selectedDropX = clamp((this.selectedDropX ?? WORLD.stageCenterX) - move, this.getPlacementMinX(), this.getPlacementMaxX())
            moved = true
        }
        if (keys.RIGHT?.isDown || keys.D?.isDown) {
            this.selectedDropX = clamp((this.selectedDropX ?? WORLD.stageCenterX) + move, this.getPlacementMinX(), this.getPlacementMaxX())
            moved = true
        }

        const qDown = Boolean(keys.Q?.isDown)
        const eDown = Boolean(keys.E?.isDown)

        if (qDown && !eDown) {
            if (!this.qRotateHeld) {
                this.qRotateHeld = true
                this.qRotateRepeatAt = now + rotateRepeatDelay
                this.rotateSelectedAnimal(-1)
            } else if (now >= this.qRotateRepeatAt) {
                this.qRotateRepeatAt = now + rotateRepeatInterval
                this.rotateSelectedAnimal(-1)
            }
        } else {
            this.qRotateHeld = false
            this.qRotateRepeatAt = 0
        }

        if (eDown && !qDown) {
            if (!this.eRotateHeld) {
                this.eRotateHeld = true
                this.eRotateRepeatAt = now + rotateRepeatDelay
                this.rotateSelectedAnimal(1)
            } else if (now >= this.eRotateRepeatAt) {
                this.eRotateRepeatAt = now + rotateRepeatInterval
                this.rotateSelectedAnimal(1)
            }
        } else {
            this.eRotateHeld = false
            this.eRotateRepeatAt = 0
        }

        if (moved) {
            this.updateTargetCursor()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) this.dropSelectedLoad()
    }

    // 自分が落とした1匹の安定判定。落ちたらミス、安定すればセーフ。
    checkPlayerDropSettle() {
        if (this.time.now - this.dropStartedAt < 170) return
        const fallen = this.getFallenAnimal()
        if (fallen) {
            this.handleMiss(fallen)
            return
        }

        const reachedTarget = this.hasDroppedLoadReachedTarget()
        if (!reachedTarget) return
        if (this.dropReachedAt === null) this.dropReachedAt = this.time.now
        if (this.time.now - this.dropReachedAt < 120) return

        if (this.isTowerStable()) {
            if (this.stableSince === null) this.stableSince = this.time.now
            if (this.time.now - this.stableSince >= this.difficultyConfig.settleMs) this.handleSafe()
        } else {
            this.stableSince = null
            if (this.time.now - this.dropReachedAt > 860) this.handleSafe()
        }
    }

    hasDroppedLoadReachedTarget() {
        const animal = this.droppedThisTurn.find((entry) => entry?.active && entry?.body)
        if (!animal?.body) return false
        return animal.body.bounds.max.y >= (this.dropContactY - 12)
    }

    // 追加どうぶつの安定判定。ここでは誰かのHPを減らさず、落ちた分だけノーカウントにします。
    checkStormSettle(kind) {
        const startedAt = kind === 'round' ? this.roundStormStartedAt : this.attackStormStartedAt
        if (this.time.now - startedAt < 300) return
        const fallen = this.getFallenAnimal()
        if (fallen) {
            this.removeFallenAnimals()
            if (kind === 'round') {
                this.roundStormStableSince = null
                this.roundStormStartedAt = this.time.now
            } else {
                this.attackStormStableSince = null
                this.attackStormStartedAt = this.time.now
            }
            this.showMessage('追加どうぶつ', '落ちた分はノーカウント')
            return
        }
        if (this.isTowerStable()) {
            if (kind === 'round') {
                if (this.roundStormStableSince === null) this.roundStormStableSince = this.time.now
                if (this.time.now - this.roundStormStableSince > 220) this.beginTurn()
            } else {
                if (this.attackStormStableSince === null) this.attackStormStableSince = this.time.now
                if (this.time.now - this.attackStormStableSince > 220) this.enterSelectPhase()
            }
        } else if (this.time.now - startedAt > 1400) {
            if (kind === 'round') this.beginTurn()
            else this.enterSelectPhase()
        }
    }

    getFallenAnimal() {
        return this.animals.find((animal) => {
            if (!animal.active || !animal.body) return false
            const body = animal.body
            if (body.position.y > WORLD.faultLineY) return true
            if (body.position.x < WORLD.stageCenterX - WORLD.matWidth / 2 - 56 && body.position.y > WORLD.matTopY - 96) return true
            if (body.position.x > WORLD.stageCenterX + WORLD.matWidth / 2 + 56 && body.position.y > WORLD.matTopY - 96) return true
            return false
        }) ?? null
    }

    removeFallenAnimals() {
        this.animals = this.animals.filter((animal) => {
            if (!animal.body || !animal.active) return false
            const shouldRemove = animal.body.position.y > WORLD.faultLineY + 8
                || animal.body.position.x < WORLD.stageCenterX - WORLD.matWidth / 2 - 80
                || animal.body.position.x > WORLD.stageCenterX + WORLD.matWidth / 2 + 80
            if (shouldRemove) {
                this.matter.world.remove(animal.body)
                animal.view?.destroy()
                return false
            }
            return true
        })
    }

    isTowerStable() {
        const bodies = this.animals
            .filter((animal) => animal.active && animal.body && animal.body.position.y < WORLD.floorY + 80)
            .map((animal) => animal.body)
        if (bodies.length === 0) return true
        return bodies.every((body) => body.speed < 0.14 && Math.abs(body.angularVelocity) < 0.026)
    }

    // 置き方ボーナス判定。形状ごとに「良い置き方」を変えて、積み方の戦略を出しています。
    calculatePlacementBonus() {
        const animal = this.droppedThisTurn.find((entry) => entry?.active && entry?.body)
        if (!animal?.body || !animal?.type) return { bonus: 0, label: '' }
        const type = animal.type
        const angle = Math.abs(Phaser.Math.Angle.Wrap(animal.body.angle))
        const horizontal = Math.min(angle, Math.abs(Math.PI - angle))
        const vertical = Math.abs((Math.PI / 2) - angle)
        const speed = Math.hypot(animal.body.velocity.x, animal.body.velocity.y)
        if (type.shape === 'circle') {
            if (speed < 0.18) return { bonus: 70, label: '丸型ストップ' }
            return { bonus: 0, label: '' }
        }
        if (type.shape === 'longBox') {
            if (horizontal < Phaser.Math.DegToRad(10)) return { bonus: 110, label: '横置き成功' }
            return { bonus: 0, label: '' }
        }
        if (type.shape === 'tallBox') {
            if (vertical < Phaser.Math.DegToRad(11)) return { bonus: 150, label: '縦置き成功' }
            return { bonus: 0, label: '' }
        }
        if (type.shape === 'square' || type.shape === 'heavyBox') {
            if (Math.min(horizontal, vertical) < Phaser.Math.DegToRad(10)) return { bonus: 90, label: '角置き成功' }
            return { bonus: 0, label: '' }
        }
        if (type.shape === 'wedge') {
            if (horizontal < Phaser.Math.DegToRad(14)) return { bonus: 120, label: '斜面キープ' }
            return { bonus: 0, label: '' }
        }
        if (horizontal < Phaser.Math.DegToRad(12)) return { bonus: 80, label: '安定置き' }
        return { bonus: 0, label: '' }
    }

    // セーフ処理。スコア・コンボ・置き方ボーナス・演出・交代ポップアップをまとめて処理します。
    handleSafe() {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.combo[player] = Math.min((this.combo[player] ?? 0) + 1, 9)
        this.successes[player] += 1
        const placement = this.calculatePlacementBonus()
        if (placement.bonus > 0) {
            this.pendingScore += placement.bonus
            this.pendingBonus = true
        }
        this.dropPoints[player] += this.pendingScore
        this.towerPressure = Math.min(10, this.towerPressure + Math.max(1, this.dropProfile?.risk ?? 1))
        this.playSfx('safe')
        if (this.pendingBonus) this.playSfx('bonus')
        this.showStamp(WORLD.stageCenterX, 250, 'safe')
        this.showScreenFlash(0x69f099, 0.16)
        this.cameras.main.shake(90, 0.0025)
        this.showConfettiBurst(WORLD.stageCenterX, 340, 0xffd641)
        this.showScorePopup(WORLD.stageCenterX, 328, `+${this.pendingScore}`)
        if (placement.bonus > 0) this.showBonusRibbon(placement.label, placement.bonus)
        if ((this.combo[player] ?? 0) >= 3) this.showComboRibbon(this.combo[player])
        this.showMessage('セーフ！', `+${this.pendingScore}`)
        this.showNextTurnPrompt('safe', player, this.pendingScore)
        this.pendingScore = 0
        this.pendingBonus = false
        this.dispatchHud(true)
    }

    queueAttack(player) {
        if (this.dropProfile?.key !== 'attack') return 0
        const target = this.findNextAliveInTurnOrderAfterCurrent()
        if (target === player) return 0
        const amount = this.roundNumber >= 2 ? 2 : 1
        this.incomingAttack[target] = clamp((this.incomingAttack[target] ?? 0) + amount, 0, 3)
        return amount
    }

    // ミス処理。HP減少、脱落判定、赤フラッシュ、交代ポップアップを行います。
    handleMiss(fallenAnimal) {
        if (this.phase === 'finished') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.hp[player] = Math.max(0, this.hp[player] - 1)
        this.misses[player] += 1
        this.combo[player] = 0
        this.pendingScore = 0
        this.pendingBonus = false
        this.towerPressure = Math.max(0, this.towerPressure - 2)
        if (this.hp[player] <= 0) this.alive[player] = false
        this.cameras.main.shake(220, 0.008)
        this.playSfx('miss')
        const x = fallenAnimal?.body?.position?.x ?? WORLD.stageCenterX
        const y = Math.min(fallenAnimal?.body?.position?.y ?? 610, 610)
        this.showStamp(x, y, 'miss')
        this.showSparkBurst(x, y, 0xe94834)
        this.showScreenFlash(0xe94834, 0.22)
        this.showMessage('ミス！', this.hp[player] > 0 ? `P${player + 1} HP -1` : `P${player + 1} OUT`)
        this.showNextTurnPrompt('miss', player, 0)
        this.removeFallenAnimals()
        this.dispatchHud(true)
        this.updatePlayerViews()
        if (this.animals.length === 0) this.towerPressure = 0
    }

    // 交代ポップアップ後に呼ばれます。必要なら一巡後追加イベントを挟んで次手番へ進みます。
    advanceTurn() {
        this.cancelMessageAutoAdvance()
        if (this.phase === 'finished') return
        if (this.phase === 'message' && this.time.now < this.messageAdvanceLockedUntil) return
        this.messageAdvanceLockedUntil = 0
        if (this.shouldFinish()) {
            this.finishGame()
            return
        }
        const roundCompleted = this.turnNumber > 0 && this.turnNumber % Math.max(1, this.playerCount) === 0
        if (roundCompleted) {
            this.roundNumber = Math.floor(this.turnNumber / Math.max(1, this.playerCount)) + 1
            if (!this.roundStormDone.has(this.roundNumber)) {
                this.startRoundDrop()
                return
            }
        }
        this.beginTurn()
    }

    createTurnOrder(playerCount) {
        const order = Array.from({ length: playerCount }, (_, index) => index)
        for (let index = order.length - 1; index > 0; index -= 1) {
            const swapIndex = Phaser.Math.Between(0, index)
            const temp = order[index]
            order[index] = order[swapIndex]
            order[swapIndex] = temp
        }
        return order
    }

    findNextTurnOrderAlive() {
        const order = this.turnOrder.length > 0 ? this.turnOrder : Array.from({ length: this.playerCount }, (_, index) => index)
        for (let offset = 0; offset < order.length; offset += 1) {
            this.turnOrderCursor = (this.turnOrderCursor + 1) % order.length
            const candidate = order[this.turnOrderCursor]
            if (this.alive[candidate]) return candidate
        }
        return 0
    }


    findNextAliveInTurnOrderAfterCurrent() {
        const order = this.turnOrder.length > 0 ? this.turnOrder : Array.from({ length: this.playerCount }, (_, index) => index)
        const startCursor = this.turnOrderCursor >= 0 ? this.turnOrderCursor : order.indexOf(this.currentPlayerIndex)
        for (let offset = 1; offset <= order.length; offset += 1) {
            const candidate = order[(startCursor + offset + order.length) % order.length]
            if (candidate !== this.currentPlayerIndex && this.alive[candidate]) return candidate
        }
        return this.currentPlayerIndex
    }

    findNextAlivePlayer(startIndex) {
        const start = clamp(startIndex, 0, this.playerCount - 1)
        for (let offset = 0; offset < this.playerCount; offset += 1) {
            const candidate = (start + offset) % this.playerCount
            if (this.alive[candidate]) return candidate
        }
        return 0
    }

    shouldFinish() {
        if (this.playerCount === 1) return this.hp[0] <= 0 || this.turnNumber >= this.maxTurns
        return this.alive.filter(Boolean).length <= 1 || this.turnNumber >= this.maxTurns
    }

    nudgeTower(force = 0.0018) {
        const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1
        this.animals.forEach((animal) => {
            if (!animal.active || !animal.body || animal.body.position.y > WORLD.matTopY + 10) return
            MATTER.Body.applyForce(animal.body, animal.body.position, { x: force * direction * Phaser.Math.FloatBetween(0.45, 1.25), y: 0 })
        })
    }

    clearNextTurnPrompt() {
        if (!this.nextTurnPrompt) return
        this.tweens.killTweensOf(this.nextTurnPrompt)
        this.tweens.killTweensOf(this.nextTurnPrompt.list ?? [])
        this.nextTurnPrompt.destroy()
        this.nextTurnPrompt = null
    }

    cancelMessageAutoAdvance() {
        if (!this.messageAutoAdvanceEvent) return
        this.messageAutoAdvanceEvent.remove(false)
        this.messageAutoAdvanceEvent = null
    }

    scheduleMessageAutoAdvance(delay = 1350) {
        this.cancelMessageAutoAdvance()
        this.messageAutoAdvanceEvent = this.time.delayedCall(delay, () => {
            this.messageAutoAdvanceEvent = null
            if (this.phase === 'message') this.advanceTurn()
        })
    }

    // セーフ/ミス後の交代案内。強制待ちは入れず、クリック/SPACEでテンポよく進めます。
    showNextTurnPrompt(kind, player, score = 0) {
        this.clearNextTurnPrompt()
        const autoAdvanceMs = 430
        this.messageAdvanceLockedUntil = this.time.now
        this.messageText?.setText('')
        this.hintText?.setText('')
        this.turnText?.setText('')
        const willFinish = this.shouldFinish()
        const nextPlayer = willFinish ? player : this.findNextAliveInTurnOrderAfterCurrent()
        const color = kind === 'safe' ? 0x21bd64 : 0xe94834
        const darkColor = kind === 'safe' ? 0x0b7339 : 0x98231e
        const container = this.add.container(WORLD.stageCenterX, 58).setDepth(96).setAlpha(0).setScale(0.96)

        const panel = this.add.graphics()
        panel.fillStyle(0x061523, 0.84)
        panel.fillRoundedRect(-154, -17, 308, 34, 11)
        panel.lineStyle(2, color, 0.86)
        panel.strokeRoundedRect(-154, -17, 308, 34, 11)

        const ribbon = this.add.graphics()
        ribbon.fillStyle(color, 1)
        ribbon.fillRoundedRect(-144, -10, 68, 20, 10)
        const resultText = this.add.text(-110, -1, kind === 'safe' ? `SAFE +${score}` : `MISS P${player + 1}`, {
            fontFamily: FONT, fontSize: '10px', color: '#ffffff', fontStyle: 'bold', stroke: kind === 'safe' ? '#0b7339' : '#98231e', strokeThickness: 3,
        }).setOrigin(0.5)

        const marker = this.add.image(-50, 0, `player-marker-p${nextPlayer + 1}`).setDisplaySize(24, 24)
        const mainText = this.add.text(20, -1, willFinish ? '結果へ' : `つぎは P${nextPlayer + 1}`, {
            fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#071421', strokeThickness: 5,
        }).setOrigin(0.5)
        const waitText = this.add.text(112, -1, willFinish ? 'GO' : 'CLICK', {
            fontFamily: FONT, fontSize: '10px', color: '#fff4a2', fontStyle: 'bold', stroke: '#071421', strokeThickness: 4,
        }).setOrigin(0.5)

        const progressBack = this.add.graphics()
        progressBack.fillStyle(0xffffff, 0.12)
        progressBack.fillRoundedRect(-128, 11, 256, 3, 2)
        const progress = this.add.rectangle(-128, 12.5, 256, 3, darkColor).setOrigin(0, 0.5)
        progress.setDisplaySize(256, 3)

        container.add([panel, ribbon, resultText, marker, mainText, waitText, progressBack, progress])
        this.nextTurnPrompt = container
        this.tweens.add({ targets: container, alpha: 1, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' })
        this.tweens.add({ targets: progress, displayWidth: 0, duration: autoAdvanceMs, ease: 'Linear' })
        this.scheduleMessageAutoAdvance(autoAdvanceMs)
    }

    showMessage(main, sub = '') {
        this.messageText?.setText(main)
        this.hintText?.setText(sub)
        this.tweens.add({ targets: [this.messageText, this.hintText], scaleX: 1.04, scaleY: 1.04, yoyo: true, duration: 120 })
    }

    showTurnSplash(_playerIndex) {
        // 現在プレイヤーはReact HUDで表示するため、プレイ画面中央の手番演出は出さない。
    }

    showStamp(x, y, type) {
        const key = type === 'safe' ? 'ui-stamp-safe' : 'ui-stamp-miss'
        const img = this.add.image(x, y, key).setDisplaySize(128, 72).setDepth(75).setAlpha(0).setScale(0.55)
        this.tweens.add({ targets: img, alpha: 1, scaleX: 1, scaleY: 1, angle: type === 'safe' ? -6 : 5, duration: 140, ease: 'Back.easeOut' })
        this.tweens.add({ targets: img, alpha: 0, delay: 760, duration: 220, onComplete: () => img.destroy() })
    }

    showBonusRibbon(label, bonus) {
        const ribbon = this.add.container(WORLD.stageCenterX, 210).setDepth(90).setAlpha(0).setScale(0.82)
        const bg = this.add.graphics()
        bg.fillStyle(0xffd641, 0.98)
        bg.fillRoundedRect(-220, -38, 440, 76, 34)
        bg.lineStyle(6, 0xffffff, 0.95)
        bg.strokeRoundedRect(-220, -38, 440, 76, 34)
        const text = this.add.text(0, -5, `${label}  +${bonus}`, {
            fontFamily: FONT, fontSize: '31px', color: '#573713', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6,
        }).setOrigin(0.5)
        ribbon.add([bg, text])
        this.tweens.add({ targets: ribbon, alpha: 1, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' })
        this.tweens.add({ targets: ribbon, y: 176, alpha: 0, delay: 720, duration: 260, onComplete: () => ribbon.destroy() })
    }

    showComboRibbon(combo) {
        const ribbon = this.add.container(650, 152).setDepth(90).setAlpha(0).setScale(0.9)
        const bg = this.add.graphics()
        bg.fillStyle(0x2f73c9, 0.95)
        bg.fillRoundedRect(-160, -30, 320, 60, 28)
        bg.lineStyle(5, 0xffffff, 0.9)
        bg.strokeRoundedRect(-160, -30, 320, 60, 28)
        const text = this.add.text(0, 0, `COMBO x${combo}`, {
            fontFamily: FONT, fontSize: '32px', color: '#ffffff', fontStyle: 'bold', stroke: '#16406e', strokeThickness: 6,
        }).setOrigin(0.5)
        ribbon.add([bg, text])
        this.tweens.add({ targets: ribbon, alpha: 1, scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Back.easeOut' })
        this.tweens.add({ targets: ribbon, y: 118, alpha: 0, delay: 520, duration: 260, onComplete: () => ribbon.destroy() })
    }

    // 一巡後の追加どうぶつ前に、何が起きるかを明示する警告演出です。
    showStormWarning(count) {
        const panel = this.add.container(WORLD.stageCenterX, 250).setDepth(93).setAlpha(0).setScale(0.84)
        const bg = this.add.graphics()
        bg.fillStyle(0xff6b3c, 0.98)
        bg.fillRoundedRect(-300, -70, 600, 140, 38)
        bg.lineStyle(8, 0xffffff, 0.9)
        bg.strokeRoundedRect(-300, -70, 600, 140, 38)
        const main = this.add.text(0, -22, '追加どうぶつ！', {
            fontFamily: FONT, fontSize: '46px', color: '#ffffff', fontStyle: 'bold', stroke: '#96271e', strokeThickness: 8,
        }).setOrigin(0.5)
        const sub = this.add.text(0, 34, `上から ${count} 匹`, {
            fontFamily: FONT, fontSize: '29px', color: '#fff7b8', fontStyle: 'bold', stroke: '#96271e', strokeThickness: 6,
        }).setOrigin(0.5)
        panel.add([bg, main, sub])
        this.tweens.add({ targets: panel, alpha: 1, scaleX: 1, scaleY: 1, duration: 140, ease: 'Back.easeOut' })
        this.tweens.add({ targets: panel, alpha: 0, y: 212, delay: 700, duration: 220, onComplete: () => panel.destroy() })
    }

    showScorePopup(x, y, text) {
        const popup = this.add.text(x, y, text, {
            fontFamily: FONT, fontSize: '34px', color: '#006ed6', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(76)
        this.tweens.add({ targets: popup, y: y - 44, alpha: 0, duration: 760, ease: 'Cubic.easeOut', onComplete: () => popup.destroy() })
    }

    showPlaceBurst(x, y, color) {
        const g = this.add.graphics().setDepth(30)
        g.lineStyle(5, color, 0.86)
        g.strokeCircle(x, y, 18)
        this.tweens.add({ targets: g, alpha: 0, scaleX: 2.1, scaleY: 2.1, duration: 360, onComplete: () => g.destroy() })
    }

    showScreenFlash(color = 0xffffff, alpha = 0.24) {
        const flash = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, color, alpha).setDepth(92)
        this.tweens.add({ targets: flash, alpha: 0, duration: 240, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() })
    }

    showConfettiBurst(x, y, color = 0xffd641) {
        for (let index = 0; index < 26; index += 1) {
            const size = Phaser.Math.Between(5, 12)
            const piece = this.add.rectangle(x, y, size, size * Phaser.Math.FloatBetween(0.55, 1.25), index % 3 === 0 ? color : (index % 3 === 1 ? 0x42b9ff : 0xffffff), 0.94).setDepth(91)
            piece.setAngle(Phaser.Math.Between(0, 180))
            const angle = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08)
            this.tweens.add({
                targets: piece,
                x: x + Math.cos(angle) * Phaser.Math.Between(80, 260),
                y: y + Math.sin(angle) * Phaser.Math.Between(60, 180) + Phaser.Math.Between(40, 120),
                angle: piece.angle + Phaser.Math.Between(160, 520),
                alpha: 0,
                duration: Phaser.Math.Between(520, 880),
                ease: 'Cubic.easeOut',
                onComplete: () => piece.destroy(),
            })
        }
    }

    showSparkBurst(x, y, color) {
        for (let index = 0; index < 12; index += 1) {
            const dot = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.95).setDepth(78)
            const angle = (Math.PI * 2 * index) / 12
            this.tweens.add({ targets: dot, x: x + Math.cos(angle) * Phaser.Math.Between(42, 92), y: y + Math.sin(angle) * Phaser.Math.Between(28, 76), alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => dot.destroy() })
        }
    }

    // Phaser内部状態をReact HUDへ送ります。表示追加時はここのdetailへ値を足します。
    dispatchHud(isAnswerChecked = false) {
        const player = this.currentPlayerIndex
        const profile = this.dropProfile ?? this.getDropProfile()
        const currentScore = this.calculateScoreForPlayer(player)
        const comboRate = 1 + Math.min(this.combo[player] ?? 0, 5) * 0.14
        const previewScore = Math.round((profile.score ?? 0) * comboRate)
        runtimeHudTarget?.dispatchEvent(new CustomEvent('game-hud-update', {
            detail: {
                currentPlayerIndex: player,
                playerCount: this.playerCount,
                hp: [...this.hp],
                alive: [...this.alive],
                successes: [...this.successes],
                misses: [...this.misses],
                turnNumber: this.turnNumber,
                maxTurns: this.maxTurns,
                round: this.roundNumber,
                scores: this.dropPoints.map((_, index) => this.calculateScoreForPlayer(index)),
                currentScore,
                combo: this.combo[player] ?? 0,
                timeLeft: Math.max(0, Math.ceil((TURN_SELECT_MS - (this.time.now - this.turnStartedAt)) / 1000)),
                isAnswerChecked,
                isActionLocked: this.phase !== 'select' && !isAnswerChecked,
                nextButtonLabel: this.shouldFinish() ? '結果へ' : 'SPACE / CLICK',
                actionButtonLabel: this.phase === 'select' ? 'つむ！' : '判定中',
                ruleName: 'どうぶつタワーバトル',
                selectedItemLabel: `${profile.label} x${profile.count}`,
                selectedItemDescription: this.phase === 'roundDrop' ? 'EXTRA DROP' : 'DROP',
                selectedItemKey: profile.hudKey,
                selectedItemScore: profile.score ?? 0,
                selectedItemRisk: profile.risk ?? 1,
                previewScore,
                selectedLaneIndex: undefined,
                selectedRotationDegrees: Math.round(Phaser.Math.RadToDeg(this.selectedRotation ?? 0)),
                aliveCount: this.alive.filter(Boolean).length,
                difficultyLabel: this.difficultyConfig.label,
            },
        }))
    }

    // リザルト用の最終スコア計算。生存・HP・ミス・積み点を合算します。
    calculateScoreForPlayer(index) {
        const survivalBonus = this.alive[index] ? 700 : 0
        const hpBonus = (this.hp[index] ?? 0) * 260
        const missPenalty = (this.misses[index] ?? 0) * 160
        return Math.max(0, Math.round((this.dropPoints[index] ?? 0) + survivalBonus + hpBonus - missPenalty))
    }

    // ゲーム終了処理。ResultScreenへ渡す集計データを作ります。
    finishGame() {
        if (this.phase === 'finished') return
        this.phase = 'finished'
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.cursorView?.clear()
        this.rotationPreview?.setAlpha(0)
        this.clearNextTurnPrompt()
        this.timerText?.setText('')
        const results = Array.from({ length: this.playerCount }, (_, index) => ({
            player: index + 1,
            score: this.calculateScoreForPlayer(index),
            hp: this.hp[index] ?? 0,
            alive: this.alive[index] ?? false,
            successes: this.successes[index] ?? 0,
            misses: this.misses[index] ?? 0,
            dropPoints: this.dropPoints[index] ?? 0,
            survivalBonus: this.alive[index] ? 700 : 0,
            hpBonus: (this.hp[index] ?? 0) * 260,
            missPenalty: (this.misses[index] ?? 0) * 160,
        }))
        this.showScreenFlash(0xffd641, 0.22)
        this.showConfettiBurst(WORLD.stageCenterX, 280, 0xffd641)
        this.showMessage('決着！', '結果へ')
        this.dispatchHud(true)
        this.time.delayedCall(450, () => runtimeOnFinish({ results }))
    }
}
