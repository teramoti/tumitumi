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
    matWidth: 560,
    matHeight: 44,
    floorY: 688,
    faultLineY: 655,
}

const DROP_LANE_OFFSETS = [-220, -110, 0, 110, 220]
const PLAYER_COLORS = [0xe94834, 0x2f73c9, 0x2da65d, 0xf0a51f]
const PLAYER_DARK_COLORS = [0xa22d24, 0x1e4f91, 0x1f7143, 0x9b6413]

const DIFFICULTY_CONFIG = {
    easy: { gravity: 0.92, settleMs: 520, label: 'ゆるめ', maxDrop: 3 },
    normal: { gravity: 1.02, settleMs: 560, label: 'ふつう', maxDrop: 4 },
    hard: { gravity: 1.12, settleMs: 620, label: 'ぐらぐら', maxDrop: 5 },
}

const ANIMAL_TYPES = [
    { key: 'cat', label: 'ねこ', imageKey: 'animal-cat', width: 118, height: 72, density: 0.0042, points: 110 },
    { key: 'dog', label: 'いぬ', imageKey: 'animal-dog', width: 122, height: 72, density: 0.0044, points: 120 },
    { key: 'panda', label: 'パンダ', imageKey: 'animal-panda', width: 124, height: 76, density: 0.0046, points: 130 },
    { key: 'turtle', label: 'カメ', imageKey: 'animal-turtle', width: 128, height: 66, density: 0.0052, points: 145 },
    { key: 'penguin', label: 'ペンギン', imageKey: 'animal-penguin', width: 78, height: 104, density: 0.0036, points: 165 },
    { key: 'seal', label: 'アザラシ', imageKey: 'animal-seal', width: 126, height: 66, density: 0.004, points: 175 },
    { key: 'elephant', label: 'ぞう', imageKey: 'animal-elephant', width: 156, height: 82, density: 0.0056, points: 210 },
    { key: 'giraffe', label: 'キリン', imageKey: 'animal-giraffe', width: 92, height: 132, density: 0.0038, points: 240 },
]

const DROP_PLANS = [
    { key: 'safe', label: 'SAFE', countBonus: -1, forceBonus: -0.16, spreadBonus: -18, scoreMultiplier: 0.78, risk: 1, color: 0x2da65d },
    { key: 'basic', label: 'BASIC', countBonus: 0, forceBonus: 0, spreadBonus: 0, scoreMultiplier: 1, risk: 2, color: 0xf0a51f },
    { key: 'attack', label: 'ATTACK', countBonus: 1, forceBonus: 0.42, spreadBonus: 36, scoreMultiplier: 1.48, risk: 3, color: 0xe94834 },
]

