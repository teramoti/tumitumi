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
    stageCenterX: 650,
    matTopY: 606,
    matWidth: 650,
    matHeight: 44,
    floorY: 686,
    faultLineY: 654,
}

const PLAYER_COLORS = [0xe94834, 0x2f73c9, 0x2da65d, 0xf0a51f]
const PLAYER_DARK_COLORS = [0xa22d24, 0x1e4f91, 0x1f7143, 0x9b6413]

const DIFFICULTY_CONFIG = {
    easy: { gravity: 0.92, settleMs: 520, layers: 7, riskyRate: 0.08, label: 'ゆるめ' },
    normal: { gravity: 1.03, settleMs: 600, layers: 8, riskyRate: 0.16, label: 'ふつう' },
    hard: { gravity: 1.13, settleMs: 680, layers: 9, riskyRate: 0.24, label: 'ぐらぐら' },
}

const BLOCK_TYPES = {
    normal: {
        key: 'normal', label: '支柱', imageKey: 'block-normal', hudKey: 'kumiNormal',
        width: 110, height: 38, density: 0.0046, friction: 0.95, frictionStatic: 0.9, points: 120,
    },
    wide: {
        key: 'wide', label: '台座', imageKey: 'block-wide', hudKey: 'kumiWide',
        width: 154, height: 34, density: 0.0052, friction: 0.98, frictionStatic: 0.92, points: 90,
    },
    light: {
        key: 'light', label: '軽支柱', imageKey: 'block-light', hudKey: 'kumiLight',
        width: 84, height: 34, density: 0.0034, friction: 0.86, frictionStatic: 0.72, points: 160,
    },
    risky: {
        key: 'risky', label: '揺れ支柱', imageKey: 'block-risky', hudKey: 'kumiRisky',
        width: 104, height: 48, density: 0.0038, friction: 0.68, frictionStatic: 0.46, restitution: 0.05, points: 230,
    },
    guard: {
        key: 'guard', label: '守り支柱', imageKey: 'block-guard', hudKey: 'kumiGuard',
        width: 118, height: 40, density: 0.0058, friction: 0.99, frictionStatic: 0.94, points: 70,
    },
}


