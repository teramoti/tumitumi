import Phaser from 'phaser'

import {
    PLAYER_START_HP,
    getMaxTurns,
} from '../../app/data/gameRules'

let runtimeSettings = { playerCount: 4, difficulty: 'normal' }
let runtimeOnFinish = () => {}
let runtimeHudTarget = null

export const configureTowerCrashScene = (settings, onFinish) => {
    runtimeSettings = settings
    runtimeOnFinish = onFinish
    runtimeHudTarget = settings.hudTarget ?? null
}

const FONT = '"Hiragino Maru Gothic ProN", "Yu Gothic", "Meiryo", sans-serif'
const MATTER = Phaser.Physics.Matter.Matter

const WORLD = {
    width: 1280,
    height: 720,
    tableCenterX: 648,
    tableCenterY: 600,
    tableTopY: 580,
    tableWidth: 560,
    tableHeight: 38,
    groundY: 690,
    faultLineY: 656,
    leftLimitX: 360,
    rightLimitX: 936,
}

const PLAYER_COLORS = [0xe94834, 0x2f73c9, 0x2da65d, 0xf0a51f]
const PLAYER_DARK_COLORS = [0xa22d24, 0x1e4f91, 0x1f7143, 0x9b6413]
const PLACEMENT = {
    minX: WORLD.tableCenterX - WORLD.tableWidth / 2 + 36,
    maxX: WORLD.tableCenterX + WORLD.tableWidth / 2 - 36,
    keyStep: 16,
}

const PLAYER_FLOOR = {
    startX: 356,
    gap: 92,
    y: 673,
    currentY: 650,
}

const TIMING = {
    cycleMs: 1180,
    barWidth: 270,
    perfectRange: 0.08,
    goodRange: 0.22,
    perfectBonus: 90,
    goodBonus: 40,
    badAnglePenalty: 0.1,
    badSpin: 0.055,
}

const TARGET_ZONE = {
    bonus: 80,
    radius: 36,
}

const FEVER = {
    triggerStreak: 3,
    bonus: 140,
}

const HEIGHT_BONUS = {
    stepPx: 72,
    points: 35,
    cap: 280,
}

const CHOICE_COUNT_BY_DIFFICULTY = {
    easy: 4,
    normal: 4,
    hard: 5,
}

const BOOST = {
    multiplier: 2.5,
}

const ROUND_DROP = {
    enabledFromRound: 2,
    pool: ['smallCan', 'dice', 'key', 'watch', 'earphoneJack', 'battery', 'clip'],
    baseCount: 2,
    maxCount: 3,
}

const ROUND_SCALE = {
    step: 0.12,
    max: 1.45,
}

const DIFFICULTY_CONFIG = {
    easy: {
        gravity: 0.9,
        settleMs: 560,
        minWaitMs: 760,
        timeoutMs: 6000,
        stableSpeed: 0.18,
        stableAngularVelocity: 0.032,
        angleJitter: 0.015,
        frictionAir: 0.006,
        cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'marker', 'clip', 'card', 'earphoneJack'],
        label: 'ゆるめ',
    },
    normal: {
        gravity: 1.02,
        settleMs: 680,
        minWaitMs: 880,
        timeoutMs: 6800,
        stableSpeed: 0.15,
        stableAngularVelocity: 0.026,
        angleJitter: 0.04,
        frictionAir: 0.003,
        cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'smallCan', 'ruler', 'tape', 'marker', 'glue', 'stapler', 'clip', 'key', 'card', 'watch', 'earphoneJack'],
        label: 'ふつう',
    },
    hard: {
        gravity: 1.1,
        settleMs: 880,
        minWaitMs: 1050,
        timeoutMs: 7600,
        stableSpeed: 0.11,
        stableAngularVelocity: 0.02,
        angleJitter: 0.08,
        frictionAir: 0.0016,
        cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'smallCan', 'ruler', 'tape', 'mug', 'battery', 'marker', 'glue', 'stapler', 'scissors', 'phone', 'dice', 'clip', 'key', 'watch', 'card', 'headphones', 'earphoneJack'],
        label: 'ぐらぐら',
    },
}

const ITEM_KINDS = {
    book: {
        key: 'book', label: '本', icon: 'BOOK', description: '重いけど置きやすい', shape: 'book', width: 112, height: 26,
        color: 0x4b72d9, accent: 0xf7f1d5, density: 0.0052, friction: 0.92, frictionStatic: 0.86,
        points: 16,
    },
    notebook: {
        key: 'notebook', label: 'ノート', icon: 'NOTE', description: '薄くて安定しやすい', shape: 'notebook', width: 104, height: 20,
        color: 0xfff7dc, accent: 0x2f73c9, density: 0.0035, friction: 0.88, frictionStatic: 0.82,
        points: 14,
    },
    eraser: {
        key: 'eraser', label: '消しゴム', icon: 'ERASER', description: '小さいからズレやすい', shape: 'eraser', width: 58, height: 28,
        color: 0xffffff, accent: 0xff7aa5, density: 0.0032, friction: 0.8, frictionStatic: 0.64,
        points: 20,
    },
    box: {
        key: 'box', label: '小箱', icon: 'BOX', description: '四角くて安心', shape: 'box', width: 78, height: 50,
        color: 0xd7a15a, accent: 0x7b4a18, density: 0.0042, friction: 0.9, frictionStatic: 0.78,
        points: 18,
    },
    pencilCase: {
        key: 'pencilCase', label: 'ペンケース', icon: 'CASE', description: '横長で土台にしやすい', shape: 'case', width: 126, height: 30,
        color: 0x2aa7a3, accent: 0xf4f1de, density: 0.004, friction: 0.86, frictionStatic: 0.74,
        points: 17,
    },
    smallCan: {
        key: 'smallCan', label: '缶', icon: 'CAN', description: '丸くて転がる', shape: 'can', radius: 28, width: 56, height: 56,
        color: 0xcdd5e2, accent: 0xe94834, density: 0.0036, friction: 0.46, frictionStatic: 0.28, restitution: 0.05,
        points: 28,
    },
    tape: {
        key: 'tape', label: 'テープ', icon: 'TAPE', description: '穴あき丸で危険', shape: 'tape', radius: 29, width: 58, height: 58,
        color: 0xf7d85f, accent: 0xffffff, density: 0.003, friction: 0.38, frictionStatic: 0.24, restitution: 0.06,
        points: 32,
    },
    ruler: {
        key: 'ruler', label: '定規', icon: 'RULER', description: '細長い。置きどころ勝負', shape: 'ruler', width: 142, height: 14,
        color: 0xf6c85f, accent: 0x7b4a18, density: 0.0028, friction: 0.72, frictionStatic: 0.58,
        points: 34,
    },
    mug: {
        key: 'mug', label: 'コップ', icon: 'MUG', description: '背が高くて倒れやすい', shape: 'mug', width: 48, height: 64,
        color: 0xfff4d6, accent: 0x8652d6, density: 0.0034, friction: 0.7, frictionStatic: 0.5,
        points: 36,
    },
    battery: {
        key: 'battery', label: '電池', icon: 'CELL', description: '小さく重くてクセあり', shape: 'battery', width: 42, height: 62,
        color: 0x2f3a4a, accent: 0x81e06a, density: 0.0054, friction: 0.64, frictionStatic: 0.46,
        points: 38,
    },
    marker: {
        key: 'marker', label: 'マーカー', icon: 'MARK', description: '軽くて細い', shape: 'marker', width: 118, height: 18,
        color: 0xff7aa5, accent: 0xffffff, density: 0.0026, friction: 0.68, frictionStatic: 0.48,
        points: 30,
    },
    glue: {
        key: 'glue', label: 'のり', icon: 'GLUE', description: '背が高い', shape: 'glue', width: 44, height: 72,
        color: 0xffffff, accent: 0x4bb7ff, density: 0.0038, friction: 0.74, frictionStatic: 0.55,
        points: 35,
    },
    stapler: {
        key: 'stapler', label: 'ホチキス', icon: 'STPL', description: '重くて傾く', shape: 'stapler', width: 92, height: 36,
        color: 0x6f89a5, accent: 0xe8f5ff, density: 0.005, friction: 0.78, frictionStatic: 0.62,
        points: 36,
    },
    scissors: {
        key: 'scissors', label: 'はさみ', icon: 'CUT', description: '不規則で危険', shape: 'scissors', width: 104, height: 34,
        color: 0xd7dce5, accent: 0xef5947, density: 0.0036, friction: 0.58, frictionStatic: 0.38,
        points: 42,
    },
    phone: {
        key: 'phone', label: 'スマホ', icon: 'TEL', description: '薄くて重い', shape: 'phone', width: 72, height: 42,
        color: 0x202938, accent: 0x7dd7ff, density: 0.0062, friction: 0.82, frictionStatic: 0.7,
        points: 40,
    },
    dice: {
        key: 'dice', label: 'サイコロ', icon: 'DICE', description: '小さく跳ねる', shape: 'dice', width: 46, height: 46,
        color: 0xffffff, accent: 0x252525, density: 0.0032, friction: 0.5, frictionStatic: 0.35, restitution: 0.12,
        points: 44,
    },
    clip: {
        key: 'clip', label: 'クリップ', icon: 'CLIP', description: '細くて軽い', shape: 'clip', width: 72, height: 22,
        color: 0xd7dce5, accent: 0x5d7899, density: 0.0024, friction: 0.5, frictionStatic: 0.3,
        points: 33,
    },
    key: {
        key: 'key', label: 'カギ', icon: 'KEY', description: '小さくて重心が偏る', shape: 'key', width: 76, height: 28,
        color: 0xf6c85f, accent: 0x9b6413, density: 0.0048, friction: 0.54, frictionStatic: 0.34,
        points: 41,
    },
    watch: {
        key: 'watch', label: '時計', icon: 'TIME', description: '丸くて転がりやすい', shape: 'watch', width: 54, height: 54,
        color: 0x26384f, accent: 0x9fe6ff, density: 0.004, friction: 0.44, frictionStatic: 0.25, restitution: 0.06,
        points: 43,
    },
    card: {
        key: 'card', label: 'カード', icon: 'CARD', description: '薄くて滑りやすい', shape: 'card', width: 88, height: 18,
        color: 0xffffff, accent: 0xef5947, density: 0.0022, friction: 0.42, frictionStatic: 0.24,
        points: 31,
    },
    headphones: {
        key: 'headphones', label: 'イヤホン', icon: 'EAR', description: '形が不安定', shape: 'headphones', width: 86, height: 42,
        color: 0x6f4fc7, accent: 0xffd65f, density: 0.003, friction: 0.48, frictionStatic: 0.3,
        points: 46,
    },
    earphoneJack: {
        key: 'earphoneJack', label: 'イヤホンジャック', icon: 'JACK', description: '細くて先端が重い', shape: 'earphoneJack', width: 96, height: 20,
        color: 0x2f3a4a, accent: 0xcdd5e2, density: 0.0046, friction: 0.5, frictionStatic: 0.32,
        points: 48,
    },
}