const TURN_SELECT_MS = 4800

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default class TowerCrashScene extends Phaser.Scene {
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
        this.selectedPlanIndex = 1
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
        this.cursorView = null
        this.turnStartedAt = 0
        this.dropStartedAt = 0
        this.stableSince = null
        this.roundStormDone = new Set()
        this.roundStormStartedAt = 0
        this.roundStormStableSince = null
        this.attackStormStartedAt = 0
        this.attackStormStableSince = null
        this.attackStormCount = 0
        this.keyHandlers = null
        this.sfx = null
    }

    preload() {
        this.load.image('animal-cat', '/assets/animal_cat.png')
        this.load.image('animal-dog', '/assets/animal_dog.png')
        this.load.image('animal-panda', '/assets/animal_panda.png')
        this.load.image('animal-turtle', '/assets/animal_turtle.png')
        this.load.image('animal-penguin', '/assets/animal_penguin.png')
        this.load.image('animal-elephant', '/assets/animal_elephant.png')
        this.load.image('animal-giraffe', '/assets/animal_giraffe.png')
        this.load.image('animal-seal', '/assets/animal_seal.png')
        this.load.image('ui-stamp-safe', '/assets/ui_stamp_safe.png')
        this.load.image('ui-stamp-miss', '/assets/ui_stamp_miss.png')
        this.load.image('ui-turn-plate', '/assets/ui_turn_plate.png')
        this.load.image('ui-controls-hint', '/assets/ui_controls_animal.png')
        this.load.image('ui-bonus-badge', '/assets/ui_bonus_badge.png')
        this.load.image('ui-fever-alert', '/assets/ui_fever_alert.png')
        this.load.image('ui-combo-badge', '/assets/ui_combo_badge.png')
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
        this.sfx = {
            place: this.sound.add('se-place', { volume: 0.58 }),
            safe: this.sound.add('se-safe', { volume: 0.62 }),
            miss: this.sound.add('se-miss', { volume: 0.7 }),
            turn: this.sound.add('se-turn', { volume: 0.52 }),
            select: this.sound.add('se-select', { volume: 0.42 }),
            lane: this.sound.add('se-lane', { volume: 0.36 }),
            bonus: this.sound.add('se-bonus', { volume: 0.58 }),
        }

        this.resetArena()
        this.showMessage('どうぶつタワーバトル', '最初は空の台からスタート')
        this.time.delayedCall(620, () => this.beginTurn(0))
    }

    registerExternalCommands() {
        this.commandHandler = (event) => {
            const type = event.detail?.type
            if (type === 'answer' && this.phase === 'select') this.dropSelectedLoad()
            if (type === 'next' && this.phase === 'message') this.advanceTurn()
        }
        runtimeHudTarget?.addEventListener('game-command', this.commandHandler)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            runtimeHudTarget?.removeEventListener('game-command', this.commandHandler)
        })
    }

    registerKeyboard() {
        this.keyHandlers = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER')
    }

    playSfx(key) {
        try {
            this.sfx?.[key]?.play()
        } catch {
            // 音声ロック時もゲーム進行を止めない。
        }
    }

    drawBackground() {
        this.cameras.main.setBackgroundColor('#7bdcff')
        const bg = this.add.graphics()
        bg.fillStyle(0x7bdcff, 1)
        bg.fillRect(0, 0, WORLD.width, WORLD.height)
        bg.fillStyle(0xdff6ff, 1)
        bg.fillRect(0, 0, WORLD.width, 248)
        for (let index = 0; index < 12; index += 1) {
            const x = 60 + index * 104
            const y = 48 + (index % 3) * 32
            bg.fillStyle(0xffffff, 0.27)
            bg.fillCircle(x, y, 14)
            bg.fillCircle(x + 18, y + 6, 16)
            bg.fillCircle(x - 14, y + 8, 12)
        }

        bg.fillStyle(0xfff9e8, 0.94)
        bg.fillRoundedRect(408, 18, 485, 132, 24)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(408, 18, 485, 132, 24)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(432, 32, 130, 34, 14)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(432, 32, 130, 34, 14)
        this.add.text(497, 49, 'TURN', {
            fontFamily: FONT,
            fontSize: '18px', color: '#8b5d24', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)

        bg.fillStyle(0xfffbef, 0.94)
        bg.fillRoundedRect(980, 96, 270, 330, 26)
        bg.lineStyle(5, 0x8f5d28, 1)
        bg.strokeRoundedRect(980, 96, 270, 330, 26)
        bg.fillStyle(0xffdf89, 1)
        bg.fillRoundedRect(1022, 114, 186, 34, 16)
        bg.lineStyle(3, 0xb57a2e, 1)
        bg.strokeRoundedRect(1022, 114, 186, 34, 16)
        this.add.text(1115, 131, 'W/S  作戦', {
            fontFamily: FONT,
            fontSize: '18px', color: '#8b5d24', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)
        this.add.image(1115, 404, 'ui-controls-hint').setDisplaySize(220, 46).setAlpha(0.95)

        bg.fillStyle(0xffe28a, 1)
        bg.fillRect(0, 618, WORLD.width, 102)
        bg.fillStyle(0xd5892f, 1)
        bg.fillRect(0, 650, WORLD.width, 70)
        bg.lineStyle(7, 0x7b4a18, 1)
        bg.beginPath(); bg.moveTo(0, 618); bg.lineTo(WORLD.width, 618); bg.strokePath()

        const matX = WORLD.stageCenterX - WORLD.matWidth / 2
        bg.fillStyle(0x5cb5ff, 1)
        bg.fillRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 18)
        bg.fillStyle(0xeef7ff, 1)
        bg.fillRoundedRect(matX + 24, WORLD.matTopY + 9, WORLD.matWidth - 48, 10, 8)
        bg.lineStyle(6, 0x1f4f91, 1)
        bg.strokeRoundedRect(matX, WORLD.matTopY, WORLD.matWidth, WORLD.matHeight, 18)
        this.add.text(WORLD.stageCenterX, WORLD.matTopY + 23, '台から落ちたらミス', {
            fontFamily: FONT,
            fontSize: '18px', color: '#17365e', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
        }).setOrigin(0.5)
    }

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
        this.messageText = this.add.text(650, 76, '', {
            fontFamily: FONT, fontSize: '38px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 8, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.hintText = this.add.text(650, 116, '', {
            fontFamily: FONT, fontSize: '22px', color: '#6b3a08', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.turnText = this.add.text(650, 143, '', {
            fontFamily: FONT, fontSize: '20px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 420, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.targetText = this.add.text(1115, 354, '', {
            fontFamily: FONT, fontSize: '21px', color: '#1b1b1b', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 5, align: 'center', wordWrap: { width: 220, useAdvancedWrap: true },
        }).setOrigin(0.5).setDepth(55)
        this.timerText = this.add.text(1220, 354, '', {
            fontFamily: FONT, fontSize: '28px', color: '#e94834', fontStyle: 'bold',
            stroke: '#ffffff', strokeThickness: 6, align: 'center',
        }).setOrigin(0.5).setDepth(55)
    }

    createPlayerViews() {
        for (let index = 0; index < this.playerCount; index += 1) {
            const x = 150 + index * 82
            const view = this.add.container(x, 673).setDepth(40)
            const shadow = this.add.graphics()
            shadow.fillStyle(0x000000, 0.16)
            shadow.fillEllipse(0, 30, 66, 15)
            const marker = this.add.image(0, -8, `player-marker-p${index + 1}`).setDisplaySize(86, 86)
            const label = this.add.text(0, 50, `P${index + 1}`, {
                fontFamily: FONT, fontSize: '19px', color: '#1b1b1b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
            }).setOrigin(0.5)
            view.add([shadow, marker, label])
            this.playerViews.push(view)
        }
    }

    resetArena() {
        this.animals.forEach((animal) => {
            if (animal.body) this.matter.world.remove(animal.body)
            animal.view?.destroy()
        })
        this.animals = []
        this.cursorView?.destroy()
        this.cursorView = null
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.stableSince = null
        this.droppedThisTurn = []
        this.towerPressure = 0
    }

    createAnimalBody(type, x, y, force = 2.7, owner = null, storm = false) {
        const body = MATTER.Bodies.rectangle(x, y, type.width, type.height, {
            friction: 0.86,
            frictionStatic: 0.64,
            restitution: 0.04,
            density: type.density,
            frictionAir: 0.0015,
            chamfer: { radius: 8 },
        })
        this.matter.world.add(body)
        MATTER.Body.setVelocity(body, { x: Phaser.Math.FloatBetween(-0.35, 0.35), y: force })
        MATTER.Body.setAngularVelocity(body, Phaser.Math.FloatBetween(-0.045, 0.045))
        const view = this.add.container(x, y).setDepth(26)
        const shadow = this.add.graphics()
        shadow.fillStyle(0x000000, 0.12)
        shadow.fillEllipse(0, type.height / 2 + 7, type.width * 0.72, 8)
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

    getSelectedLaneX() {
        return WORLD.stageCenterX + DROP_LANE_OFFSETS[this.selectedLaneIndex]
    }

    createLaneViews() {
        this.destroyLaneViews()
        DROP_LANE_OFFSETS.forEach((offset, index) => {
            const x = WORLD.stageCenterX + offset
            const lane = this.add.container(x, WORLD.matTopY - 24).setDepth(42)
            const g = this.add.graphics()
            const hint = this.add.text(0, 18, index === this.selectedLaneIndex ? 'TARGET' : '', {
                fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#7b4a18', strokeThickness: 3,
            }).setOrigin(0.5)
            lane.add([g, hint])
            this.laneViews.push({ lane, g, hint, index })
        })
        this.updateLaneViews()
    }

    destroyLaneViews() {
        this.laneViews.forEach(({ lane }) => lane.destroy())
        this.laneViews = []
    }

    updateLaneViews() {
        this.laneViews.forEach(({ g, hint, index }) => {
            const selected = index === this.selectedLaneIndex
            const bonus = index === this.bonusLaneIndex
            const color = bonus ? 0xffcf3d : (PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffffff)
            g.clear()
            g.fillStyle(selected ? color : 0xffffff, selected ? 0.2 : 0.06)
            g.fillRoundedRect(-42, -232, 84, 246, 17)
            g.lineStyle(selected ? 6 : 2, selected ? color : 0xffffff, selected ? 1 : 0.26)
            g.strokeRoundedRect(-42, -232, 84, 246, 17)
            if (selected) {
                g.fillStyle(color, 0.95)
                g.fillTriangle(-18, -210, 18, -210, 0, -180)
                g.fillRoundedRect(-24, -176, 48, 118, 22)
                g.fillTriangle(-18, -58, 18, -58, 0, -26)
            }
            if (bonus) {
                g.fillStyle(0xffcf3d, selected ? 0.9 : 0.55)
                g.fillRoundedRect(-30, -224, 60, 24, 12)
            }
            hint.setText(selected ? 'TARGET' : '')
        })
    }

    createLoadCards() {
        this.destroyLoadCards()
        DROP_PLANS.forEach((plan, index) => {
            const y = 186 + index * 58
            const profile = this.getDropProfileForPlan(index)
            const card = this.add.container(1110, y).setDepth(52)
            const bg = this.add.graphics()
            const icon = this.add.image(-72, 0, profile.types[0].imageKey).setDisplaySize(44, 34)
            const label = this.add.text(-22, -10, plan.label, {
                fontFamily: FONT, fontSize: '19px', color: '#1b1b1b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
            }).setOrigin(0, 0.5)
            const value = this.add.text(-22, 14, `x${profile.count}`, {
                fontFamily: FONT, fontSize: '16px', color: '#6b3a08', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3,
            }).setOrigin(0, 0.5)
            card.add([bg, icon, label, value])
            this.loadCards.push({ card, bg, index, plan })
        })
        this.updateLoadCards()
    }

    destroyLoadCards() {
        this.loadCards.forEach(({ card }) => card.destroy())
        this.loadCards = []
    }

    selectPlan(index) {
        if (this.phase !== 'select') return
        this.selectedPlanIndex = clamp(index, 0, DROP_PLANS.length - 1)
        this.dropProfile = this.getDropProfile()
        this.playSfx('select')
        this.updateLoadCards()
        this.updateTargetCursor()
        this.dispatchHud(false)
    }

    updateLoadCards() {
        this.loadCards.forEach(({ bg, index, plan, card }) => {
            const selected = index === this.selectedPlanIndex
            bg.clear()
            bg.fillStyle(selected ? plan.color : 0xfffbef, selected ? 0.95 : 0.82)
            bg.fillRoundedRect(-96, -23, 192, 46, 16)
            bg.lineStyle(selected ? 5 : 3, selected ? 0xffffff : 0x8f5d28, 0.95)
            bg.strokeRoundedRect(-96, -23, 192, 46, 16)
            card.setScale(selected ? 1.05 : 1)
        })
        const profile = this.dropProfile ?? this.getDropProfile()
        this.targetText?.setText(`${profile.label} / ${profile.count} DROP`)
    }

    updateTargetCursor() {
        if (!this.cursorView) this.cursorView = this.add.graphics().setDepth(44)
        this.cursorView.clear()
        const laneX = this.getSelectedLaneX()
        const topY = this.getTowerTopY()
        const color = this.selectedLaneIndex === this.bonusLaneIndex ? 0xffcf3d : (PLAYER_COLORS[this.currentPlayerIndex] ?? 0xffffff)
        this.cursorView.lineStyle(6, color, 0.95)
        this.cursorView.strokeRoundedRect(laneX - 42, topY - 236, 84, 244, 18)
        this.cursorView.fillStyle(color, 0.12)
        this.cursorView.fillRoundedRect(laneX - 42, topY - 236, 84, 244, 18)
        this.cursorView.lineStyle(5, color, 0.95)
        this.cursorView.beginPath()
        this.cursorView.moveTo(laneX, topY - 226)
        this.cursorView.lineTo(laneX, topY - 38)
        this.cursorView.strokePath()
        this.cursorView.fillStyle(color, 0.95)
        this.cursorView.fillTriangle(laneX - 15, topY - 54, laneX + 15, topY - 54, laneX, topY - 28)
        this.updateLaneViews()
        this.updateLoadCards()
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
            this.tweens.add({ targets: view, x: targetX, y: targetY, scaleX: scale, scaleY: scale, alpha, duration: 300, ease: 'Back.easeOut' })
        })
    }

    beginTurn(preferredIndex = this.currentPlayerIndex) {
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
        this.selectedLaneIndex = clamp(this.selectedLaneIndex, 0, DROP_LANE_OFFSETS.length - 1)
        this.selectedPlanIndex = clamp(this.selectedPlanIndex, 0, DROP_PLANS.length - 1)
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

    enterSelectPhase() {
        if (this.phase === 'finished') return
        this.phase = 'select'
        this.turnStartedAt = this.time.now
        this.stableSince = null
        this.dropProfile = this.getDropProfile()
        this.createLaneViews()
        this.createLoadCards()
        this.showTurnSplash(this.currentPlayerIndex)
        this.showMessage(`P${this.currentPlayerIndex + 1} の番`, `${this.dropProfile.label} / ${this.dropProfile.count}個`)
        this.updateTargetCursor()
        this.dispatchHud(false)
    }

    startRoundDrop() {
        this.phase = 'roundDrop'
        this.roundStormDone.add(this.roundNumber)
        this.roundStormStartedAt = this.time.now
        this.roundStormStableSince = null
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.cursorView?.clear()
        const count = Math.min(this.difficultyConfig.maxDrop + 2, 1 + this.roundNumber)
        this.showMessage('一巡おわり！', `上から追加 ${count}匹`)
        this.time.delayedCall(240, () => this.spawnRoundAnimals(count, 2.7 + this.roundNumber * 0.16))
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
        this.showMessage('ATTACK DROP', `追加 ${this.attackStormCount}個`)
        this.time.delayedCall(220, () => this.spawnStormAnimals(this.attackStormCount, 2.95 + this.roundNumber * 0.16, true))
        this.dispatchHud(false)
    }


    spawnRoundAnimals(count, force) {
        for (let index = 0; index < count; index += 1) {
            const laneIndex = (this.roundNumber + index * 2) % DROP_LANE_OFFSETS.length
            const type = ANIMAL_TYPES[(this.roundNumber * 3 + index * 2) % ANIMAL_TYPES.length]
            const x = WORLD.stageCenterX + DROP_LANE_OFFSETS[laneIndex] + Phaser.Math.Between(-18, 18)
            const y = Math.max(54, this.getTowerTopY() - 350 - index * 38)
            this.time.delayedCall(index * 180, () => this.createAnimalBody(type, x, y, force, null, true))
        }
        this.time.delayedCall(Math.max(360, count * 180), () => this.nudgeTower(0.0008 + this.roundNumber * 0.00022))
    }

    spawnStormAnimals(count, force, storm = true) {
        for (let index = 0; index < count; index += 1) {
            const laneIndex = (this.selectedLaneIndex + index + 1) % DROP_LANE_OFFSETS.length
            const type = ANIMAL_TYPES[(this.turnNumber + this.roundNumber + index * 2) % ANIMAL_TYPES.length]
            const x = WORLD.stageCenterX + DROP_LANE_OFFSETS[laneIndex] + Phaser.Math.Between(-24, 24)
            const y = Math.max(56, this.getTowerTopY() - 330 - index * 32)
            this.time.delayedCall(index * 150, () => this.createAnimalBody(type, x, y, force, null, storm))
        }
    }

    dropSelectedLoad() {
        if (this.phase !== 'select') return
        this.phase = 'settling'
        this.cursorView?.clear()
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.timerText?.setText('')
        this.dropStartedAt = this.time.now
        this.stableSince = null
        this.droppedThisTurn = []
        const profile = this.dropProfile ?? this.getDropProfile()
        const isBonus = this.selectedLaneIndex === this.bonusLaneIndex
        const comboRate = 1 + Math.min(this.combo[this.currentPlayerIndex] ?? 0, 5) * 0.14
        this.pendingBonus = isBonus
        this.pendingScore = Math.round((profile.score + (isBonus ? 240 : 0)) * comboRate)
        const baseX = this.getSelectedLaneX()
        const baseY = Math.max(72, this.getTowerTopY() - 300)
        this.playSfx('place')
        if (isBonus) this.playSfx('bonus')
        this.showMessage('つむ！', `${profile.count}個 / ${profile.label}`)
        profile.types.forEach((type, index) => {
            this.time.delayedCall(150 * index, () => {
                this.createAnimalBody(type, baseX + profile.offsets[index], baseY - index * 34, profile.force, this.currentPlayerIndex, false)
            })
        })
        this.time.delayedCall(420, () => this.nudgeTower(0.0009 + profile.risk * 0.00042 + this.towerPressure * 0.0002))
        this.dispatchHud(false)
    }

    getDropProfile() {
        return this.getDropProfileForPlan(this.selectedPlanIndex)
    }

    getDropProfileForPlan(planIndex) {
        const plan = DROP_PLANS[planIndex] ?? DROP_PLANS[1]
        const round = Math.max(1, this.roundNumber)
        const baseCount = Math.min(this.difficultyConfig.maxDrop, 1 + Math.floor((round - 1) / 1))
        const count = clamp(baseCount + plan.countBonus, 1, 6)
        const poolSize = Math.min(ANIMAL_TYPES.length, 3 + round * 2)
        const pool = ANIMAL_TYPES.slice(0, poolSize)
        const types = []
        for (let index = 0; index < count; index += 1) {
            const pickIndex = (this.turnNumber + this.currentPlayerIndex + this.selectedLaneIndex + planIndex * 2 + index * 3) % pool.length
            types.push(pool[pickIndex])
        }
        const spread = Math.max(10, Math.min(165, 30 + round * 15 + plan.spreadBonus))
        const offsets = types.map((_, index) => {
            if (types.length === 1) return 0
            const ratio = index / Math.max(1, types.length - 1)
            return -spread / 2 + ratio * spread + Phaser.Math.Between(-10, 10)
        })
        const basePoints = types.reduce((sum, type) => sum + (type.points ?? 100), 0)
        return {
            plan,
            label: plan.label,
            key: plan.key,
            hudKey: types[0]?.key ?? 'cat',
            count,
            types,
            offsets,
            force: 2.48 + Math.min(round, 5) * 0.2 + plan.forceBonus,
            risk: plan.risk,
            score: Math.round(basePoints * plan.scoreMultiplier),
        }
    }

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

    updateTurnTimer() {
        const leftMs = Math.max(0, TURN_SELECT_MS - (this.time.now - this.turnStartedAt))
        const left = Math.ceil(leftMs / 1000)
        this.timerText?.setText(`${left}`)
        if (leftMs <= 0) this.dropSelectedLoad()
    }

    handleKeyboardInput() {
        const keys = this.keyHandlers
        if (!keys) return
        if (this.phase === 'message') {
            if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) this.advanceTurn()
            return
        }
        if (this.phase !== 'select') return
        if (Phaser.Input.Keyboard.JustDown(keys.LEFT) || Phaser.Input.Keyboard.JustDown(keys.A)) {
            this.selectedLaneIndex = (this.selectedLaneIndex - 1 + DROP_LANE_OFFSETS.length) % DROP_LANE_OFFSETS.length
            this.playSfx('select')
            this.updateTargetCursor()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.RIGHT) || Phaser.Input.Keyboard.JustDown(keys.D)) {
            this.selectedLaneIndex = (this.selectedLaneIndex + 1) % DROP_LANE_OFFSETS.length
            this.playSfx('select')
            this.updateTargetCursor()
            this.dispatchHud(false)
        }
        if (Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.W)) this.selectPlan((this.selectedPlanIndex - 1 + DROP_PLANS.length) % DROP_PLANS.length)
        if (Phaser.Input.Keyboard.JustDown(keys.DOWN) || Phaser.Input.Keyboard.JustDown(keys.S)) this.selectPlan((this.selectedPlanIndex + 1) % DROP_PLANS.length)
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER)) this.dropSelectedLoad()
    }

    checkPlayerDropSettle() {
        if (this.time.now - this.dropStartedAt < 720) return
        const fallen = this.getFallenAnimal()
        if (fallen) {
            this.handleMiss(fallen)
            return
        }
        const minWait = 760 + Math.max(0, (this.dropProfile?.count ?? 1) - 1) * 120
        if (this.time.now - this.dropStartedAt < minWait) return
        if (this.isTowerStable()) {
            if (this.stableSince === null) this.stableSince = this.time.now
            if (this.time.now - this.stableSince >= this.difficultyConfig.settleMs) this.handleSafe()
        } else {
            this.stableSince = null
            if (this.time.now - this.dropStartedAt > 3000) this.handleSafe()
        }
    }

    checkStormSettle(kind) {
        const startedAt = kind === 'round' ? this.roundStormStartedAt : this.attackStormStartedAt
        if (this.time.now - startedAt < 900) return
        const fallen = this.getFallenAnimal()
        if (fallen) {
            if (kind === 'attack') this.handleMiss(fallen)
            else {
                this.removeFallenAnimals()
                this.time.delayedCall(280, () => this.beginTurn())
            }
            return
        }
        if (this.isTowerStable()) {
            if (kind === 'round') {
                if (this.roundStormStableSince === null) this.roundStormStableSince = this.time.now
                if (this.time.now - this.roundStormStableSince > 520) this.beginTurn()
            } else {
                if (this.attackStormStableSince === null) this.attackStormStableSince = this.time.now
                if (this.time.now - this.attackStormStableSince > 520) this.enterSelectPhase()
            }
        } else if (this.time.now - startedAt > 3300) {
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

    handleSafe() {
        if (this.phase !== 'settling') return
        this.phase = 'message'
        const player = this.currentPlayerIndex
        this.combo[player] = Math.min((this.combo[player] ?? 0) + 1, 9)
        this.successes[player] += 1
        this.dropPoints[player] += this.pendingScore
        this.towerPressure = Math.min(10, this.towerPressure + Math.max(1, this.dropProfile?.risk ?? 1))
        const attackAmount = this.queueAttack(player)
        this.playSfx('safe')
        if (this.pendingBonus) this.playSfx('bonus')
        this.showStamp(WORLD.stageCenterX, 250, 'safe')
        this.showScorePopup(WORLD.stageCenterX, 328, `+${this.pendingScore}`)
        this.showMessage('セーフ！', attackAmount > 0 ? `NEXT +${attackAmount}` : `+${this.pendingScore} / C${this.combo[player]}`)
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
        this.cameras.main.shake(360, 0.01)
        this.playSfx('miss')
        const x = fallenAnimal?.body?.position?.x ?? WORLD.stageCenterX
        const y = Math.min(fallenAnimal?.body?.position?.y ?? 610, 610)
        this.showStamp(x, y, 'miss')
        this.showSparkBurst(x, y, 0xe94834)
        this.showMessage('ミス！', this.hp[player] > 0 ? `P${player + 1} HP -1` : `P${player + 1} OUT`)
        this.removeFallenAnimals()
        this.dispatchHud(true)
        this.updatePlayerViews()
        if (this.animals.length === 0) this.towerPressure = 0
    }

    advanceTurn() {
        if (this.phase === 'finished') return
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

    showMessage(main, sub = '') {
        this.messageText?.setText(main)
        this.hintText?.setText(sub)
        this.tweens.add({ targets: [this.messageText, this.hintText], scaleX: 1.04, scaleY: 1.04, yoyo: true, duration: 120 })
    }

    showTurnSplash(playerIndex) {
        const plate = this.add.image(650, 220, 'ui-turn-plate').setDisplaySize(390, 120).setDepth(70).setAlpha(0)
        const marker = this.add.image(560, 220, `player-marker-p${playerIndex + 1}`).setDisplaySize(90, 90).setDepth(71).setAlpha(0)
        const text = this.add.text(675, 220, `P${playerIndex + 1} TURN`, {
            fontFamily: FONT, fontSize: '42px', color: '#ffffff', fontStyle: 'bold', stroke: '#7b4a18', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(72).setAlpha(0)
        this.tweens.add({ targets: [plate, marker, text], alpha: 1, scaleX: 1.06, scaleY: 1.06, duration: 120, yoyo: true, hold: 360, onComplete: () => { plate.destroy(); marker.destroy(); text.destroy() } })
    }

    showStamp(x, y, type) {
        const key = type === 'safe' ? 'ui-stamp-safe' : 'ui-stamp-miss'
        const img = this.add.image(x, y, key).setDisplaySize(170, 95).setDepth(75).setAlpha(0).setScale(0.55)
        this.tweens.add({ targets: img, alpha: 1, scaleX: 1, scaleY: 1, angle: type === 'safe' ? -6 : 5, duration: 140, ease: 'Back.easeOut' })
        this.tweens.add({ targets: img, alpha: 0, delay: 760, duration: 220, onComplete: () => img.destroy() })
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

    showSparkBurst(x, y, color) {
        for (let index = 0; index < 12; index += 1) {
            const dot = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.95).setDepth(78)
            const angle = (Math.PI * 2 * index) / 12
            this.tweens.add({ targets: dot, x: x + Math.cos(angle) * Phaser.Math.Between(42, 92), y: y + Math.sin(angle) * Phaser.Math.Between(28, 76), alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => dot.destroy() })
        }
    }

    dispatchHud(isAnswerChecked = false) {
        const player = this.currentPlayerIndex
        const profile = this.dropProfile ?? this.getDropProfile()
        const currentScore = this.calculateScoreForPlayer(player)
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
                nextButtonLabel: this.shouldFinish() ? '結果へ' : '次の人へ',
                actionButtonLabel: this.phase === 'select' ? 'つむ！' : '判定中',
                ruleName: 'どうぶつタワーバトル',
                selectedItemLabel: `${profile.label} x${profile.count}`,
                selectedItemDescription: this.phase === 'roundDrop' ? 'ROUND DROP' : this.phase === 'attackDrop' ? `ATTACK ${this.attackStormCount}` : (this.selectedLaneIndex === this.bonusLaneIndex ? 'BONUS' : `DROP ${profile.count}`),
                selectedItemKey: profile.hudKey,
                selectedLaneIndex: undefined,
                aliveCount: this.alive.filter(Boolean).length,
                difficultyLabel: this.difficultyConfig.label,
            },
        }))
    }

    calculateScoreForPlayer(index) {
        const survivalBonus = this.alive[index] ? 700 : 0
        const hpBonus = (this.hp[index] ?? 0) * 260
        const missPenalty = (this.misses[index] ?? 0) * 160
        return Math.max(0, Math.round((this.dropPoints[index] ?? 0) + survivalBonus + hpBonus - missPenalty))
    }

    finishGame() {
        if (this.phase === 'finished') return
        this.phase = 'finished'
        this.destroyLaneViews()
        this.destroyLoadCards()
        this.cursorView?.clear()
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
        this.showMessage('FINISH!', '結果へ')
        this.dispatchHud(true)
        this.time.delayedCall(700, () => runtimeOnFinish({ results }))
    }
}