const HAZARD_TYPES = [
    { key: 'book', label: '本', imageKey: 'hazard-book', width: 112, height: 26, shape: 'rect', density: 0.0048, points: 90 },
    { key: 'eraser', label: '消しゴム', imageKey: 'hazard-eraser', width: 58, height: 28, shape: 'rect', density: 0.0034, points: 110 },
    { key: 'can', label: '缶', imageKey: 'hazard-can', width: 56, height: 56, shape: 'circle', radius: 28, density: 0.0042, points: 140 },
    { key: 'mug', label: 'コップ', imageKey: 'hazard-mug', width: 48, height: 64, shape: 'rect', density: 0.0044, points: 170 },
    { key: 'tape', label: 'テープ', imageKey: 'hazard-tape', width: 58, height: 58, shape: 'circle', radius: 29, density: 0.0036, points: 190 },
    { key: 'battery', label: '電池', imageKey: 'hazard-battery', width: 42, height: 62, shape: 'rect', density: 0.0054, points: 220 },
    { key: 'ruler', label: '定規', imageKey: 'hazard-ruler', width: 142, height: 14, shape: 'rect', density: 0.0032, points: 230 },
    { key: 'box', label: '小箱', imageKey: 'hazard-box', width: 78, height: 50, shape: 'rect', density: 0.0046, points: 210 },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function bodyCenterY(body) {
    return body.position.y
}

export default class TowerCrashScene extends Phaser.Scene {
    constructor(data = {}) {
        super('TowerCrash')
        this.bootData = data
        this.playerCount = 4
        this.currentPlayerIndex = 0
        this.phase = 'boot'
        this.hp = []
        this.alive = []
        this.successes = []
        this.misses = []
        this.breakPoints = []
        this.turnNumber = 0
        this.roundNumber = 1
        this.maxTurns = 36
        this.blocks = []
        this.hazards = []
        this.leader = null
        this.leaderSprite = null
        this.leaderSprite = null
        this.staticBodies = []
        this.playerViews = []
        this.selectedBlockIndex = 0
        this.cursorView = null
        this.messageText = null
        this.hintText = null
        this.turnText = null
        this.blockNameText = null
        this.dropStartedAt = 0
        this.stableSince = null
        this.inputLockedUntil = 0
        this.keyHandlers = null
        this.difficultyConfig = DIFFICULTY_CONFIG.normal
        this.sfx = null
        this.turnSplash = null
        this.combo = []
        this.pendingBreakPoints = 0
        this.pendingBonus = false
        this.bonusBlock = null
        this.bonusBadge = null
        this.isFeverTurn = false
        this.isDropTurn = false
        this.pendingHazard = null
        this.dropProfile = null
        this.pendingDropPoints = 0
    }

    preload() {
        this.load.image('block-normal', '/assets/kumi_block_normal.png')
        this.load.image('block-wide', '/assets/kumi_block_wide.png')
        this.load.image('block-light', '/assets/kumi_block_light.png')
        this.load.image('block-risky', '/assets/kumi_block_risky.png')
        this.load.image('block-guard', '/assets/kumi_block_guard.png')
        this.load.image('ui-stamp-safe', '/assets/ui_stamp_safe.png')
        this.load.image('ui-stamp-miss', '/assets/ui_stamp_miss.png')
        this.load.image('ui-turn-plate', '/assets/ui_turn_plate.png')
        this.load.image('ui-drop-icon', '/assets/ui_drop_icon.png')
        this.load.image('ui-controls-hint', '/assets/ui_controls_battle.png')
        this.load.image('ui-bonus-badge', '/assets/ui_bonus_badge.png')
        this.load.image('ui-fever-alert', '/assets/ui_fever_alert.png')
        this.load.image('ui-combo-badge', '/assets/ui_combo_badge.png')
        this.load.image('hazard-book', '/assets/item_book.png')
        this.load.image('hazard-eraser', '/assets/item_eraser.png')
        this.load.image('hazard-can', '/assets/item_smallCan.png')
        this.load.image('hazard-mug', '/assets/item_mug.png')
        this.load.image('hazard-tape', '/assets/item_tape.png')
        this.load.image('hazard-battery', '/assets/item_battery.png')
        this.load.image('hazard-ruler', '/assets/item_ruler.png')
        this.load.image('hazard-box', '/assets/item_box.png')
        for (let index = 1; index <= 4; index += 1) {
            this.load.image(`player-marker-p${index}`, `/assets/player_badge_p${index}.png`)
        }
        this.load.image('tower-core', '/assets/tower_core.png')
        this.load.audio('se-place', '/assets/se_place.wav')
        this.load.audio('se-safe', '/assets/se_safe.wav')
        this.load.audio('se-miss', '/assets/se_miss.wav')
        this.load.audio('se-turn', '/assets/se_turn.wav')
        this.load.audio('se-select', '/assets/se_select.wav')
        this.load.audio('se-lane', '/assets/se_lane.wav')
        this.load.audio('se-bonus', '/assets/se_bonus.wav')
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
        this.breakPoints = Array(this.playerCount).fill(0)
        this.combo = Array(this.playerCount).fill(0)
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
            place: this.sound.add('se-place', { volume: 0.58 }),
            safe: this.sound.add('se-safe', { volume: 0.62 }),
            miss: this.sound.add('se-miss', { volume: 0.7 }),
            turn: this.sound.add('se-turn', { volume: 0.52 }),
            select: this.sound.add('se-select', { volume: 0.42 }),
            lane: this.sound.add('se-lane', { volume: 0.36 }),
            bonus: this.sound.add('se-bonus', { volume: 0.58 }),
        }

        this.createTower()
        this.showMessage('逆ジェンガバトル', '上から落として たえろ！')
        this.time.delayedCall(700, () => this.beginTurn(0))
    }

    registerExternalCommands() {
        this.commandHandler = (event) => {
            const type = event.detail?.type
            if (type === 'answer' && this.phase === 'select') {
                this.removeSelectedBlock()
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
        this.cameras.main.setBackgroundColor('#7bdcff')
        const bg = this.add.graphics()
        bg.fillStyle(0x7bdcff, 1)
        bg.fillRect(0, 0, 1280, 720)
        bg.fillStyle(0xdff6ff, 1)
        bg.fillRect(0, 0, 1280, 246)

        for (let index = 0; index < 14; index += 1) {
            const x = 40 + index * 92
            const y = 40 + (index % 4) * 26
            bg.fillStyle(0xffffff, 0.28)
            bg.fillCircle(x, y, 14)
            bg.fillCircle(x + 16, y + 5, 16)
            bg.fillCircle(x - 12, y + 7, 12)
        }

        // arena frame
        bg.fillStyle(0xfff9e8, 0.92)
        bg.fillRoundedRect(390, 18, 520, 152, 24)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(390, 18, 520, 152, 24)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(420, 32, 160, 34, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(420, 32, 160, 34, 14)
        this.add.text(500, 49, 'BATTLE TURN', {
            fontFamily: FONT,
            fontSize: '18px', color: '#8b5d24', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)

        // right mini target board
        bg.fillStyle(0xfffbef, 0.94)
        bg.fillRoundedRect(990, 106, 240, 200, 24)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(990, 106, 240, 200, 24)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(1018, 122, 126, 32, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(1018, 122, 126, 32, 14)
        this.add.text(1081, 138, 'TARGET', {
            fontFamily: FONT,
            fontSize: '18px', color: '#8b5d24', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)
        this.add.image(1110, 280, 'ui-controls-hint').setDisplaySize(215, 54).setAlpha(0.95)

        // lower gym floor
        bg.fillStyle(0xffe28a, 1)
        bg.fillRect(0, 618, 1280, 102)
        bg.fillStyle(0xd5892f, 1)
        bg.fillRect(0, 650, 1280, 70)
        bg.lineStyle(7, 0x7b4a18, 1)
        bg.beginPath(); bg.moveTo(0, 618); bg.lineTo(1280, 618); bg.strokePath()

        // safety mat / narrow base
        const matX = WORLD.stageCenterX - WORLD.matWidth / 2
        bg.fillStyle(0x5cb5ff, 1)
        bg.fillRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 18)
        bg.fillStyle(0xeef7ff, 1)
        bg.fillRoundedRect(matX + 24, WORLD.matTopY + 9, WORLD.matWidth - 48, 10, 8)
        bg.lineStyle(6, 0x1f4f91, 1)
        bg.strokeRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 18)

        this.add.text(WORLD.stageCenterX, WORLD.matTopY + 23, 'コアがここまで落ちたらミス', {
            fontFamily: FONT,
            fontSize: '18px', color: '#17365e', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)
    }

    createStageBodies() {
        this.addStaticRectangle(WORLD.stageCenterX, WORLD.matTopY + WORLD.matHeight / 2, WORLD.matWidth, WORLD.matHeight, 0.98)
        this.addStaticRectangle(640, WORLD.floorY + 18, 1280, 36, 0.98)
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
        this.messageText = this.add.text(650, 82, '', {
            fontFamily: FONT, fontSize: '38px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 8, align: 'center', wordWrap: { width: 440, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)

        this.hintText = this.add.text(650, 125, '', {
            fontFamily: FONT, fontSize: '22px', color: '#6b3a08', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 440, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)

        this.turnText = this.add.text(650, 158, '', {
            fontFamily: FONT, fontSize: '20px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)

        this.blockNameText = this.add.text(1110, 210, '', {
            fontFamily: FONT, fontSize: '34px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 6, align: 'center', wordWrap: { width: 200, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(50)
    }

    createPlayerViews() {
        const startX = 150
        const gap = 82
        for (let index = 0; index < this.playerCount; index += 1) {
            const x = startX + index * gap
            const y = 673
            const view = this.createPlayerMarker(x, y, index)
            this.playerViews.push(view)
        }
    }

    createPlayerMarker(x, y, playerIndex) {
        const container = this.add.container(x, y).setDepth(40)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.16)
        shadow.fillEllipse(0, 30, 66, 15)
        const body = this.add.image(0, -8, `player-marker-p${playerIndex + 1}`).setDisplaySize(86, 86)
        const label = this.add.text(0, 50, `P${playerIndex + 1}`, {
            fontFamily: FONT, fontSize: '19px', color: '#1b1b1b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)
        container.add([shadow, body, label])
        return container
    }

    createTower() {
        this.clearBonusTarget()
        this.clearStack()
        const layers = this.difficultyConfig.layers
        const baseY = WORLD.matTopY - 20
        const verticalStep = 39
        for (let layer = 0; layer < layers; layer += 1) {
            const y = baseY - layer * verticalStep
            if (layer % 2 === 0) {
                const offsets = [-112, 0, 112]
                offsets.forEach((offset, column) => {
                    const type = this.pickBlockType(layer, column)
                    this.createBlock(WORLD.stageCenterX + offset, y, type, layer, column, Phaser.Math.FloatBetween(-0.012, 0.012))
                })
            } else {
                const offsets = [-62, 62]
                offsets.forEach((offset, column) => {
                    const type = layer < 2 ? BLOCK_TYPES.wide : this.pickBlockType(layer, column)
                    this.createBlock(WORLD.stageCenterX + offset, y, type, layer, column, Phaser.Math.FloatBetween(-0.05, 0.05))
                })
            }
        }
        this.createLeader(WORLD.stageCenterX, baseY - layers * verticalStep - 42)
        this.selectedBlockIndex = 0
        this.refreshSelectableBlocks()
        this.updateTargetCursor()
    }

    pickBlockType(layer, column) {
        if (layer === 0) return BLOCK_TYPES.guard
        const roll = Phaser.Math.FloatBetween(0, 1)
        if (roll < this.difficultyConfig.riskyRate) return BLOCK_TYPES.risky
        if ((layer + column) % 4 === 0) return BLOCK_TYPES.light
        if ((layer + column) % 5 === 0) return BLOCK_TYPES.wide
        return BLOCK_TYPES.normal
    }

    createBlock(x, y, type, layer, column, angle = 0) {
        const options = {
            friction: type.friction,
            frictionStatic: type.frictionStatic,
            restitution: type.restitution ?? 0.01,
            density: type.density,
            frictionAir: 0.002,
            chamfer: { radius: 7 },
        }
        const body = MATTER.Bodies.rectangle(x, y, type.width, type.height, options)
        this.matter.world.add(body)
        MATTER.Body.setAngle(body, angle)
        const view = this.add.container(x, y).setDepth(20)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, type.height / 2 + 7, type.width * 0.7, 8)
        const image = this.add.image(0, 0, type.imageKey).setDisplaySize(type.width, type.height)
        view.add([shadow, image])
        const block = { body, view, type, layer, column, active: true, removed: false }
        view.setSize(type.width, type.height)
        view.setInteractive(new Phaser.Geom.Rectangle(-type.width / 2, -type.height / 2, type.width, type.height), Phaser.Geom.Rectangle.Contains)
        view.on('pointerdown', () => {
            if (this.phase !== 'select' || !block.active) return
            this.selectedBlockIndex = Math.max(0, this.getSelectableBlocks().indexOf(block))
            this.sfx?.select?.play()
            this.updateTargetCursor()
            this.dispatchHud(false)
        })
        view.on('pointerup', () => {
            if (this.phase !== 'select' || !block.active) return
            this.removeSelectedBlock()
        })
        this.blocks.push(block)
        return block
    }

    createLeader(x, y) {
        const body = MATTER.Bodies.rectangle(x, y, 62, 78, {
            friction: 0.9, frictionStatic: 0.8, restitution: 0.02, density: 0.0035, chamfer: { radius: 10 }, frictionAir: 0.002,
        })
        this.matter.world.add(body)
        const view = this.add.container(x, y).setDepth(25)
        const aura = this.add.graphics()
        aura.fillStyle(0xffe65b, 0.28)
        aura.fillCircle(0, -6, 50)
        const img = this.add.image(0, -6, 'tower-core').setDisplaySize(82, 82)
        const crown = this.add.text(0, -58, '★', { fontFamily: FONT, fontSize: '32px', color: '#ffe65b', stroke: '#7b4a18', strokeThickness: 5 }).setOrigin(0.5)
        view.add([aura, img, crown])
        this.leaderSprite = img
        this.leader = { body, view }
    }

    clearStack() {
        this.blocks.forEach((block) => {
            if (block.body) this.matter.world.remove(block.body)
            block.view?.destroy()
        })
        this.blocks = []
        this.hazards.forEach((hazard) => {
            if (hazard.body) this.matter.world.remove(hazard.body)
            hazard.view?.destroy()
        })
        this.hazards = []
        if (this.leader?.body) this.matter.world.remove(this.leader.body)
        this.leader?.view?.destroy()
        this.leader = null
        this.leaderSprite = null
        this.clearBonusTarget()
        this.cursorView?.destroy()
        this.cursorView = null
        this.stableSince = null
    }

    refreshSelectableBlocks() {
        const selectable = this.getSelectableBlocks()
        if (selectable.length === 0) return
        this.selectedBlockIndex = clamp(this.selectedBlockIndex, 0, selectable.length - 1)
    }

    getSelectableBlocks() {
        return this.blocks
            .filter((block) => block.active && block.body && block.body.position.y < WORLD.matTopY - 30)
            .sort((a, b) => {
                const yDiff = bodyCenterY(b.body) - bodyCenterY(a.body)
                if (Math.abs(yDiff) > 12) return yDiff
                return a.body.position.x - b.body.position.x
            })
    }

    getSelectedBlock() {
        const selectable = this.getSelectableBlocks()
        if (selectable.length === 0) return null
        this.selectedBlockIndex = clamp(this.selectedBlockIndex, 0, selectable.length - 1)
        return selectable[this.selectedBlockIndex]
    }

    updateTargetCursor() {
        const block = this.getSelectedBlock()
        if (!block) {
            this.cursorView?.destroy()
            this.cursorView = null
            this.blockNameText?.setText('')
            return
        }
        if (!this.cursorView) {
            this.cursorView = this.add.graphics().setDepth(44)
        }
        this.cursorView.clear()
        this.cursorView.lineStyle(6, PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffffff, 0.95)
        this.cursorView.strokeRoundedRect(-block.type.width / 2 - 8, -block.type.height / 2 - 8, block.type.width + 16, block.type.height + 16, 14)
        this.cursorView.fillStyle(PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffffff, 0.16)
        this.cursorView.fillRoundedRect(-block.type.width / 2 - 8, -block.type.height / 2 - 8, block.type.width + 16, block.type.height + 16, 14)
        this.cursorView.setPosition(block.body.position.x, block.body.position.y)
        this.cursorView.setRotation(block.body.angle)
        this.blockNameText?.setText(block === this.bonusBlock ? `DROP x${this.dropProfile?.count ?? 1} +BONUS` : `DROP x${this.dropProfile?.count ?? 1}`)
    }

    updatePlayerViews() {
        this.playerViews.forEach((view, index) => {
            const isCurrent = index === this.currentPlayerIndex && this.phase !== 'finished'
            const isAlive = this.alive[index]
            const targetX = isCurrent ? 1005 : 150 + index * 82
            const targetY = isCurrent ? 552 : 673
            const scale = isCurrent ? 1.16 : 0.92
            const alpha = isAlive ? 1 : 0.42
            this.tweens.killTweensOf(view)
            this.tweens.add({ targets: view, x: targetX, y: targetY, scaleX: scale, scaleY: scale, alpha, duration: 310, ease: 'Back.easeOut' })
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
        this.inputLockedUntil = this.time.now + 240
        this.turnNumber += 1
        this.roundNumber = Math.floor((this.turnNumber - 1) / Math.max(1, this.playerCount)) + 1
        this.refreshSelectableBlocks()
        if (this.getSelectableBlocks().length < 4) {
            this.createTower()
        }
        this.isFeverTurn = this.turnNumber > 0 && this.turnNumber % 5 === 0
        this.isDropTurn = true
        this.dropProfile = this.getDropProfile()
        if (this.leaderSprite) this.leaderSprite.setTexture('tower-core')
        this.assignBonusTarget()
        this.sfx?.turn?.play()
        this.showTurnSplash(nextIndex)
        if (this.isFeverTurn) this.showFeverAlert()
        this.showMessage(`P${nextIndex + 1} の番`, `落下 ${this.dropProfile.count}個 / ${this.dropProfile.label}`)
        this.turnText?.setText(`TURN ${this.turnNumber}/${this.maxTurns}`)
        this.updatePlayerViews()
        this.updateTargetCursor()
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
        if (this.playerCount === 1) return this.hp[0] <= 0 || this.turnNumber >= this.maxTurns
        return this.alive.filter(Boolean).length <= 1 || this.turnNumber >= this.maxTurns
    }

    removeSelectedBlock() {
        // v12: 逆ジェンガ形式。支柱は抜かず、選んだ場所へ上から物を落とす。
        if (this.phase !== 'select') return
        if (this.time.now < this.inputLockedUntil) return
        const target = this.getSelectedBlock()
        if (!target) {
            this.handleMiss({ body: this.leader?.body ?? { position: { x: WORLD.stageCenterX, y: WORLD.matTopY } } })
            return
        }
        this.phase = 'settling'
        this.cursorView?.clear()
        this.stableSince = null
        this.dropStartedAt = this.time.now
        const profile = this.dropProfile ?? this.getDropProfile()
        const isBonus = target === this.bonusBlock
        const comboRate = 1 + Math.min(this.combo[this.currentPlayerIndex] ?? 0, 5) * 0.16
        const basePoints = profile.types.reduce((sum, type) => sum + (type.points ?? 100), 0)
        this.pendingBonus = isBonus
        this.pendingBreakPoints = Math.round((basePoints + (isBonus ? 220 : 0) + (this.isFeverTurn ? 120 : 0)) * comboRate)
        const baseX = target.body.position.x
        const baseY = Math.max(80, target.body.position.y - 330)
        this.sfx?.place?.play()
        if (isBonus) this.sfx?.bonus?.play()
        this.showPlaceBurst(baseX, target.body.position.y, PLAYER_COLORS[this.currentPlayerIndex])
        this.showMessage('落とす！', `${profile.count}個 / ${profile.label}`)
        profile.types.forEach((type, index) => {
            this.time.delayedCall(160 * index, () => {
                this.spawnFallingHazard(type, baseX + profile.offsets[index], baseY - index * 34, profile.force)
            })
        })
        if (this.isFeverTurn) {
            this.time.delayedCall(420, () => {
                this.cameras.main.shake(240, 0.005)
                this.nudgeTower(0.0028)
            })
        }
        this.dispatchHud(false)
    }

    getDropProfile() {
        const round = Math.max(1, this.roundNumber)
        const level = Math.min(4, 1 + Math.floor((round - 1) / 1))
        const count = Math.min(5, level + (this.isFeverTurn ? 1 : 0))
        const poolSize = Math.min(HAZARD_TYPES.length, 2 + level * 2)
        const pool = HAZARD_TYPES.slice(0, poolSize)
        const types = []
        for (let index = 0; index < count; index += 1) {
            const pickIndex = (this.turnNumber + this.currentPlayerIndex + index * 2) % pool.length
            types.push(pool[pickIndex])
        }
        const spread = Math.min(150, 42 + round * 18)
        const offsets = types.map((_, index) => {
            if (types.length === 1) return 0
            const ratio = index / Math.max(1, types.length - 1)
            return -spread / 2 + ratio * spread + Phaser.Math.Between(-14, 14)
        })
        return {
            count,
            types,
            offsets,
            force: 2.7 + Math.min(round, 5) * 0.24 + (this.isFeverTurn ? 0.4 : 0),
            label: round <= 1 ? '基本' : round === 2 ? '2個落下' : round === 3 ? '重め追加' : 'ラッシュ',
        }
    }

    nudgeTower(force = 0.0015) {
        this.blocks.forEach((block, index) => {
            if (!block.active || !block.body) return
            MATTER.Body.applyForce(block.body, block.body.position, { x: (index % 2 === 0 ? force : -force), y: 0 })
        })
        if (this.leader?.body) MATTER.Body.applyForce(this.leader.body, this.leader.body.position, { x: force * 2, y: 0 })
    }


    spawnFallingHazard(type = null, x = WORLD.stageCenterX, y = 86, force = 3.0) {
        if (this.phase !== 'settling') return
        const hazardType = type ?? HAZARD_TYPES[(this.turnNumber + this.currentPlayerIndex) % HAZARD_TYPES.length]
        const options = {
            friction: hazardType.shape === 'circle' ? 0.42 : 0.72,
            frictionStatic: hazardType.shape === 'circle' ? 0.24 : 0.42,
            restitution: hazardType.shape === 'circle' ? 0.12 : 0.05,
            density: hazardType.density,
            frictionAir: 0.001,
            chamfer: { radius: 8 },
        }
        const body = hazardType.shape === 'circle'
            ? MATTER.Bodies.circle(x, y, hazardType.radius, options)
            : MATTER.Bodies.rectangle(x, y, hazardType.width, hazardType.height, options)
        this.matter.world.add(body)
        MATTER.Body.setVelocity(body, { x: Phaser.Math.FloatBetween(-0.55, 0.55), y: force })
        MATTER.Body.setAngularVelocity(body, Phaser.Math.FloatBetween(-0.05, 0.05))
        const view = this.add.container(x, y).setDepth(26)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, hazardType.height / 2 + 7, hazardType.width * 0.7, 8)
        const image = this.add.image(0, 0, hazardType.imageKey).setDisplaySize(hazardType.width, hazardType.height)
        view.add([shadow, image])
        this.hazards.push({ body, view, type: hazardType, active: true })
        this.sfx?.lane?.play()
        this.showPlaceBurst(x, y + 38, 0xf0a51f)
    }

    update() {
        this.syncViews()
        this.handleKeyboardInput()
        if (this.phase === 'select') {
            this.updateTargetCursor()
        }
        if (this.phase === 'settling') {
            this.checkCollapseOrSettle()
        }
    }

    syncViews() {
        this.blocks.forEach((block) => {
            if (!block.active || !block.body || !block.view?.active) return
            block.view.setPosition(block.body.position.x, block.body.position.y)
            block.view.setRotation(block.body.angle)
        })
        this.hazards.forEach((hazard) => {
            if (!hazard.active || !hazard.body || !hazard.view?.active) return
            hazard.view.setPosition(hazard.body.position.x, hazard.body.position.y)
            hazard.view.setRotation(hazard.body.angle)
        })
        if (this.leader?.body && this.leader?.view?.active) {
            this.leader.view.setPosition(this.leader.body.position.x, this.leader.body.position.y)
            this.leader.view.setRotation(this.leader.body.angle)
        }
    }

    handleKeyboardInput() {
        const keys = this.keyHandlers
        if (!keys || this.phase !== 'select') return
        const selectable = this.getSelectableBlocks()
        if (selectable.length === 0) return
        if (Phaser.Input.Keyboard.JustDown(keys.LEFT) || Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.W)) {
            this.selectedBlockIndex = (this.selectedBlockIndex - 1 + selectable.length) % selectable.length
            this.sfx?.select?.play()
            this.updateTargetCursor()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.RIGHT) || Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(keys.DOWN) || Phaser.Input.Keyboard.JustDown(keys.S)) {
            this.selectedBlockIndex = (this.selectedBlockIndex + 1) % selectable.length
            this.sfx?.select?.play()
            this.updateTargetCursor()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) {
            this.removeSelectedBlock()
        }
    }

    checkCollapseOrSettle() {
        if (this.time.now - this.dropStartedAt < 760) return
        if (this.isLeaderFallen()) {
            this.handleMiss({ body: this.leader.body })
            return
        }
        const minWait = 980 + Math.max(0, (this.dropProfile?.count ?? 1) - 1) * 170
        if (this.time.now - this.dropStartedAt < minWait) return
        if (this.isTowerStable()) {
            if (this.stableSince === null) this.stableSince = this.time.now
            if (this.time.now - this.stableSince >= this.difficultyConfig.settleMs) {
                this.handleSafe()
            }
        } else {
            this.stableSince = null
            if (this.time.now - this.dropStartedAt > 4300) {
                this.handleSafe()
            }
        }
    }

    isLeaderFallen() {
        if (!this.leader?.body) return true
        const body = this.leader.body
        if (body.position.y > WORLD.faultLineY) return true
        if (body.position.x < WORLD.stageCenterX - WORLD.matWidth / 2 - 56 && body.position.y > WORLD.matTopY - 80) return true
        if (body.position.x > WORLD.stageCenterX + WORLD.matWidth / 2 + 56 && body.position.y > WORLD.matTopY - 80) return true
        return false
    }

    isTowerStable() {
        const movingBlocks = this.blocks.filter((block) => block.active && block.body)
        const movingHazards = this.hazards.filter((hazard) => hazard.active && hazard.body && hazard.body.position.y < WORLD.floorY + 80)
        const allBodies = [...movingBlocks.map((block) => block.body), ...movingHazards.map((hazard) => hazard.body), this.leader?.body].filter(Boolean)
        return allBodies.every((body) => body.speed < 0.13 && Math.abs(body.angularVelocity) < 0.024)
    }

    handleSafe() {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.combo[player] = Math.min((this.combo[player] ?? 0) + 1, 9)
        this.successes[player] += 1
        this.breakPoints[player] += this.pendingBreakPoints
        this.sfx?.safe?.play()
        if (this.pendingBonus) this.sfx?.bonus?.play()
        this.showStamp(WORLD.stageCenterX, 248, 'safe')
        this.showSparkBurst(WORLD.stageCenterX, 292, this.pendingBonus ? 0xffd23d : 0x2da65d)
        this.showScorePopup(WORLD.stageCenterX, 330, `+${this.pendingBreakPoints}`)
        this.showMessage('セーフ！', `+${this.pendingBreakPoints} / C${this.combo[player]}`)
        this.pendingBreakPoints = 0
        this.pendingBonus = false
        this.dispatchHud(true)
        this.time.delayedCall(720, () => this.advanceTurn())
    }

    handleMiss(fallenItem) {
        if (this.phase === 'finished') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.hp[player] = Math.max(0, this.hp[player] - 1)
        this.misses[player] += 1
        this.combo[player] = 0
        this.pendingBreakPoints = 0
        this.pendingBonus = false
        if (this.hp[player] <= 0) this.alive[player] = false
        this.cameras.main.shake(360, 0.01)
        this.sfx?.miss?.play()
        const x = fallenItem.body?.position?.x ?? WORLD.stageCenterX
        const y = Math.min(fallenItem.body?.position?.y ?? 610, 610)
        this.showStamp(x, y, 'miss')
        this.showSparkBurst(x, y, 0xe94834)
        const hpText = this.hp[player] > 0 ? `P${player + 1} HP -1` : `P${player + 1} OUT`
        this.showMessage('くずれた！', hpText)
        this.dispatchHud(true)
        this.updatePlayerViews()
        this.time.delayedCall(1260, () => {
            this.createTower()
            if (this.shouldFinish()) this.finishGame()
            else this.advanceTurn()
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

    showTurnSplash(playerIndex) {
        this.turnSplash?.destroy()
        const container = this.add.container(646, 330).setDepth(95).setAlpha(0).setScale(0.72)
        const plate = this.add.image(0, 0, 'ui-turn-plate').setDisplaySize(520, 168)
        const marker = this.add.image(-168, 8, `player-marker-p${playerIndex + 1}`).setDisplaySize(118, 118)
        const title = this.add.text(16, -26, `P${playerIndex + 1} TURN`, {
            fontFamily: FONT, fontSize: '58px', color: '#1b1b1b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 8,
        }).setOrigin(0.5)
        const sub = this.add.text(18, 42, this.isFeverTurn ? 'FEVER!' : `落下 ${this.dropProfile?.count ?? 1}個`, {
            fontFamily: FONT, fontSize: '24px', color: '#6b3a08', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 5,
        }).setOrigin(0.5)
        container.add([plate, marker, title, sub])
        this.turnSplash = container
        this.tweens.add({
            targets: container, alpha: 1, scaleX: 1, scaleY: 1, duration: 230, ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: container, alpha: 0, scaleX: 1.08, scaleY: 1.08, delay: 520, duration: 260, ease: 'Sine.easeIn',
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
        this.tweens.addCounter({
            from: 12, to: 62, duration: 380, ease: 'Cubic.easeOut',
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
        for (let index = 0; index < 16; index += 1) {
            const angle = (Math.PI * 2 * index) / 16
            const distance = 38 + (index % 5) * 10
            const dot = this.add.graphics().setDepth(64)
            dot.fillStyle(color, 0.95)
            dot.fillCircle(0, 0, 6)
            dot.setPosition(x, y)
            this.tweens.add({
                targets: dot, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance,
                alpha: 0, scaleX: 0.35, scaleY: 0.35, duration: 620, ease: 'Cubic.easeOut', onComplete: () => dot.destroy(),
            })
        }
    }

    showStamp(x, y, type) {
        const key = type === 'safe' ? 'ui-stamp-safe' : 'ui-stamp-miss'
        const stamp = this.add.image(x, y, key).setDepth(66).setScale(0.42).setAlpha(0)
        this.tweens.add({
            targets: stamp, alpha: 1, scaleX: 0.84, scaleY: 0.84, angle: type === 'safe' ? -6 : 7,
            duration: 210, ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: stamp, y: y - 54, alpha: 0, delay: 420, duration: 480, ease: 'Cubic.easeIn', onComplete: () => stamp.destroy() })
            },
        })
    }


    clearBonusTarget() {
        this.bonusBadge?.destroy()
        this.bonusBadge = null
        this.bonusBlock = null
    }

    assignBonusTarget() {
        this.clearBonusTarget()
        const candidates = this.getSelectableBlocks()
            .filter((block) => block.type.key !== 'guard')
            .slice(0, 12)
        if (candidates.length === 0) return
        this.bonusBlock = candidates[Phaser.Math.Between(0, candidates.length - 1)]
        if (!this.bonusBlock?.view?.active) return
        const badge = this.add.image(0, -this.bonusBlock.type.height / 2 - 22, 'ui-bonus-badge')
            .setDisplaySize(92, 38)
            .setDepth(30)
        this.bonusBlock.view.add(badge)
        this.bonusBadge = badge
        this.tweens.add({ targets: badge, y: badge.y - 5, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' })
    }

    showFeverAlert() {
        const alert = this.add.image(WORLD.stageCenterX, 210, 'ui-fever-alert')
            .setDepth(88)
            .setScale(0.34)
            .setAlpha(0)
        this.tweens.add({
            targets: alert,
            alpha: 1,
            scaleX: 0.58,
            scaleY: 0.58,
            delay: 660,
            duration: 180,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: alert, y: 180, alpha: 0, delay: 460, duration: 300, ease: 'Cubic.easeIn', onComplete: () => alert.destroy() })
            },
        })
    }

    showScorePopup(x, y, text) {
        const popup = this.add.text(x, y, text, {
            fontFamily: FONT,
            fontSize: '38px',
            color: '#ffcf3d',
            fontStyle: 'bold',
            stroke: '#7b4a18',
            strokeThickness: 7,
        }).setOrigin(0.5).setDepth(70)
        this.tweens.add({ targets: popup, y: y - 48, alpha: 0, scaleX: 1.18, scaleY: 1.18, duration: 740, ease: 'Cubic.easeOut', onComplete: () => popup.destroy() })
    }

    showMessage(main, hint = '') {
        this.messageText?.setAlpha(1).setScale(1).setText(main)
        this.hintText?.setAlpha(1).setScale(1).setText(hint)
        this.tweens.killTweensOf(this.messageText)
        this.tweens.killTweensOf(this.hintText)
        this.tweens.add({ targets: [this.messageText, this.hintText], scaleX: 1.02, scaleY: 1.02, yoyo: true, duration: 120, ease: 'Sine.easeOut' })
    }

    finishGame() {
        if (this.phase === 'finished') return
        this.phase = 'finished'
        this.cursorView?.destroy()
        this.cursorView = null
        this.showMessage('結果発表！', '生き残り + 落下成功で順位')
        this.updatePlayerViews()
        this.dispatchHud(true)
        const results = Array.from({ length: this.playerCount }, (_, index) => {
            const survivalBonus = this.alive[index] ? 12000 : 0
            const hpBonus = this.hp[index] * 1400
            const breakBonus = this.breakPoints[index]
            const missPenalty = this.misses[index] * 320
            return { player: index + 1, score: survivalBonus + hpBonus + breakBonus - missPenalty }
        })
        this.time.delayedCall(900, () => runtimeOnFinish({ results }))
    }

    dispatchHud(isAnswerChecked = false) {
        const selected = this.getSelectedBlock()
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
                scores: this.breakPoints.map((points, index) => (this.alive[index] ? points : -999)),
                currentScore: this.breakPoints[this.currentPlayerIndex] ?? 0,
                combo: this.combo[this.currentPlayerIndex] ?? 0,
                timeLeft: Math.max(0, this.maxTurns - this.turnNumber),
                isAnswerChecked,
                nextButtonLabel: '次の人へ',
                actionButtonLabel: this.phase === 'settling' ? '判定中' : '落とす！',
                isActionLocked: this.phase === 'settling' || this.phase === 'finished',
                ruleName: '逆ジェンガバトル',
                selectedItemLabel: `落下 ${this.dropProfile?.count ?? 1}個`,
                selectedItemDescription: selected === this.bonusBlock ? 'BONUS' : (this.isFeverTurn ? 'FEVER' : `DROP x${this.dropProfile?.count ?? 1}`),
                selectedItemKey: (this.dropProfile?.types?.[0]?.key ?? 'can'),
                selectedLaneIndex: selected ? selected.layer + 1 : 0,
                aliveCount,
                difficultyLabel: this.difficultyConfig.label,
            },
        }))
    }
}