const CHALLENGES = [
    {
        key: 'safe',
        label: '安全第一',
        hint: '崩さず置く',
        bonus: 40,
        matches: () => true,
    },
    {
        key: 'center',
        label: '中央勝負',
        hint: '中央に置く',
        bonus: 80,
        matches: (_kind, x) => Math.abs(x - WORLD.tableCenterX) <= 56,
    },
    {
        key: 'edge',
        label: '端攻め',
        hint: '左端か右端に置く',
        bonus: 120,
        matches: (_kind, x) => x <= PLACEMENT.minX + 64 || x >= PLACEMENT.maxX - 64,
    },
    {
        key: 'risky',
        label: '難物チャレンジ',
        hint: '丸い・細い雑貨を置く',
        bonus: 100,
        matches: (kind) => ['can', 'tape', 'ruler', 'mug', 'battery', 'marker', 'glue', 'scissors', 'dice', 'clip', 'key', 'watch', 'card', 'headphones', 'earphoneJack'].includes(kind?.shape),
    },
    {
        key: 'perfect',
        label: 'PERFECT審査',
        hint: 'PERFECTで置く',
        bonus: 140,
        matches: (_kind, _x, context = {}) => context.timingState?.key === 'perfect',
    },
    {
        key: 'highTower',
        label: '高さ勝負',
        hint: '高いタワーで成功',
        bonus: 120,
        matches: (_kind, _x, context = {}) => (context.stackHeight ?? 0) >= 220,
    },
    {
        key: 'boostOrder',
        label: 'BOOST注文',
        hint: 'BOOSTを使って成功',
        bonus: 150,
        matches: (_kind, _x, context = {}) => Boolean(context.boostUsed),
    },
]

