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
    tableCenterX: 642,
    tableCenterY: 600,
    tableTopY: 580,
    tableWidth: 540,
    tableHeight: 38,
    groundY: 690,
    faultLineY: 656,
    leftLimitX: 265,
    rightLimitX: 1018,
}

const PLAYER_COLORS = [0xe94834, 0x2f73c9, 0x2da65d, 0xf0a51f]
const PLAYER_DARK_COLORS = [0xa22d24, 0x1e4f91, 0x1f7143, 0x9b6413]
const LANE_OFFSETS = [-216, -108, 0, 108, 216]

const DIFFICULTY_CONFIG = {
    easy: { gravity: 0.96, settleMs: 700, cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'smallCan'], label: 'ゆるめ' },
    normal: { gravity: 1.05, settleMs: 760, cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'smallCan', 'ruler', 'tape'], label: 'ふつう' },
    hard: { gravity: 1.12, settleMs: 840, cardPool: ['book', 'notebook', 'eraser', 'box', 'pencilCase', 'smallCan', 'ruler', 'tape', 'mug', 'battery'], label: 'ぐらぐら' },
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
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const pick = (items) => items[Math.floor(Math.random() * items.length)]

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
        this.selectedLaneIndex = 2
        this.phase = 'boot'
        this.hp = []
        this.alive = []
        this.successes = []
        this.misses = []
        this.turnNumber = 0
        this.roundNumber = 1
        this.maxTurns = 36
        this.items = []
        this.staticBodies = []
        this.playerViews = []
        this.choiceViews = []
        this.laneViews = []
        this.ghostView = null
        this.currentDroppingItem = null
        this.messageText = null
        this.hintText = null
        this.turnText = null
        this.dropStartedAt = 0
        this.stableSince = null
        this.inputLockedUntil = 0
        this.keyHandlers = null
        this.difficultyConfig = DIFFICULTY_CONFIG.normal
    }

    preload() {
        Object.keys(ITEM_KINDS).forEach((key) => {
            this.load.image(`item-${key}`, `/assets/images/items/${key}.png`)
        })
        for (let index = 1; index <= 4; index += 1) {
            this.load.image(`robot-p${index}`, `/assets/images/characters/robot_p${index}.png`)
        }
        this.load.image('ui-controls-hint', '/assets/images/ui/controls_hint.png')
    }

    create() {
        const difficulty = runtimeSettings.difficulty || this.bootData.difficulty || 'normal'
        this.difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal
        this.playerCount = clamp(Number(runtimeSettings.playerCount || this.bootData.playerCount || 4), 1, 4)
        this.maxTurns = getMaxTurns(difficulty)
        this.hp = Array(this.playerCount).fill(PLAYER_START_HP)
        this.alive = Array(this.playerCount).fill(true)
        this.successes = Array(this.playerCount).fill(0)
        this.misses = Array(this.playerCount).fill(0)
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

        this.showMessage('雑貨つみタワー', '1人1個ずつ置いて、崩した人がHP-1！')
        this.time.delayedCall(650, () => this.beginTurn(0))
    }

    registerExternalCommands() {
        this.commandHandler = (event) => {
            const type = event.detail?.type
            if (type === 'answer' && this.phase === 'select') {
                this.placeSelectedItem()
            }
            if (type === 'next' && this.phase === 'message') {
                this.advanceTurn()
            }
        }

        runtimeHudTarget?.addEventListener('game-command', this.commandHandler)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            runtimeHudTarget?.removeEventListener('game-command', this.commandHandler)
        })
    }

    registerKeyboard() {
        const keys = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER')
        this.keyHandlers = keys
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
        bg.fillRoundedRect(968, 86, 278, 402, 26)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(968, 86, 278, 402, 26)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(992, 100, 186, 34, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(992, 100, 186, 34, 14)

        // shelf background
        bg.fillStyle(0xfff2b8, 1)
        bg.fillRoundedRect(975, 500, 250, 96, 20)
        bg.lineStyle(4, 0x9b6413, 1)
        bg.strokeRoundedRect(975, 500, 250, 96, 20)
        bg.lineStyle(4, 0xc27a1d, 1)
        bg.beginPath()
        bg.moveTo(990, 548)
        bg.lineTo(1210, 548)
        bg.strokePath()
        for (let i = 0; i < 4; i += 1) {
            const x = 1002 + i * 48
            bg.fillStyle([0x4b72d9, 0xff7aa5, 0x2aa7a3, 0xf6c85f][i % 4], 1)
            bg.fillRoundedRect(x, 516 + (i % 2) * 8, 28, 28, 6)
            bg.fillStyle(0xffffff, 0.9)
            bg.fillRect(x + 5, 526 + (i % 2) * 8, 18, 5)
        }
        bg.fillStyle(0xcdd5e2, 1)
        bg.fillRoundedRect(1180, 519, 24, 24, 6)
        bg.fillStyle(0xe94834, 1)
        bg.fillRect(1184, 526, 16, 6)

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

        // lane guide shadows
        LANE_OFFSETS.forEach((offset, index) => {
            const x = WORLD.tableCenterX + offset
            bg.fillStyle(0xffffff, 0.17)
            bg.fillRoundedRect(x - 40, 340, 80, 214, 18)
            bg.lineStyle(2, 0xffffff, 0.18)
            bg.strokeRoundedRect(x - 40, 340, 80, 214, 18)
            bg.fillStyle(0xfff6d5, 1)
            bg.fillRoundedRect(x - 34, 552, 68, 28, 12)
            bg.lineStyle(3, 0x8b5824, 1)
            bg.strokeRoundedRect(x - 34, 552, 68, 28, 12)
            this.add.text(x, 566, `${index + 1}`, {
                fontFamily: FONT,
                fontSize: '18px',
                color: '#6b3a08',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0.5)
        })

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

        this.add.text(1085, 117, 'えらべる雑貨', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#8b5d24',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

        this.add.image(1108, 472, 'ui-controls-hint')
            .setDisplaySize(240, 60)
            .setDepth(2)
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
        const startX = 170
        const gap = 92
        for (let index = 0; index < this.playerCount; index += 1) {
            const x = startX + index * gap
            const y = 673
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
        const body = this.textures.exists(textureKey)
            ? this.add.image(0, -8, textureKey).setDisplaySize(82, 98)
            : this.createFallbackRobotGraphic(playerIndex)

        const label = this.add.text(0, 50, `P${playerIndex + 1}`, {
            fontFamily: FONT,
            fontSize: '19px',
            color: '#1b1b1b',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5)

        container.add([shadow, body, label])
        return container
    }

    updatePlayerViews() {
        this.playerViews.forEach((view, index) => {
            const isCurrent = index === this.currentPlayerIndex && this.phase !== 'finished'
            const isAlive = this.alive[index]
            const targetX = isCurrent ? 1020 : 170 + index * 92
            const targetY = isCurrent ? 548 : 673
            const scale = isCurrent ? 1.16 : 0.92
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
        this.selectedChoiceIndex = 0
        this.selectedLaneIndex = 2
        this.currentDroppingItem = null
        this.stableSince = null
        this.inputLockedUntil = this.time.now + 240
        this.turnNumber += 1
        this.roundNumber = Math.floor((this.turnNumber - 1) / Math.max(1, this.playerCount)) + 1

        this.currentChoices = uniqueChoices(this.difficultyConfig.cardPool, 3)
        this.showMessage(`P${nextIndex + 1} の番`, '置く雑貨を選んで、置き場所を決めてね')
        this.turnText?.setText(`TURN ${this.turnNumber}/${this.maxTurns}`)
        this.createChoiceCards()
        this.createLaneButtons()
        this.createGhostView()
        this.updatePlayerViews()
        this.dispatchHud(false)
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
        const startX = 1108
        const startY = 182
        this.currentChoices.forEach((kind, index) => {
            const y = startY + index * 110
            const selected = index === this.selectedChoiceIndex
            const card = this.add.container(startX, y).setDepth(35)
            const bg = this.add.graphics()
            bg.fillStyle(selected ? 0xfff1a6 : 0xffffff, 0.97)
            bg.fillRoundedRect(-122, -44, 244, 88, 20)
            bg.lineStyle(5, selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xc1914f, 1)
            bg.strokeRoundedRect(-122, -44, 244, 88, 20)
            bg.fillStyle(0x000000, 0.08)
            bg.fillRoundedRect(-110, 30, 220, 7, 6)
            bg.fillStyle(selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xffdf89, 1)
            bg.fillRoundedRect(-109, -32, 32, 32, 12)
            bg.lineStyle(3, 0x8f5d28, 0.65)
            bg.strokeRoundedRect(-109, -32, 32, 32, 12)

            const numberText = this.add.text(-93, -16, `${index + 1}`, {
                fontFamily: FONT,
                fontSize: '20px',
                color: selected ? '#ffffff' : '#6b3a08',
                fontStyle: 'bold',
                stroke: selected ? '#8f5d28' : '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0.5)

            const sample = this.add.container(-64, 2)
            const preview = this.createItemDisplay(kind, 0.98)
            sample.add(preview)
            sample.setScale(0.58)

            const label = this.add.text(-10, -16, kind.label, {
                fontFamily: FONT,
                fontSize: '24px',
                color: '#1b1b1b',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0, 0.5)
            const desc = this.add.text(-10, 14, kind.description, {
                fontFamily: FONT,
                fontSize: '14px',
                color: '#6b3a08',
                fontStyle: 'bold',
                stroke: '#ffffff',
                strokeThickness: 3,
                wordWrap: { width: 150, useAdvancedWrap: true },
            }).setOrigin(0, 0.5)

            card.add([bg, numberText, sample, label, desc])
            card.setSize(244, 88)
            card.setInteractive(new Phaser.Geom.Rectangle(-122, -44, 244, 88), Phaser.Geom.Rectangle.Contains)
            card.on('pointerdown', () => {
                if (this.phase !== 'select') return
                this.selectedChoiceIndex = index
                this.createChoiceCards()
                this.createGhostView()
                this.dispatchHud(false)
            })
            this.choiceViews.push(card)
        })
    }

    destroyChoiceCards() {
        this.choiceViews.forEach((view) => view.destroy())
        this.choiceViews = []
    }

    createLaneButtons() {
        this.destroyLaneButtons()
        LANE_OFFSETS.forEach((offset, index) => {
            const x = WORLD.tableCenterX + offset
            const y = WORLD.tableTopY - 18
            const lane = this.add.container(x, y).setDepth(31)
            const g = this.add.graphics()
            const selected = index === this.selectedLaneIndex
            g.fillStyle(selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xffffff, selected ? 0.18 : 0.08)
            g.fillRoundedRect(-45, -212, 90, 220, 18)
            g.lineStyle(selected ? 5 : 2, selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xffffff, selected ? 1 : 0.3)
            g.strokeRoundedRect(-45, -212, 90, 220, 18)
            g.fillStyle(selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xfff6d5, 1)
            g.fillRoundedRect(-38, 9, 76, 34, 14)
            g.lineStyle(3, 0x7b4a18, 0.8)
            g.strokeRoundedRect(-38, 9, 76, 34, 14)
            g.fillStyle(selected ? PLAYER_COLORS[this.currentPlayerIndex] : 0xffffff, selected ? 0.96 : 0.7)
            g.fillRoundedRect(-18, -194, 36, 22, 10)
            g.lineStyle(2, 0x7b4a18, 0.35)
            g.strokeRoundedRect(-18, -194, 36, 22, 10)
            const laneLabel = this.add.text(0, -183, 'DROP', {
                fontFamily: FONT,
                fontSize: '10px',
                color: selected ? '#ffffff' : '#6b3a08',
                fontStyle: 'bold',
            }).setOrigin(0.5)
            const t = this.add.text(0, 26, `${index + 1}`, {
                fontFamily: FONT,
                fontSize: '20px',
                color: selected ? '#ffffff' : '#6b3a08',
                fontStyle: 'bold',
                stroke: selected ? '#7b4a18' : '#ffffff',
                strokeThickness: 4,
            }).setOrigin(0.5)
            lane.add([g, laneLabel, t])
            lane.setSize(96, 245)
            lane.setInteractive(new Phaser.Geom.Rectangle(-48, -212, 96, 245), Phaser.Geom.Rectangle.Contains)
            lane.on('pointerdown', () => {
                if (this.phase !== 'select') return
                this.selectedLaneIndex = index
                this.createLaneButtons()
                this.createGhostView()
                this.dispatchHud(false)
            })
            lane.on('pointerup', () => {
                if (this.phase !== 'select') return
                this.selectedLaneIndex = index
                this.placeSelectedItem()
            })
            this.laneViews.push(lane)
        })
    }

    destroyLaneButtons() {
        this.laneViews.forEach((view) => view.destroy())
        this.laneViews = []
    }

    createGhostView() {
        this.ghostView?.destroy()
        if (this.phase !== 'select') return
        const kind = this.currentChoices[this.selectedChoiceIndex]
        if (!kind) return
        const x = WORLD.tableCenterX + LANE_OFFSETS[this.selectedLaneIndex]
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
        this.destroyChoiceCards()
        this.destroyLaneButtons()
        this.ghostView?.destroy()
        this.ghostView = null
        this.stableSince = null
        this.dropStartedAt = this.time.now

        const x = WORLD.tableCenterX + LANE_OFFSETS[this.selectedLaneIndex]
        const y = this.getSpawnY()
        const angleJitter = runtimeSettings.difficulty === 'hard'
            ? Phaser.Math.FloatBetween(-0.08, 0.08)
            : Phaser.Math.FloatBetween(-0.045, 0.045)
        const item = this.createPlacedItem(x, y, kind, angleJitter)
        this.currentDroppingItem = item
        this.showMessage(`${kind.label} を置いた！`, 'グラグラが止まるまで見守ってね')
        this.dispatchHud(false)

        const robot = this.playerViews[this.currentPlayerIndex]
        if (robot) {
            this.tweens.add({ targets: robot, y: robot.y + 12, yoyo: true, duration: 160, ease: 'Sine.easeOut' })
        }
    }

    createPlacedItem(x, y, kind, angle = 0) {
        const options = {
            friction: kind.friction ?? 0.8,
            frictionStatic: kind.frictionStatic ?? 0.6,
            restitution: kind.restitution ?? 0.02,
            density: kind.density ?? 0.0035,
            frictionAir: 0.002,
        }
        let body
        if (kind.shape === 'can' || kind.shape === 'tape') {
            body = MATTER.Bodies.circle(x, y, kind.radius, options)
        } else {
            body = MATTER.Bodies.rectangle(x, y, kind.width, kind.height, {
                ...options,
                chamfer: { radius: ['box', 'mug', 'battery'].includes(kind.shape) ? 8 : 5 },
            })
        }
        this.matter.world.add(body)
        MATTER.Body.setAngle(body, angle)

        const view = this.add.container(x, y).setDepth(20)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, (kind.height ?? kind.radius * 2) / 2 + 7, (kind.width ?? kind.radius * 2) * 0.75, 8)
        const itemImage = this.createItemDisplay(kind, 1.08)
        const label = this.add.text(0, (kind.height ?? kind.radius * 2) / 2 + 18, kind.label, {
            fontFamily: FONT,
            fontSize: '13px',
            color: '#5d370a',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 3,
        }).setOrigin(0.5)
        view.add([shadow, itemImage, label])

        const item = { body, view, kind, owner: this.currentPlayerIndex, safe: false }
        this.items.push(item)
        return item
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

        const radius = kind.shape === 'book' ? 4 : kind.shape === 'ruler' ? 3 : 8
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
        }

    }

    update() {
        this.syncItemViews()
        this.handleKeyboardInput()

        if (this.phase === 'settling') {
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

    handleKeyboardInput() {
        const keys = this.keyHandlers
        if (!keys || this.phase !== 'select') return

        if (Phaser.Input.Keyboard.JustDown(keys.LEFT) || Phaser.Input.Keyboard.JustDown(keys.A)) {
            this.selectedLaneIndex = clamp(this.selectedLaneIndex - 1, 0, LANE_OFFSETS.length - 1)
            this.createLaneButtons()
            this.createGhostView()
        }
        if (Phaser.Input.Keyboard.JustDown(keys.RIGHT) || Phaser.Input.Keyboard.JustDown(keys.D)) {
            this.selectedLaneIndex = clamp(this.selectedLaneIndex + 1, 0, LANE_OFFSETS.length - 1)
            this.createLaneButtons()
            this.createGhostView()
        }
        if (Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.W)) {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex - 1, 0, this.currentChoices.length - 1)
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.DOWN) || Phaser.Input.Keyboard.JustDown(keys.S)) {
            this.selectedChoiceIndex = clamp(this.selectedChoiceIndex + 1, 0, this.currentChoices.length - 1)
            this.createChoiceCards()
            this.createGhostView()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) {
            this.placeSelectedItem()
        }
    }

    checkCollapseOrSettle() {
        if (this.time.now - this.dropStartedAt < 520) return

        const fallen = this.items.find((item) => item.body && this.isFallen(item.body))
        if (fallen) {
            this.handleMiss(fallen)
            return
        }

        const minWait = 950
        if (this.time.now - this.dropStartedAt < minWait) return

        if (this.isTowerStable()) {
            if (this.stableSince === null) this.stableSince = this.time.now
            if (this.time.now - this.stableSince >= this.difficultyConfig.settleMs) {
                this.handleSafe()
            }
        } else {
            this.stableSince = null
            if (this.time.now - this.dropStartedAt > 7200) {
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
            return item.body.speed < 0.13 && Math.abs(item.body.angularVelocity) < 0.022
        })
    }

    handleSafe() {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        this.successes[this.currentPlayerIndex] += 1
        this.currentDroppingItem = null
        this.showFloatingText(WORLD.tableCenterX, 250, 'SAFE!', 0x2da65d)
        this.showMessage('セーフ！', '次の人へ交代するよ')
        this.dispatchHud(true)
        this.time.delayedCall(720, () => this.advanceTurn())
    }

    handleMiss(fallenItem) {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.hp[player] = Math.max(0, this.hp[player] - 1)
        this.misses[player] += 1
        if (this.hp[player] <= 0) {
            this.alive[player] = false
        }

        this.cameras.main.shake(320, 0.008)
        this.showFloatingText(fallenItem.body.position.x, Math.min(fallenItem.body.position.y, 610), 'MISS!', 0xe94834)
        const hpText = this.hp[player] > 0 ? `P${player + 1} HP -1` : `P${player + 1} 脱落…！`
        this.showMessage('くずれた！', hpText)
        this.dispatchHud(true)
        this.updatePlayerViews()

        this.time.delayedCall(1280, () => {
            this.clearStack()
            if (this.shouldFinish()) {
                this.finishGame()
            } else {
                this.advanceTurn()
            }
        })
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
            const placeBonus = this.successes[index] * 80
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
        runtimeHudTarget?.dispatchEvent(new CustomEvent('game-hud-update', {
            detail: {
                currentPlayerIndex: this.currentPlayerIndex,
                playerCount: this.playerCount,
                hp: [...this.hp],
                alive: [...this.alive],
                successes: [...this.successes],
                misses: [...this.misses],
                turnNumber: this.turnNumber,
                maxTurns: this.maxTurns,
                round: this.roundNumber,
                scores: this.successes.map((count, index) => (this.alive[index] ? count : -999)),
                currentScore: this.successes[this.currentPlayerIndex] ?? 0,
                combo: this.misses[this.currentPlayerIndex] ?? 0,
                timeLeft: Math.max(0, this.maxTurns - this.turnNumber),
                isAnswerChecked,
                nextButtonLabel: '次の人へ',
                actionButtonLabel: '置く！',
                ruleName: '雑貨つみタワー',
                statusMessage: this.phase === 'select'
                    ? `P${this.currentPlayerIndex + 1}: ${selected?.label ?? '雑貨'}をどこに置く？`
                    : this.phase === 'settling'
                        ? 'グラグラ確認中… 机から落ちたらミス'
                        : '交代中… 次のプレイヤーを待ってね',
                selectedItemLabel: selected?.label ?? '雑貨',
                selectedItemDescription: selected?.description ?? '置くものを選んでね',
                selectedItemKey: selected?.key ?? 'book',
                selectedLaneIndex: this.selectedLaneIndex + 1,
                aliveCount,
                difficultyLabel: this.difficultyConfig.label,
            },
        }))
    }
}