const PARTY_EVENTS = [
    {
        key: 'standard',
        label: '通常ラウンド',
        hint: 'お題を狙う',
    },
    {
        key: 'double',
        label: 'ダブル点',
        hint: '成功点 x2 / でも少し揺れる',
        scoreMultiplier: 2,
        angleJitterBonus: 0.012,
    },
    {
        key: 'edgeRush',
        label: '端攻め祭り',
        hint: '端置き +120 / TARGET狭め',
        edgeBonus: 120,
        targetRadiusBonus: -8,
    },
    {
        key: 'comeback',
        label: '逆転チャンス',
        hint: '最下位成功 +130',
        comebackBonus: 130,
    },
    {
        key: 'precision',
        label: '精密審査',
        hint: 'PERFECT +160 / LATEは揺れる',
        timingBonusBoost: 160,
        angleJitterBonus: 0.018,
    },
    {
        key: 'crossWind',
        label: '横風注意',
        hint: '落下中に横風 / 成功 +100',
        windForce: 0.00042,
        windDirection: 1,
        survivalBonus: 100,
    },
    {
        key: 'reverseWind',
        label: '逆風注意',
        hint: '逆方向の横風 / 成功 +100',
        windForce: 0.00042,
        windDirection: -1,
        survivalBonus: 100,
    },
    {
        key: 'danger',
        label: '高難度ボーナス',
        hint: '難物成功 +140 / 揺れ強め',
        riskyBonus: 140,
        angleJitterBonus: 0.045,
    },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const pick = (items) => items[Math.floor(Math.random() * items.length)]

function getPlacementRatio(x) {
    return (clamp(x, PLACEMENT.minX, PLACEMENT.maxX) - PLACEMENT.minX) / (PLACEMENT.maxX - PLACEMENT.minX)
}

function getPlacementLabel(x) {
    const ratio = getPlacementRatio(x)
    if (ratio < 0.12) return '左端'
    if (ratio < 0.38) return '左寄り'
    if (ratio < 0.62) return '中央'
    if (ratio < 0.88) return '右寄り'
    return '右端'
}

function isEdgePlacement(x) {
    return x <= PLACEMENT.minX + 64 || x >= PLACEMENT.maxX - 64
}

function isRiskyKind(kind) {
    return ['can', 'tape', 'ruler', 'mug', 'battery', 'marker', 'glue', 'scissors', 'dice', 'clip', 'key', 'watch', 'card', 'headphones', 'earphoneJack'].includes(kind?.shape)
}

function getTimingGrade(distance) {
    if (distance <= TIMING.perfectRange) {
        return { key: 'perfect', label: 'PERFECT', bonus: TIMING.perfectBonus, color: 0xffd65f }
    }
    if (distance <= TIMING.goodRange) {
        return { key: 'good', label: 'GOOD', bonus: TIMING.goodBonus, color: 0x4ec778 }
    }
    return { key: 'late', label: 'LATE', bonus: 0, color: 0xef5947 }
}

function uniqueChoices(pool, count) {
    const copy = [...pool]
    const result = []
    while (copy.length > 0 && result.length < count) {
        const index = Math.floor(Math.random() * copy.length)
        result.push(ITEM_KINDS[copy.splice(index, 1)[0]])
    }
    return result
}

export default class TowerCrashScene extends Phaser.Scene {
    constructor(data = {}) {
        super('TowerCrash')
        this.bootData = data
        this.playerCount = 4
        this.currentPlayerIndex = 0
        this.currentChoices = []
        this.selectedChoiceIndex = 0
        this.selectedPlaceX = WORLD.tableCenterX
        this.phase = 'boot'
        this.hp = []
        this.alive = []
        this.successes = []
        this.misses = []
        this.scorePoints = []
        this.streaks = []
        this.boostAvailable = []
        this.boostArmed = false
        this.lastBoostUsed = false
        this.turnNumber = 0
        this.roundNumber = 1
        this.maxTurns = 16
        this.items = []
        this.staticBodies = []
        this.playerViews = []
        this.choiceViews = []
        this.laneViews = []
        this.ghostView = null
        this.timingNeedle = null
        this.timingStartedAt = 0
        this.lastTimingState = null
        this.targetPlaceX = WORLD.tableCenterX
        this.turnSplash = null
        this.currentDroppingItem = null
        this.messageText = null
        this.hintText = null
        this.turnText = null
        this.dropStartedAt = 0
        this.stableSince = null
        this.inputLockedUntil = 0
        this.keyHandlers = null
        this.windowKeyHandler = null
        this.difficultyConfig = DIFFICULTY_CONFIG.normal
        this.pendingMessageAction = null
        this.currentChallenge = CHALLENGES[0]
        this.currentPartyEvent = PARTY_EVENTS[0]
        this.lastRoundDropLabel = ''
    }

    preload() {
        Object.values(ITEM_KINDS).forEach((kind) => {
            this.load.image(`item-${kind.key}`, `/assets/item_${kind.key}.png`)
        })
        for (let index = 1; index <= 4; index += 1) {
            this.load.image(`robot-p${index}`, `/assets/char_robot_p${index}.png`)
        }
        this.load.image('ui-controls-hint', '/assets/ui_controls_hint.png')
        this.load.image('ui-stamp-safe', '/assets/ui_stamp_safe.png')
        this.load.image('ui-stamp-miss', '/assets/ui_stamp_miss.png')
        this.load.image('ui-turn-plate', '/assets/ui_turn_plate.png')
        this.load.image('ui-drop-icon', '/assets/ui_drop_icon.png')
        this.load.audio('se-place', '/assets/se_place.wav')
        this.load.audio('se-safe', '/assets/se_safe.wav')
        this.load.audio('se-miss', '/assets/se_miss.wav')
        this.load.audio('se-turn', '/assets/se_turn.wav')
        this.load.audio('se-select', '/assets/se_select.wav')
        this.load.audio('se-lane', '/assets/se_lane.wav')
    }

    create() {
        const difficulty = runtimeSettings.difficulty || this.bootData.difficulty || 'normal'
        this.difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal
        this.playerCount = clamp(Number(runtimeSettings.playerCount || this.bootData.playerCount || 4), 1, 4)
        this.maxTurns = getMaxTurns(difficulty, this.playerCount)
        this.hp = Array(this.playerCount).fill(PLAYER_START_HP)
        this.alive = Array(this.playerCount).fill(true)
        this.successes = Array(this.playerCount).fill(0)
        this.misses = Array(this.playerCount).fill(0)
        this.scorePoints = Array(this.playerCount).fill(0)
        this.streaks = Array(this.playerCount).fill(0)
        this.boostAvailable = Array(this.playerCount).fill(true)
        this.boostArmed = false
        this.lastBoostUsed = false
        this.turnNumber = 0
        this.roundNumber = 1
        this.phase = 'select'

        this.input.setTopOnly(true)
        this.matter.world.setGravity(0, this.difficultyConfig.gravity)

        this.drawBackground()
        this.createStageBodies()
        this.createPlayerViews()
        this.createHudTexts()
        this.registerExternalCommands()
        this.registerKeyboard()
        this.sfx = {
            place: this.sound.add('se-place', { volume: 0.55 }),
            safe: this.sound.add('se-safe', { volume: 0.6 }),
            miss: this.sound.add('se-miss', { volume: 0.65 }),
            turn: this.sound.add('se-turn', { volume: 0.5 }),
            select: this.sound.add('se-select', { volume: 0.42 }),
            lane: this.sound.add('se-lane', { volume: 0.36 }),
        }

        this.showMessage('デスクつみタワー EX', '選択・位置・タイミング・お題を全部見る')
        this.time.delayedCall(650, () => this.beginTurn(0))
    }

    registerExternalCommands() {
        this.commandHandler = (event) => {
            const type = event.detail?.type
            if (type === 'answer' && this.phase === 'select') {
                this.placeSelectedItem()
            }
            if (type === 'next' && this.phase === 'message') {
                this.resolveMessage()
            }
        }

        runtimeHudTarget?.addEventListener('game-command', this.commandHandler)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            runtimeHudTarget?.removeEventListener('game-command', this.commandHandler)
        })
    }

    registerKeyboard() {
        if (typeof window === 'undefined') return

        this.windowKeyHandler = (event) => {
            const key = event.key
            const controlKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S', 'b', 'B', ' ', 'Space', 'Spacebar', 'Enter']
            if (!controlKeys.includes(key)) return

            event.preventDefault()
            if ((key === ' ' || key === 'Space' || key === 'Spacebar' || key === 'Enter') && event.repeat) return
            this.handleKeyboardKey(key)
        }

        window.addEventListener('keydown', this.windowKeyHandler)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.windowKeyHandler) {
                window.removeEventListener('keydown', this.windowKeyHandler)
                this.windowKeyHandler = null
            }
        })
    }

    drawBackground() {
        this.cameras.main.setBackgroundColor('#86d9f5')
        const bg = this.add.graphics()
        bg.fillStyle(0x86d9f5, 1)
        bg.fillRect(0, 0, 1280, 720)

        // upper wall and light dots
        bg.fillStyle(0xdff6ff, 1)
        bg.fillRect(0, 0, 1280, 268)
        for (let index = 0; index < 10; index += 1) {
            const x = 44 + index * 120
            const y = 42 + (index % 3) * 26
            bg.fillStyle(0xffffff, 0.32)
            bg.fillCircle(x, y, 16)
            bg.fillCircle(x + 18, y + 6, 18)
            bg.fillCircle(x - 14, y + 7, 13)
        }

        // message board
        bg.fillStyle(0xfff9e8, 0.95)
        bg.fillRoundedRect(398, 20, 500, 182, 24)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(398, 20, 500, 182, 24)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(424, 32, 150, 34, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(424, 32, 150, 34, 14)

        // choice panel on the right
        bg.fillStyle(0xfffbef, 0.95)
        bg.fillRoundedRect(1012, 86, 238, 402, 24)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(1012, 86, 238, 402, 24)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(1034, 100, 170, 34, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(1034, 100, 170, 34, 14)

        // shelf background
        bg.fillStyle(0xfff2b8, 1)
        bg.fillRoundedRect(1020, 500, 216, 96, 20)
        bg.lineStyle(4, 0x9b6413, 1)
        bg.strokeRoundedRect(1020, 500, 216, 96, 20)
        bg.lineStyle(4, 0xc27a1d, 1)
        bg.beginPath()
        bg.moveTo(1034, 548)
        bg.lineTo(1220, 548)
        bg.strokePath()
        for (let i = 0; i < 4; i += 1) {
            const x = 1042 + i * 42
            bg.fillStyle([0x4b72d9, 0xff7aa5, 0x2aa7a3, 0xf6c85f][i % 4], 1)
            bg.fillRoundedRect(x, 516 + (i % 2) * 8, 28, 28, 6)
            bg.fillStyle(0xffffff, 0.9)
            bg.fillRect(x + 5, 526 + (i % 2) * 8, 18, 5)
        }
        bg.fillStyle(0xcdd5e2, 1)
        bg.fillRoundedRect(1200, 519, 24, 24, 6)
        bg.fillStyle(0xe94834, 1)
        bg.fillRect(1204, 526, 16, 6)

        // desk and lower floor
        bg.fillStyle(0xffe28a, 1)
        bg.fillRect(0, 620, 1280, 100)
        bg.fillStyle(0xd5892f, 1)
        bg.fillRect(0, 650, 1280, 80)
        bg.lineStyle(7, 0x7b4a18, 1)
        bg.beginPath()
        bg.moveTo(0, 620)
        bg.lineTo(1280, 620)
        bg.strokePath()

        // placement area
        bg.fillStyle(0xffffff, 0.15)
        bg.fillRoundedRect(PLACEMENT.minX - 42, 338, PLACEMENT.maxX - PLACEMENT.minX + 84, 218, 22)
        bg.lineStyle(3, 0xffffff, 0.22)
        bg.strokeRoundedRect(PLACEMENT.minX - 42, 338, PLACEMENT.maxX - PLACEMENT.minX + 84, 218, 22)
        bg.fillStyle(0xfff6d5, 1)
        bg.fillRoundedRect(PLACEMENT.minX - 18, 552, PLACEMENT.maxX - PLACEMENT.minX + 36, 28, 14)
        bg.lineStyle(3, 0x8b5824, 1)
        bg.strokeRoundedRect(PLACEMENT.minX - 18, 552, PLACEMENT.maxX - PLACEMENT.minX + 36, 28, 14)

        // main table
        bg.fillStyle(0xfff5c7, 1)
        bg.fillRoundedRect(WORLD.tableCenterX - WORLD.tableWidth / 2, WORLD.tableTopY, WORLD.tableWidth, WORLD.tableHeight, 16)
        bg.fillStyle(0xf6c85f, 1)
        bg.fillRoundedRect(WORLD.tableCenterX - WORLD.tableWidth / 2 + 18, WORLD.tableTopY + 8, WORLD.tableWidth - 36, 11, 8)
        bg.lineStyle(5, 0x8f5816, 1)
        bg.strokeRoundedRect(WORLD.tableCenterX - WORLD.tableWidth / 2, WORLD.tableTopY, WORLD.tableWidth, WORLD.tableHeight, 16)

        this.add.text(WORLD.tableCenterX, WORLD.tableTopY + 21, 'ここから落ちたらミス', {
            fontFamily: FONT,
            fontSize: '17px',
            color: '#7b4a18',
            fontStyle: 'bold',
            stroke: '#fff9d1',
            strokeThickness: 4,
        }).setOrigin(0.5)

        this.add.text(500, 49, 'TURN GUIDE', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#8b5d24',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

        this.add.text(1119, 117, 'えらべる雑貨', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#8b5d24',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

    }

    createStageBodies() {
        this.addStaticRectangle(WORLD.tableCenterX, WORLD.tableTopY + WORLD.tableHeight / 2, WORLD.tableWidth, WORLD.tableHeight, 0.98)
        this.addStaticRectangle(640, WORLD.groundY + 18, 1280, 36, 0.98)
    }

    addStaticRectangle(x, y, width, height, friction = 0.98) {
        const body = this.matter.add.rectangle(x, y, width, height, {
            isStatic: true,
            friction,
            restitution: 0,
        })
        this.staticBodies.push(body)
        return body
    }

    createHudTexts() {
        this.messageText = this.add.text(650, 95, '', {
            fontFamily: FONT,
            fontSize: '38px',
            color: '#1b1b1b',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: 430, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)

        this.hintText = this.add.text(650, 138, '', {
            fontFamily: FONT,
            fontSize: '22px',
            color: '#6b3a08',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: 440, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)

        this.turnText = this.add.text(650, 177, '', {
            fontFamily: FONT,
            fontSize: '22px',
            color: '#1b1b1b',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)
    }

    createPlayerViews() {
        for (let index = 0; index < this.playerCount; index += 1) {
            const x = PLAYER_FLOOR.startX + index * PLAYER_FLOOR.gap
            const y = PLAYER_FLOOR.y
            const view = this.createRobotAvatar(x, y, index)
            this.playerViews.push(view)
        }
    }

    createRobotAvatar(x, y, playerIndex) {
        const container = this.add.container(x, y).setDepth(40)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.16)
        shadow.fillEllipse(0, 30, 66, 15)

        const textureKey = `robot-p${playerIndex + 1}`
        const hasRobotTexture = this.textures.exists(textureKey)
        const body = hasRobotTexture
            ? this.add.image(0, -8, textureKey).setDisplaySize(82, 98)
            : this.createFallbackRobotGraphic(playerIndex)

        if (hasRobotTexture) {
            container.add([shadow, body])
        } else {
            const label = this.add.text(0, 50, `P${playerIndex + 1}`, {
                fontFamily: FONT,
                fontSize: '19px',
                color: '#1b1b1b',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0.5)
            container.add([shadow, body, label])
        }
        return container
    }

    updatePlayerViews() {
        this.playerViews.forEach((view, index) => {
            const isCurrent = index === this.currentPlayerIndex && this.phase !== 'finished'
            const isAlive = this.alive[index]
            const targetX = PLAYER_FLOOR.startX + index * PLAYER_FLOOR.gap
            const targetY = isCurrent ? PLAYER_FLOOR.currentY : PLAYER_FLOOR.y
            const scale = isCurrent ? 1.08 : 0.9
            const alpha = isAlive ? 1 : 0.42

            this.tweens.killTweensOf(view)
            this.tweens.add({
                targets: view,
                x: targetX,
                y: targetY,
                scaleX: scale,
                scaleY: scale,
                alpha,
                duration: 310,
                ease: 'Back.easeOut',
            })
        })
    }

    beginTurn(preferredIndex = this.currentPlayerIndex) {
        if (this.phase === 'finished') return

        if (this.shouldFinish()) {
            this.finishGame()
            return
        }

        const nextIndex = this.findNextAlivePlayer(preferredIndex)
        this.currentPlayerIndex = nextIndex
        this.phase = 'select'
        this.pendingMessageAction = null
        this.selectedChoiceIndex = 0
        this.selectedPlaceX = WORLD.tableCenterX
        this.currentDroppingItem = null
        this.stableSince = null
        this.inputLockedUntil = this.time.now + 240
        this.boostArmed = false
        this.lastBoostUsed = false
        this.timingStartedAt = this.time.now
        this.lastTimingState = null
        this.targetPlaceX = Phaser.Math.Between(PLACEMENT.minX + 40, PLACEMENT.maxX - 40)
        this.turnNumber += 1
        this.roundNumber = Math.floor((this.turnNumber - 1) / Math.max(1, this.playerCount)) + 1

        const choiceCount = CHOICE_COUNT_BY_DIFFICULTY[difficulty] ?? 4
        this.currentChoices = uniqueChoices(this.difficultyConfig.cardPool, choiceCount)
        const challengePool = CHALLENGES.filter((challenge) => (
            challenge.key !== 'risky'
            || this.currentChoices.some((kind) => challenge.matches(kind, this.selectedPlaceX))
        ))
        this.currentChallenge = pick(challengePool)
        const startsRound = (this.turnNumber - 1) % Math.max(1, this.playerCount) === 0
        if (startsRound) {
            this.currentPartyEvent = PARTY_EVENTS[(this.roundNumber - 1) % PARTY_EVENTS.length]
        }
        this.sfx?.turn?.play()
        this.showMessage(`P${nextIndex + 1} の番`, `${this.currentPartyEvent.label} / ${this.currentChallenge.label}`)
        this.turnText?.setText(`TURN ${this.turnNumber}/${this.maxTurns}`)
        this.createChoiceCards()
        this.createLaneButtons()
        this.createGhostView()
        this.updatePlayerViews()
        this.showTurnSplash(nextIndex)
        if (startsRound && this.roundNumber >= ROUND_DROP.enabledFromRound) {
            this.dropRoundObstacle()
        }
        this.dispatchHud(false)
    }

    dropRoundObstacle() {
        const count = Math.min(ROUND_DROP.maxCount, ROUND_DROP.baseCount + Math.max(0, this.roundNumber - 3))
        const labels = []
        for (let index = 0; index < count; index += 1) {
            const kind = ITEM_KINDS[pick(ROUND_DROP.pool)]
            if (!kind) continue
            const x = Phaser.Math.Between(PLACEMENT.minX + 34, PLACEMENT.maxX - 34)
            const y = 112 - index * 34
            const angle = Phaser.Math.FloatBetween(-0.5, 0.5)
            const item = this.createPlacedItem(x, y, kind, angle, {
                owner: null,
                neutral: true,
                depth: 18,
                scale: this.getRoundItemScale() * 0.95,
            })
            MATTER.Body.setAngularVelocity(item.body, Phaser.Math.FloatBetween(-0.04, 0.04))
            MATTER.Body.applyForce(item.body, item.body.position, {
                x: Phaser.Math.FloatBetween(-0.0012, 0.0012),
                y: 0.0013 + index * 0.0002,
            })
            labels.push(kind.label)
            this.showPlaceBurst(x, y + 28, 0xffd65f)
        }
        this.lastRoundDropLabel = labels.length > 1 ? `${labels.length}個` : labels[0] ?? ''
        this.showMessage('ROUND DROP!', `${this.lastRoundDropLabel} 落下`)
    }

    findNextAlivePlayer(startIndex) {
        let index = clamp(startIndex, 0, this.playerCount - 1)
        for (let offset = 0; offset < this.playerCount; offset += 1) {
            const candidate = (index + offset) % this.playerCount
            if (this.alive[candidate]) return candidate
        }
        return 0
    }

    shouldFinish() {
        if (this.playerCount === 1) {
            return this.hp[0] <= 0 || this.turnNumber >= this.maxTurns
        }
        return this.alive.filter(Boolean).length <= 1 || this.turnNumber >= this.maxTurns
    }

    createChoiceCards() {
        this.destroyChoiceCards()
        const startX = 1130
        const startY = this.currentChoices.length >= 5 ? 124 : 160
        const cardGap = this.currentChoices.length >= 5 ? 82 : 98
        const cardHeight = this.currentChoices.length >= 5 ? 66 : 74
        this.currentChoices.forEach((kind, index) => {
            const y = startY + index * cardGap
            const selected = index === this.selectedChoiceIndex
            const card = this.add.container(startX, y).setDepth(35)
            const bg = this.add.graphics()
            bg.fillStyle(selected ? 0xfff1a6 : 0xffffff, 0.97)
            bg.fillRoundedRect(-108, -cardHeight / 2, 216, cardHeight, 18)
            bg.lineStyle(5, selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xc1914f, 1)
            bg.strokeRoundedRect(-108, -cardHeight / 2, 216, cardHeight, 18)
            bg.fillStyle(0x000000, 0.08)
            bg.fillRoundedRect(-96, 26, 192, 7, 6)
            bg.fillStyle(selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xffdf89, 1)
            bg.fillRoundedRect(-95, -28, 32, 32, 12)
            bg.lineStyle(3, 0x8f5d28, 0.65)
            bg.strokeRoundedRect(-95, -28, 32, 32, 12)

            const numberText = this.add.text(-79, -12, `${index + 1}`, {
                fontFamily: FONT,
                fontSize: '20px',
                color: selected ? '#ffffff' : '#6b3a08',
                fontStyle: 'bold',
                stroke: selected ? '#8f5d28' : '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0.5)

            const sample = this.add.container(-44, 0)
            const preview = this.createItemDisplay(kind, 1.02)
            sample.add(preview)
            sample.setScale(0.56)

            const label = this.add.text(0, 0, kind.label, {
                fontFamily: FONT,
                fontSize: this.currentChoices.length >= 5 ? '21px' : '24px',
                color: '#1b1b1b',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0, 0.5)

            card.add([bg, numberText, sample, label])
            card.setSize(216, cardHeight)
            if (selected) {
                card.setScale(1.06)
                this.tweens.add({
                    targets: card,
                    scaleX: 1.09,
                    scaleY: 1.09,
                    duration: 420,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                })
            }
            this.choiceViews.push(card)
        })
    }

    destroyChoiceCards() {
        this.choiceViews.forEach((view) => view.destroy())
        this.choiceViews = []
    }

    createLaneButtons() {
        this.destroyLaneButtons()
        const width = PLACEMENT.maxX - PLACEMENT.minX
        const railY = WORLD.tableTopY + 18
        const rail = this.add.container(PLACEMENT.minX, railY).setDepth(31)
        const g = this.add.graphics()
        g.fillStyle(0xffffff, 0.58)
        g.fillRoundedRect(-18, -22, width + 36, 44, 18)
        g.lineStyle(4, 0x8b5824, 0.9)
        g.strokeRoundedRect(-18, -22, width + 36, 44, 18)
        g.fillStyle(0xf6c85f, 1)
        g.fillRoundedRect(0, -5, width, 10, 6)

        const targetX = this.targetPlaceX - PLACEMENT.minX
        g.fillStyle(0xffd65f, 0.9)
        g.fillRoundedRect(targetX - 24, -18, 48, 36, 14)
        g.lineStyle(4, 0xffffff, 0.95)
        g.strokeRoundedRect(targetX - 24, -18, 48, 36, 14)
        g.fillStyle(0xef5947, 1)
        g.fillCircle(targetX, 0, 6)

        const cursorX = this.selectedPlaceX - PLACEMENT.minX
        const cursor = this.add.graphics()
        cursor.fillStyle(PLAYER_COLORS[this.currentPlayerIndex], 1)
        cursor.fillRoundedRect(cursorX - 38, -24, 76, 48, 16)
        cursor.lineStyle(4, 0xffffff, 0.95)
        cursor.strokeRoundedRect(cursorX - 38, -24, 76, 48, 16)

        const label = this.add.text(cursorX, 0, getPlacementLabel(this.selectedPlaceX), {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#7b4a18',
            strokeThickness: 4,
        }).setOrigin(0.5)

        const hint = this.add.text(width / 2, -48, `${this.currentPartyEvent?.label || 'EVENT'} / ←→位置 / SPACEタイミング`, {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#6b3a08',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

        const timing = this.add.container(width / 2, -132)
        const timingBg = this.add.graphics()
        timingBg.fillStyle(0xffffff, 0.82)
        timingBg.fillRoundedRect(-TIMING.barWidth / 2 - 12, -18, TIMING.barWidth + 24, 36, 16)
        timingBg.lineStyle(3, 0x8f5d28, 0.9)
        timingBg.strokeRoundedRect(-TIMING.barWidth / 2 - 12, -18, TIMING.barWidth + 24, 36, 16)
        timingBg.fillStyle(0xef5947, 0.35)
        timingBg.fillRoundedRect(-TIMING.barWidth / 2, -6, TIMING.barWidth, 12, 6)
        timingBg.fillStyle(0x4ec778, 0.72)
        timingBg.fillRoundedRect(-TIMING.barWidth * TIMING.goodRange, -8, TIMING.barWidth * TIMING.goodRange * 2, 16, 8)
        timingBg.fillStyle(0xffd65f, 1)
        timingBg.fillRoundedRect(-TIMING.barWidth * TIMING.perfectRange, -11, TIMING.barWidth * TIMING.perfectRange * 2, 22, 9)

        const timingText = this.add.text(0, -31, 'TIMING', {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#6b3a08',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

        const needle = this.add.graphics()
        timing.add([timingBg, timingText, needle])
        this.timingNeedle = needle

        rail.add([g, cursor, label, hint, timing])
        this.laneViews.push(rail)
        this.syncTimingGauge()
    }

    destroyLaneButtons() {
        this.laneViews.forEach((view) => view.destroy())
        this.laneViews = []
        this.timingNeedle = null
    }

    createGhostView() {
        this.ghostView?.destroy()
        if (this.phase !== 'select') return
        const kind = this.currentChoices[this.selectedChoiceIndex]
        if (!kind) return
        const x = this.selectedPlaceX
        const y = this.getSpawnY() + 38
        this.ghostView = this.add.container(x, y).setDepth(32).setAlpha(0.64)
        const preview = this.createItemDisplay(kind, 1.04)
        this.ghostView.add(preview)
        this.ghostView.setScale(0.82)
        this.tweens.add({
            targets: this.ghostView,
            y: y - 10,
            yoyo: true,
            repeat: -1,
            duration: 520,
            ease: 'Sine.easeInOut',
        })
    }

    getSpawnY() {
        let minY = WORLD.tableTopY
        this.items.forEach((item) => {
            if (item.body && item.view?.active) {
                minY = Math.min(minY, item.body.bounds.min.y)
            }
        })
        return clamp(minY - 86, 124, WORLD.tableTopY - 95)
    }

    placeSelectedItem() {
        if (this.phase !== 'select') return
        if (this.time.now < this.inputLockedUntil) return
        const kind = this.currentChoices[this.selectedChoiceIndex]
        if (!kind) return

        this.phase = 'settling'
        this.lastTimingState = this.getTimingState()
        this.lastBoostUsed = this.boostArmed && this.boostAvailable[this.currentPlayerIndex]
        if (this.lastBoostUsed) {
            this.boostAvailable[this.currentPlayerIndex] = false
        }
        this.boostArmed = false
        this.destroyChoiceCards()
        this.destroyLaneButtons()
        this.ghostView?.destroy()
        this.ghostView = null
        this.stableSince = null
        this.dropStartedAt = this.time.now

        const x = this.selectedPlaceX
        const y = this.getSpawnY()
        const timingPenalty = this.lastTimingState?.key === 'late' ? TIMING.badAnglePenalty : 0
        const timingStability = this.lastTimingState?.key === 'perfect'
            ? 0.34
            : this.lastTimingState?.key === 'good'
                ? 0.62
                : 1
        const angleJitterRange = (this.difficultyConfig.angleJitter + (this.currentPartyEvent?.angleJitterBonus ?? 0) + timingPenalty) * timingStability
        const angleJitter = Phaser.Math.FloatBetween(
            -angleJitterRange,
            angleJitterRange
        )
        this.showPlaceBurst(x, y + 24, PLAYER_COLORS[this.currentPlayerIndex])
        const item = this.createPlacedItem(x, y, kind, angleJitter, {
            scale: this.getRoundItemScale(),
        })
        if (this.lastTimingState?.key === 'late') {
            const spinDirection = x < WORLD.tableCenterX ? -1 : 1
            MATTER.Body.setAngularVelocity(item.body, TIMING.badSpin * spinDirection)
            MATTER.Body.applyForce(item.body, item.body.position, {
                x: 0.0009 * spinDirection,
                y: 0,
            })
        } else if (this.lastTimingState?.key === 'perfect') {
            MATTER.Body.setAngularVelocity(item.body, item.body.angularVelocity * 0.25)
            MATTER.Body.applyForce(item.body, item.body.position, {
                x: (WORLD.tableCenterX - x) * 0.0000014,
                y: 0.00018,
            })
            this.showSparkBurst(x, y + 22, 0xffd65f)
        } else if (this.lastTimingState?.key === 'good') {
            MATTER.Body.setAngularVelocity(item.body, item.body.angularVelocity * 0.55)
        }
        this.currentDroppingItem = item
        this.sfx?.place?.play()
        this.showMessage(`${this.lastTimingState?.label ?? 'DROP'}!`, `${kind.label} を置いた`)
        this.dispatchHud(false)

        const robot = this.playerViews[this.currentPlayerIndex]
        if (robot) {
            this.tweens.add({ targets: robot, y: robot.y + 12, yoyo: true, duration: 160, ease: 'Sine.easeOut' })
        }
    }

    getRoundItemScale() {
        return Math.min(ROUND_SCALE.max, 1 + Math.max(0, this.roundNumber - 1) * ROUND_SCALE.step)
    }

    createPlacedItem(x, y, kind, angle = 0, meta = {}) {
        const itemScale = meta.scale ?? 1
        const options = {
            friction: kind.friction ?? 0.8,
            frictionStatic: kind.frictionStatic ?? 0.6,
            restitution: kind.restitution ?? 0.02,
            density: kind.density ?? 0.0035,
            frictionAir: this.difficultyConfig.frictionAir,
        }
        const scaledKind = {
            ...kind,
            width: kind.width ? kind.width * itemScale : kind.width,
            height: kind.height ? kind.height * itemScale : kind.height,
            radius: kind.radius ? kind.radius * itemScale : kind.radius,
        }
        const body = this.createItemBody(x, y, scaledKind, options)
        this.matter.world.add(body)
        MATTER.Body.setAngle(body, angle)

        const view = this.add.container(x, y).setDepth(meta.depth ?? 20)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, (scaledKind.height ?? scaledKind.radius * 2) / 2 + 7, (scaledKind.width ?? scaledKind.radius * 2) * 0.75, 8)
        const itemImage = this.createItemDisplay(kind, 1.08)
        view.add([shadow, itemImage])
        view.setScale(itemScale)

        const item = {
            body,
            view,
            kind,
            owner: meta.owner ?? this.currentPlayerIndex,
            neutral: Boolean(meta.neutral),
            safe: false,
        }
        this.items.push(item)
        return item
    }

    createItemBody(x, y, kind, options) {
        if (['can', 'tape', 'watch'].includes(kind.shape)) {
            return MATTER.Bodies.circle(x, y, kind.radius ?? (kind.width / 2), options)
        }

        if (kind.shape === 'key') {
            const ring = MATTER.Bodies.circle(x - 24, y, 12, options)
            const shaft = MATTER.Bodies.rectangle(x + 12, y, 54, 10, options)
            const tooth = MATTER.Bodies.rectangle(x + 28, y + 8, 16, 10, options)
            return MATTER.Body.create({ parts: [ring, shaft, tooth], ...options })
        }

        if (kind.shape === 'scissors') {
            const bladeA = MATTER.Bodies.rectangle(x + 12, y, 82, 8, options)
            const bladeB = MATTER.Bodies.rectangle(x + 12, y, 82, 8, options)
            MATTER.Body.setAngle(bladeA, 0.34)
            MATTER.Body.setAngle(bladeB, -0.34)
            const handleA = MATTER.Bodies.circle(x - 34, y - 10, 11, options)
            const handleB = MATTER.Bodies.circle(x - 34, y + 10, 11, options)
            return MATTER.Body.create({ parts: [bladeA, bladeB, handleA, handleB], ...options })
        }

        if (kind.shape === 'headphones') {
            const left = MATTER.Bodies.rectangle(x - 28, y + 8, 18, 28, options)
            const right = MATTER.Bodies.rectangle(x + 28, y + 8, 18, 28, options)
            const bridge = MATTER.Bodies.rectangle(x, y - 12, 62, 8, {
                ...options,
                chamfer: { radius: 6 },
            })
            return MATTER.Body.create({ parts: [left, right, bridge], ...options })
        }

        if (kind.shape === 'clip') {
            const outer = MATTER.Bodies.rectangle(x, y, kind.width, 8, options)
            const inner = MATTER.Bodies.rectangle(x, y + 8, kind.width - 22, 7, options)
            return MATTER.Body.create({ parts: [outer, inner], ...options })
        }

        if (kind.shape === 'earphoneJack') {
            const cable = MATTER.Bodies.rectangle(x - 18, y, 68, 7, options)
            const plug = MATTER.Bodies.rectangle(x + 25, y, 26, 14, options)
            const tip = MATTER.Bodies.circle(x + 43, y, 7, {
                ...options,
                density: (options.density ?? 0.0035) * 1.5,
            })
            return MATTER.Body.create({ parts: [cable, plug, tip], ...options })
        }

        return MATTER.Bodies.rectangle(x, y, kind.width, kind.height, {
            ...options,
            chamfer: { radius: ['box', 'mug', 'battery', 'dice'].includes(kind.shape) ? 8 : 5 },
        })
    }

    createItemDisplay(kind, scale = 1) {
        const textureKey = `item-${kind.key}`
        const baseW = kind.width ?? kind.radius * 2
        const baseH = kind.height ?? kind.radius * 2

        if (this.textures.exists(textureKey)) {
            return this.add.image(0, 0, textureKey).setDisplaySize(baseW * scale, baseH * scale)
        }

        const graphics = this.add.graphics()
        this.drawItemShape(graphics, kind)
        graphics.setScale(scale)
        return graphics
    }

    createFallbackRobotGraphic(playerIndex) {
        const color = PLAYER_COLORS[playerIndex]
        const dark = PLAYER_DARK_COLORS[playerIndex]
        const body = this.add.graphics()
        body.fillStyle(color, 1)
        body.fillRoundedRect(-25, -18, 50, 42, 12)
        body.lineStyle(4, 0x252525, 1)
        body.strokeRoundedRect(-25, -18, 50, 42, 12)
        body.fillStyle(0xffffff, 1)
        body.fillRoundedRect(-17, -9, 34, 17, 7)
        body.fillStyle(0x252525, 1)
        body.fillCircle(-7, -1, 3)
        body.fillCircle(7, -1, 3)
        body.lineStyle(3, dark, 1)
        body.beginPath()
        body.moveTo(-13, 24)
        body.lineTo(-18, 33)
        body.moveTo(13, 24)
        body.lineTo(18, 33)
        body.moveTo(-25, -2)
        body.lineTo(-35, 8)
        body.moveTo(25, -2)
        body.lineTo(35, 8)
        body.strokePath()
        body.lineStyle(3, 0x252525, 1)
        body.beginPath()
        body.moveTo(0, -18)
        body.lineTo(0, -32)
        body.strokePath()
        body.fillStyle(0xffe65b, 1)
        body.fillCircle(0, -36, 6)
        return body
    }

    drawItemShape(graphics, kind) {
        const w = kind.width ?? kind.radius * 2
        const h = kind.height ?? kind.radius * 2
        const halfW = w / 2
        const halfH = h / 2

        if (kind.shape === 'can') {
            graphics.fillStyle(kind.color, 1)
            graphics.fillEllipse(0, 0, w, h)
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 6, -8, w - 12, 16, 7)
            graphics.lineStyle(4, 0x262626, 1)
            graphics.strokeEllipse(0, 0, w, h)
            graphics.lineStyle(2, 0xffffff, 0.75)
            graphics.strokeEllipse(0, -16, w - 14, 10)
            return
        }

        if (kind.shape === 'tape') {
            graphics.fillStyle(kind.color, 1)
            graphics.fillCircle(0, 0, kind.radius)
            graphics.fillStyle(kind.accent, 1)
            graphics.fillCircle(0, 0, kind.radius * 0.47)
            graphics.lineStyle(4, 0x262626, 1)
            graphics.strokeCircle(0, 0, kind.radius)
            graphics.lineStyle(3, 0xd1b246, 1)
            graphics.strokeCircle(0, 0, kind.radius * 0.47)
            return
        }

        const radius = kind.shape === 'book' ? 4 : ['ruler', 'marker', 'clip', 'card'].includes(kind.shape) ? 3 : 8
        graphics.fillStyle(kind.color, 1)
        graphics.fillRoundedRect(-halfW, -halfH, w, h, radius)
        graphics.lineStyle(4, 0x262626, 1)
        graphics.strokeRoundedRect(-halfW, -halfH, w, h, radius)

        if (kind.shape === 'book') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 9, -halfH + 4, 20, h - 8, 3)
            graphics.lineStyle(2, 0x22355e, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 37, -halfH + 5)
            graphics.lineTo(-halfW + 37, halfH - 5)
            graphics.strokePath()
        } else if (kind.shape === 'notebook') {
            graphics.fillStyle(kind.accent, 1)
            for (let x = -halfW + 12; x < halfW; x += 20) {
                graphics.fillCircle(x, -halfH + 5, 3)
            }
            graphics.lineStyle(2, 0x89aee8, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 8, 1)
            graphics.lineTo(halfW - 8, 1)
            graphics.strokePath()
        } else if (kind.shape === 'eraser') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 7, -halfH + 7, w - 14, h - 14, 5)
            graphics.fillStyle(0xffffff, 1)
            graphics.fillRoundedRect(-14, -halfH + 7, 28, h - 14, 4)
        } else if (kind.shape === 'case') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 12, -4, w - 24, 8, 4)
            graphics.fillStyle(0x262626, 1)
            graphics.fillCircle(halfW - 18, 0, 4)
        } else if (kind.shape === 'box') {
            graphics.fillStyle(kind.accent, 0.45)
            graphics.fillRect(-halfW, -3, w, 6)
            graphics.fillRect(-4, -halfH, 8, h)
        } else if (kind.shape === 'ruler') {
            graphics.lineStyle(2, kind.accent, 1)
            for (let x = -halfW + 12; x < halfW - 4; x += 12) {
                graphics.beginPath()
                graphics.moveTo(x, -halfH + 2)
                graphics.lineTo(x, x % 24 === 0 ? halfH - 2 : 1)
                graphics.strokePath()
            }
        } else if (kind.shape === 'mug') {
            graphics.fillStyle(kind.accent, 0.42)
            graphics.fillRoundedRect(-halfW + 8, -halfH + 10, w - 16, h - 20, 8)
            graphics.lineStyle(4, 0x262626, 1)
            graphics.strokeCircle(halfW + 6, -2, 13)
        } else if (kind.shape === 'battery') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 6, -halfH + 8, w - 12, 16, 4)
            graphics.fillStyle(0xcdd5e2, 1)
            graphics.fillRoundedRect(-10, -halfH - 6, 20, 8, 3)
            graphics.fillStyle(0xffffff, 1)
            graphics.fillRect(-7, halfH - 15, 14, 3)
        } else if (kind.shape === 'marker') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 8, -halfH + 4, 20, h - 8, 4)
            graphics.fillStyle(0x252525, 1)
            graphics.fillRect(halfW - 12, -halfH + 4, 5, h - 8)
        } else if (kind.shape === 'glue') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 6, -halfH + 10, w - 12, 20, 6)
            graphics.fillStyle(0xf4f1de, 1)
            graphics.fillRoundedRect(-halfW + 8, halfH - 22, w - 16, 14, 5)
        } else if (kind.shape === 'stapler') {
            graphics.fillStyle(kind.accent, 0.9)
            graphics.fillRoundedRect(-halfW + 8, -halfH + 8, w - 16, 10, 5)
            graphics.lineStyle(3, 0x252525, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 8, halfH - 8)
            graphics.lineTo(halfW - 10, -halfH + 8)
            graphics.strokePath()
        } else if (kind.shape === 'scissors') {
            graphics.clear()
            graphics.lineStyle(8, kind.color, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 26, -halfH + 8)
            graphics.lineTo(halfW - 8, halfH - 8)
            graphics.moveTo(-halfW + 26, halfH - 8)
            graphics.lineTo(halfW - 8, -halfH + 8)
            graphics.strokePath()
            graphics.fillStyle(kind.accent, 1)
            graphics.fillCircle(-halfW + 14, -9, 12)
            graphics.fillCircle(-halfW + 14, 9, 12)
            graphics.fillStyle(0xffffff, 1)
            graphics.fillCircle(-halfW + 14, -9, 6)
            graphics.fillCircle(-halfW + 14, 9, 6)
        } else if (kind.shape === 'phone') {
            graphics.fillStyle(kind.accent, 0.35)
            graphics.fillRoundedRect(-halfW + 7, -halfH + 6, w - 14, h - 12, 6)
            graphics.fillStyle(0xffffff, 0.85)
            graphics.fillCircle(0, halfH - 7, 3)
        } else if (kind.shape === 'dice') {
            graphics.fillStyle(kind.accent, 1)
            const dots = [[-12, -12], [0, 0], [12, 12], [12, -12], [-12, 12]]
            dots.forEach(([x, y]) => {
                graphics.fillCircle(x, y, 3)
            })
        } else if (kind.shape === 'clip') {
            graphics.clear()
            graphics.lineStyle(8, kind.color, 1)
            graphics.strokeRoundedRect(-halfW + 8, -halfH + 4, w - 16, h - 8, 10)
            graphics.lineStyle(4, kind.accent, 1)
            graphics.strokeRoundedRect(-halfW + 18, -halfH + 8, w - 36, h - 16, 7)
        } else if (kind.shape === 'key') {
            graphics.clear()
            graphics.lineStyle(8, kind.color, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 23, 0)
            graphics.lineTo(halfW - 9, 0)
            graphics.moveTo(halfW - 20, 0)
            graphics.lineTo(halfW - 20, 9)
            graphics.moveTo(halfW - 8, 0)
            graphics.lineTo(halfW - 8, 12)
            graphics.strokePath()
            graphics.lineStyle(6, kind.accent, 1)
            graphics.strokeCircle(-halfW + 14, 0, 12)
            graphics.fillStyle(0xffffff, 1)
            graphics.fillCircle(-halfW + 14, 0, 5)
        } else if (kind.shape === 'watch') {
            graphics.clear()
            graphics.fillStyle(kind.color, 1)
            graphics.fillRoundedRect(-12, -halfH, 24, h, 8)
            graphics.fillCircle(0, 0, 22)
            graphics.lineStyle(4, 0x262626, 1)
            graphics.strokeCircle(0, 0, 22)
            graphics.fillStyle(kind.accent, 1)
            graphics.fillCircle(0, 0, 14)
            graphics.lineStyle(3, kind.color, 1)
            graphics.beginPath()
            graphics.moveTo(0, 0)
            graphics.lineTo(0, -9)
            graphics.moveTo(0, 0)
            graphics.lineTo(8, 4)
            graphics.strokePath()
        } else if (kind.shape === 'card') {
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(-halfW + 8, -halfH + 4, 20, h - 8, 4)
            graphics.fillStyle(0x4bb7ff, 1)
            graphics.fillRoundedRect(halfW - 28, -halfH + 4, 20, h - 8, 4)
        } else if (kind.shape === 'headphones') {
            graphics.clear()
            graphics.lineStyle(8, kind.color, 1)
            graphics.beginPath()
            graphics.arc(0, 5, 30, Math.PI, Math.PI * 2)
            graphics.strokePath()
            graphics.fillStyle(kind.color, 1)
            graphics.fillRoundedRect(-halfW + 8, 0, 20, 28, 8)
            graphics.fillRoundedRect(halfW - 28, 0, 20, 28, 8)
            graphics.fillStyle(kind.accent, 1)
            graphics.fillCircle(-halfW + 18, 10, 5)
            graphics.fillCircle(halfW - 18, 10, 5)
        } else if (kind.shape === 'earphoneJack') {
            graphics.clear()
            graphics.lineStyle(7, kind.color, 1)
            graphics.beginPath()
            graphics.moveTo(-halfW + 8, 0)
            graphics.lineTo(halfW - 22, 0)
            graphics.strokePath()
            graphics.fillStyle(kind.accent, 1)
            graphics.fillRoundedRect(halfW - 30, -8, 22, 16, 5)
            graphics.fillStyle(0x2f3a4a, 1)
            graphics.fillRoundedRect(halfW - 10, -5, 18, 10, 4)
            graphics.fillStyle(0xe8edf4, 1)
            graphics.fillCircle(halfW + 10, 0, 6)
        }

    }

    update() {
        this.syncItemViews()
        this.cleanupNeutralObstacles()
        this.syncTimingGauge()
        this.handleKeyboardInput()

        if (this.phase === 'settling') {
            this.applyPartyEventForces()
            this.checkCollapseOrSettle()
        }
    }

    syncItemViews() {
        for (const item of this.items) {
            if (!item.body || !item.view?.active) continue
            item.view.setPosition(item.body.position.x, item.body.position.y)
            item.view.setRotation(item.body.angle)
        }
    }

    cleanupNeutralObstacles() {
        const keep = []
        for (const item of this.items) {
            if (item.neutral && item.body && (
                item.body.position.y > WORLD.groundY + 120
                || item.body.position.x < -120
                || item.body.position.x > WORLD.width + 120
            )) {
                this.matter.world.remove(item.body)
                item.view?.destroy()
            } else {
                keep.push(item)
            }
        }
        this.items = keep
    }

    getTimingState() {
        const elapsed = Math.max(0, this.time.now - this.timingStartedAt)
        const phase = (elapsed % TIMING.cycleMs) / TIMING.cycleMs
        const ratio = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2
        const distance = Math.abs(ratio - 0.5)
        const grade = getTimingGrade(distance)
        return {
            ...grade,
            ratio,
            distance,
        }
    }

    syncTimingGauge() {
        if (!this.timingNeedle || this.phase !== 'select') return
        const timing = this.getTimingState()
        const x = (timing.ratio - 0.5) * TIMING.barWidth
        this.timingNeedle.clear()
        this.timingNeedle.fillStyle(timing.color, 1)
        this.timingNeedle.fillRoundedRect(x - 7, -22, 14, 44, 7)
        this.timingNeedle.lineStyle(3, 0xffffff, 0.96)
        this.timingNeedle.strokeRoundedRect(x - 7, -22, 14, 44, 7)
    }

    handleKeyboardInput() {
        const keys = this.keyHandlers
        if (!keys) return

        if (this.phase === 'message') {
            if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) {
                this.resolveMessage()
            }
            return
        }

        if (this.phase !== 'select') return

        if (Phaser.Input.Keyboard.JustDown(keys.LEFT) || Phaser.Input.Keyboard.JustDown(keys.A)) {
            this.selectedPlaceX = clamp(this.selectedPlaceX - PLACEMENT.keyStep, PLACEMENT.minX, PLACEMENT.maxX)
            this.sfx?.lane?.play()
            this.createLaneButtons()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.RIGHT) || Phaser.Input.Keyboard.JustDown(keys.D)) {
            this.selectedPlaceX = clamp(this.selectedPlaceX + PLACEMENT.keyStep, PLACEMENT.minX, PLACEMENT.maxX)
            this.sfx?.lane?.play()
            this.createLaneButtons()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.W)) {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex - 1, 0, this.currentChoices.length - 1)
            this.sfx?.select?.play()
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.DOWN) || Phaser.Input.Keyboard.JustDown(keys.S)) {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex + 1, 0, this.currentChoices.length - 1)
            this.sfx?.select?.play()
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) {
            this.placeSelectedItem()
        }
    }

    handleKeyboardKey(key) {
        const isConfirmKey = key === ' ' || key === 'Space' || key === 'Spacebar' || key === 'Enter'
        if (this.phase === 'message') {
            if (isConfirmKey) {
                this.resolveMessage()
            }
            return
        }

        if (this.phase !== 'select') return

        if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
            this.selectedPlaceX = clamp(this.selectedPlaceX - PLACEMENT.keyStep, PLACEMENT.minX, PLACEMENT.maxX)
            this.sfx?.lane?.play()
            this.createLaneButtons()
            this.createGhostView()
            this.dispatchHud(false)
            return
        }

        if (key === 'ArrowRight' || key === 'd' || key === 'D') {
            this.selectedPlaceX = clamp(this.selectedPlaceX + PLACEMENT.keyStep, PLACEMENT.minX, PLACEMENT.maxX)
            this.sfx?.lane?.play()
            this.createLaneButtons()
            this.createGhostView()
            this.dispatchHud(false)
            return
        }

        if (key === 'ArrowUp' || key === 'w' || key === 'W') {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex - 1, 0, this.currentChoices.length - 1)
            this.sfx?.select?.play()
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
            return
        }

        if (key === 'ArrowDown' || key === 's' || key === 'S') {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex + 1, 0, this.currentChoices.length - 1)
            this.sfx?.select?.play()
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
            return
        }

        if (key === 'b' || key === 'B') {
            if (this.boostAvailable[this.currentPlayerIndex]) {
                this.boostArmed = !this.boostArmed
                this.sfx?.select?.play()
                this.dispatchHud(false)
            }
            return
        }

        if (isConfirmKey) {
            this.placeSelectedItem()
        }
    }

    applyPartyEventForces() {
        const event = this.currentPartyEvent
        if (!event?.windForce) return
        const direction = event.windDirection ?? 1
        this.items.forEach((item) => {
            if (!item.body || item.body.isStatic) return
            const yFactor = item.body.position.y < WORLD.tableTopY + 30 ? 1 : 0.35
            MATTER.Body.applyForce(item.body, item.body.position, {
                x: event.windForce * direction * yFactor,
                y: 0,
            })
        })
    }

    getStackHeight() {
        const active = this.items.filter((item) => item.body && !item.neutral)
        if (active.length === 0) return 0
        const top = Math.min(...active.map((item) => item.body.bounds.min.y))
        return Math.max(0, WORLD.tableTopY - top)
    }

    checkCollapseOrSettle() {
        if (this.time.now - this.dropStartedAt < 520) return

        const fallen = this.items.find((item) => item.body && !item.neutral && this.isFallen(item.body))
        if (fallen) {
            this.handleMiss(fallen)
            return
        }

        const minWait = this.difficultyConfig.minWaitMs
        if (this.time.now - this.dropStartedAt < minWait) return

        if (this.isTowerStable()) {
            if (this.stableSince === null) this.stableSince = this.time.now
            if (this.time.now - this.stableSince >= this.difficultyConfig.settleMs) {
                this.handleSafe()
            }
        } else {
            this.stableSince = null
            if (this.time.now - this.dropStartedAt > this.difficultyConfig.timeoutMs) {
                this.handleSafe()
            }
        }
    }

    isFallen(body) {
        if (body.position.y > WORLD.faultLineY) return true
        if (body.position.x < WORLD.tableCenterX - WORLD.tableWidth / 2 - 50 && body.position.y > WORLD.tableTopY - 40) return true
        if (body.position.x > WORLD.tableCenterX + WORLD.tableWidth / 2 + 50 && body.position.y > WORLD.tableTopY - 40) return true
        return false
    }

    isTowerStable() {
        return this.items.every((item) => {
            if (!item.body) return true
            return item.body.speed < this.difficultyConfig.stableSpeed
                && Math.abs(item.body.angularVelocity) < this.difficultyConfig.stableAngularVelocity
        })
    }

    handleSafe() {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        const placedItem = this.currentDroppingItem
        const kind = placedItem?.kind
        const pointBreakdown = this.calculateTurnPoints(player, kind, this.selectedPlaceX, true, this.lastTimingState, this.lastBoostUsed)
        const turnPoints = pointBreakdown.total
        this.successes[player] += 1
        this.streaks[player] += 1
        this.scorePoints[player] += turnPoints
        this.currentDroppingItem = null
        this.lastTimingState = null
        this.lastBoostUsed = false
        this.sfx?.safe?.play()
        this.showStamp(WORLD.tableCenterX, 250, 'safe')
        this.showSparkBurst(WORLD.tableCenterX, 295, 0x2da65d)
        this.showFloatingText(WORLD.tableCenterX, 330, `+${turnPoints}`, pointBreakdown.bonusTotal > 0 ? 0xf0a51f : 0x2da65d)
        this.showMessage('セーフ！', pointBreakdown.message)
        this.pendingMessageAction = () => this.advanceTurn()
        this.dispatchHud(true)
    }

    handleMiss(fallenItem) {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.hp[player] = Math.max(0, this.hp[player] - 1)
        this.misses[player] += 1
        this.streaks[player] = 0
        if (this.hp[player] <= 0) {
            this.alive[player] = false
        }

        this.cameras.main.shake(320, 0.008)
        this.sfx?.miss?.play()
        this.showStamp(fallenItem.body.position.x, Math.min(fallenItem.body.position.y, 610), 'miss')
        this.showSparkBurst(fallenItem.body.position.x, Math.min(fallenItem.body.position.y, 610), 0xe94834)
        const hpText = this.hp[player] > 0 ? `P${player + 1} HP -1` : `P${player + 1} OUT`
        this.showMessage('くずれた！', hpText)
        this.pendingMessageAction = () => {
            this.clearStack()
            if (this.shouldFinish()) {
                this.finishGame()
            } else {
                this.advanceTurn()
            }
        }
        this.dispatchHud(true)
        this.updatePlayerViews()
    }

    calculateTurnPoints(player, kind, x, forSafe = false, timingState = null, boostUsed = this.boostArmed) {
        const itemPoints = kind?.points ?? 10
        const challengeBonus = this.currentChallenge?.matches(kind, x)
            ? this.currentChallenge.bonus
            : 0
        const event = this.currentPartyEvent ?? PARTY_EVENTS[0]
        const targetBonus = Math.abs(x - this.targetPlaceX) <= TARGET_ZONE.radius ? TARGET_ZONE.bonus : 0
        const edgeBonus = event.edgeBonus && isEdgePlacement(x) ? event.edgeBonus : 0
        const riskyBonus = event.riskyBonus && isRiskyKind(kind) ? event.riskyBonus : 0
        const comebackBonus = event.comebackBonus && this.isLowestScoringPlayer(player) ? event.comebackBonus : 0
        const nextStreak = (this.streaks[player] ?? 0) + (forSafe ? 1 : 0)
        const streakBonus = Math.min(80, Math.max(0, nextStreak - 1) * 20)
        const feverBonus = nextStreak >= FEVER.triggerStreak ? FEVER.bonus : 0
        const timingBonus = timingState?.bonus ?? 0
        const subtotal = itemPoints + challengeBonus + targetBonus + edgeBonus + riskyBonus + comebackBonus + streakBonus + feverBonus + timingBonus
        const boostMultiplier = boostUsed ? BOOST.multiplier : 1
        const multiplier = (event.scoreMultiplier ?? 1) * boostMultiplier
        const total = Math.round(subtotal * multiplier)
        const bonusTotal = challengeBonus + targetBonus + edgeBonus + riskyBonus + comebackBonus + streakBonus + feverBonus + timingBonus
        const messageParts = []
        if (timingBonus > 0) messageParts.push(`${timingState.label} +${timingBonus}`)
        if (challengeBonus > 0) messageParts.push(`お題 +${challengeBonus}`)
        if (targetBonus > 0) messageParts.push(`TARGET +${targetBonus}`)
        if (edgeBonus > 0) messageParts.push(`端 +${edgeBonus}`)
        if (riskyBonus > 0) messageParts.push(`難物 +${riskyBonus}`)
        if (comebackBonus > 0) messageParts.push(`逆転 +${comebackBonus}`)
        if (eventSurvivalBonus > 0) messageParts.push(`EVENT +${eventSurvivalBonus}`)
        if (heightBonus > 0) messageParts.push(`高さ +${heightBonus}`)
        if (streakBonus > 0) messageParts.push(`連続 +${streakBonus}`)
        if (feverBonus > 0) messageParts.push(`FEVER +${feverBonus}`)
        if (boostUsed) messageParts.push(`BOOST x${BOOST.multiplier}`)
        if ((event.scoreMultiplier ?? 1) > 1) messageParts.push(`EVENT x${event.scoreMultiplier}`)

        return {
            itemPoints,
            challengeBonus,
            targetBonus,
            edgeBonus,
            riskyBonus,
            comebackBonus,
            eventSurvivalBonus,
            heightBonus,
            stackHeight,
            streakBonus,
            feverBonus,
            timingBonus,
            boostMultiplier,
            multiplier,
            bonusTotal,
            total,
            message: messageParts.length > 0 ? messageParts.join(' / ') : `雑貨点 +${itemPoints}`,
        }
    }

    isLowestScoringPlayer(player) {
        const aliveScores = this.scorePoints
            .map((score, index) => ({ score, index }))
            .filter(({ index }) => this.alive[index])
        if (aliveScores.length <= 1) return false
        const lowestScore = Math.min(...aliveScores.map(({ score }) => score))
        return this.scorePoints[player] === lowestScore
    }

    resolveMessage() {
        if (this.phase !== 'message') return
        const action = this.pendingMessageAction
        this.pendingMessageAction = null
        if (action) {
            action()
        } else {
            this.advanceTurn()
        }
    }

    advanceTurn() {
        if (this.phase === 'finished') return
        if (this.shouldFinish()) {
            this.finishGame()
            return
        }
        const nextStart = (this.currentPlayerIndex + 1) % this.playerCount
        this.beginTurn(nextStart)
    }

    clearStack() {
        this.items.forEach((item) => {
            if (item.body) this.matter.world.remove(item.body)
            item.view?.destroy()
        })
        this.items = []
        this.currentDroppingItem = null
        this.stableSince = null
    }


    showTurnSplash(playerIndex) {
        this.turnSplash?.destroy()
        const container = this.add.container(646, 330).setDepth(95).setAlpha(0).setScale(0.72)
        const plate = this.add.image(0, 0, 'ui-turn-plate').setDisplaySize(520, 168)
        const robot = this.add.image(-168, 8, `robot-p${playerIndex + 1}`).setDisplaySize(118, 142)
        const title = this.add.text(16, -26, `P${playerIndex + 1} TURN`, {
            fontFamily: FONT,
            fontSize: '58px',
            color: '#1b1b1b',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 8,
        }).setOrigin(0.5)
        const sub = this.add.text(18, 42, 'えらんで おく', {
            fontFamily: FONT,
            fontSize: '24px',
            color: '#6b3a08',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 5,
        }).setOrigin(0.5)
        container.add([plate, robot, title, sub])
        this.turnSplash = container
        this.tweens.add({
            targets: container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 230,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: container,
                    alpha: 0,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    delay: 520,
                    duration: 260,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        container.destroy()
                        if (this.turnSplash === container) this.turnSplash = null
                    },
                })
            },
        })
    }

    showPlaceBurst(x, y, color) {
        const ring = this.add.graphics().setDepth(45)
        ring.lineStyle(5, color, 0.9)
        ring.strokeCircle(x, y, 12)
        this.tweens.addCounter({
            from: 12,
            to: 62,
            duration: 380,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const value = tween.getValue()
                ring.clear()
                ring.lineStyle(5, color, Math.max(0, 1 - value / 62))
                ring.strokeCircle(x, y, value)
            },
            onComplete: () => ring.destroy(),
        })
    }

    showSparkBurst(x, y, color) {
        for (let index = 0; index < 14; index += 1) {
            const angle = (Math.PI * 2 * index) / 14
            const distance = 38 + (index % 4) * 12
            const dot = this.add.graphics().setDepth(64)
            dot.fillStyle(color, 0.95)
            dot.fillCircle(0, 0, 6)
            dot.setPosition(x, y)
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scaleX: 0.35,
                scaleY: 0.35,
                duration: 620,
                ease: 'Cubic.easeOut',
                onComplete: () => dot.destroy(),
            })
        }
    }

    showStamp(x, y, type) {
        const key = type === 'safe' ? 'ui-stamp-safe' : 'ui-stamp-miss'
        const stamp = this.add.image(x, y, key).setDepth(66).setScale(0.42).setAlpha(0)
        this.tweens.add({
            targets: stamp,
            alpha: 1,
            scaleX: 0.84,
            scaleY: 0.84,
            angle: type === 'safe' ? -6 : 7,
            duration: 210,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: stamp,
                    y: y - 54,
                    alpha: 0,
                    delay: 420,
                    duration: 480,
                    ease: 'Cubic.easeIn',
                    onComplete: () => stamp.destroy(),
                })
            },
        })
    }

    showMessage(main, hint = '') {
        this.messageText?.setAlpha(1).setScale(1).setText(main)
        this.hintText?.setAlpha(1).setScale(1).setText(hint)
        this.tweens.killTweensOf(this.messageText)
        this.tweens.killTweensOf(this.hintText)
        this.tweens.add({
            targets: [this.messageText, this.hintText],
            scaleX: 1.02,
            scaleY: 1.02,
            yoyo: true,
            duration: 120,
            ease: 'Sine.easeOut',
        })
    }

    showFloatingText(x, y, text, color) {
        const popup = this.add.text(x, y, text, {
            fontFamily: FONT,
            fontSize: '36px',
            color: `#${color.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 8,
        }).setOrigin(0.5).setDepth(60)

        this.tweens.add({
            targets: popup,
            y: y - 48,
            scaleX: 1.18,
            scaleY: 1.18,
            alpha: 0,
            duration: 850,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy(),
        })
    }

    finishGame() {
        if (this.phase === 'finished') return
        this.phase = 'finished'
        this.destroyChoiceCards()
        this.destroyLaneButtons()
        this.ghostView?.destroy()
        this.ghostView = null
        this.showMessage('結果発表！', '最後まで生き残った人が上位だよ')
        this.updatePlayerViews()
        this.dispatchHud(true)

        const results = Array.from({ length: this.playerCount }, (_, index) => {
            const survivalBonus = this.alive[index] ? 10000 : 0
            const hpBonus = this.hp[index] * 1200
            const placeBonus = this.scorePoints[index] ?? 0
            const missPenalty = this.misses[index] * 30
            return {
                player: index + 1,
                score: survivalBonus + hpBonus + placeBonus - missPenalty,
            }
        })

        this.time.delayedCall(900, () => runtimeOnFinish({ results }))
    }

    dispatchHud(isAnswerChecked = false) {
        const selected = this.currentChoices[this.selectedChoiceIndex]
        const aliveCount = this.alive.filter(Boolean).length
        const pointPreview = this.calculateTurnPoints(
            this.currentPlayerIndex,
            selected,
            this.selectedPlaceX,
            true
        )
        runtimeHudTarget?.dispatchEvent(new CustomEvent('game-hud-update', {
            detail: {
                currentPlayerIndex: this.currentPlayerIndex,
                playerCount: this.playerCount,
                hp: [...this.hp],
                alive: [...this.alive],
                successes: [...this.successes],
                misses: [...this.misses],
                streaks: [...this.streaks],
                boostAvailable: [...this.boostAvailable],
                boostArmed: this.boostArmed,
                boostMultiplier: BOOST.multiplier,
                turnNumber: this.turnNumber,
                maxTurns: this.maxTurns,
                round: this.roundNumber,
                scores: this.scorePoints.map((score, index) => (this.alive[index] ? score : -999)),
                currentScore: this.scorePoints[this.currentPlayerIndex] ?? 0,
                combo: this.misses[this.currentPlayerIndex] ?? 0,
                timeLeft: Math.max(0, this.maxTurns - this.turnNumber),
                isAnswerChecked,
                nextButtonLabel: '次の人へ',
                actionButtonLabel: '置く！',
                ruleName: 'デスクつみタワーEX',
                statusMessage: this.phase === 'select'
                    ? `P${this.currentPlayerIndex + 1}: えらんで おく`
                    : this.phase === 'settling'
                        ? 'ぐらぐら中'
                        : 'つぎへ',
                selectedItemLabel: selected?.label ?? '雑貨',
                selectedItemDescription: selected?.description ?? '置くものを選んでね',
                selectedItemPoints: selected?.points ?? 0,
                selectedItemIcon: selected?.icon ?? 'ITEM',
                selectedItemColor: selected?.color ?? 0x4b72d9,
                selectedItemKey: selected?.key ?? 'book',
                selectedPlacementPercent: Math.round(getPlacementRatio(this.selectedPlaceX) * 100),
                selectedLaneLabel: getPlacementLabel(this.selectedPlaceX),
                targetPlacementPercent: Math.round(getPlacementRatio(this.targetPlaceX) * 100),
                targetBonus: TARGET_ZONE.bonus,
                isTargetMatched: Math.abs(this.selectedPlaceX - this.targetPlaceX) <= TARGET_ZONE.radius,
                aliveCount,
                difficultyLabel: this.difficultyConfig.label,
                challengeLabel: this.currentChallenge?.label ?? '安全第一',
                challengeHint: this.currentChallenge?.hint ?? '崩さず置く',
                challengeBonus: this.currentChallenge?.bonus ?? 40,
                partyEventLabel: this.currentPartyEvent?.label ?? '通常ラウンド',
                partyEventHint: this.roundNumber >= ROUND_DROP.enabledFromRound && this.lastRoundDropLabel
                    ? `${this.currentPartyEvent?.hint ?? 'お題を狙う'} / DROP ${this.lastRoundDropLabel}`
                    : this.currentPartyEvent?.hint ?? 'お題を狙う',
                roundDropLabel: this.roundNumber >= ROUND_DROP.enabledFromRound
                    ? this.lastRoundDropLabel
                    : '',
                roundItemScale: this.getRoundItemScale(),
                projectedTurnPoints: pointPreview.total,
                projectedBonusPoints: pointPreview.bonusTotal,
                stackHeight: Math.round(this.getStackHeight()),
                choiceCount: this.currentChoices.length,
                timingRuleLabel: `PERF +${TIMING.perfectBonus}`,
                feverLabel: `FVR +${FEVER.bonus}`,
                feverReady: (this.streaks[this.currentPlayerIndex] ?? 0) >= FEVER.triggerStreak - 1,
                streak: this.streaks[this.currentPlayerIndex] ?? 0,
            },
        }))
    }
}
