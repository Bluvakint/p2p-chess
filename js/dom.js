// Кэшируем все DOM-элементы, чтобы не делать querySelector повторно
export const dom = {
    // Setup
    setupScreen: document.getElementById('setup-screen'),
    setupTitle: document.getElementById('setup-title'),
    colorOptions: document.getElementById('color-options'),
    timeOptions: document.getElementById('time-options'),
    colorHint: document.getElementById('color-hint'),
    timeHint: document.getElementById('time-hint'),
    linkBox: document.getElementById('link-box'),
    roomLink: document.getElementById('room-link'),
    copyLinkBtn: document.getElementById('copy-link-btn'),
    readyStatus: document.getElementById('ready-status'),
    readyBtn: document.getElementById('ready-btn'),
    hostReadyBadge: document.getElementById('host-ready-badge'),
    guestReadyBadge: document.getElementById('guest-ready-badge'),
    disconnectWarning: document.getElementById('disconnect-warning'),
    
    // Game
    gameScreen: document.getElementById('game-screen'),
    board: document.getElementById('board'),
    myInfo: document.getElementById('my-info'),
    opponentInfo: document.getElementById('opponent-info'),
    myMaster: document.getElementById('my-master'),
    opponentMaster: document.getElementById('opponent-master'),
    myColorIndicator: document.getElementById('my-color-indicator'),
    myColorText: document.getElementById('my-color-text'),
    opponentColorIndicator: document.getElementById('opponent-color-indicator'),
    opponentColorText: document.getElementById('opponent-color-text'),
    myStatus: document.getElementById('my-status'),
    opponentStatus: document.getElementById('opponent-status'),
    clockTop: document.getElementById('clock-top'),
    clockBottom: document.getElementById('clock-bottom'),
    clockTopTime: document.getElementById('clock-top-time'),
    clockBottomTime: document.getElementById('clock-bottom-time'),
    resignBtn: document.getElementById('resign-btn'),

    
    // Notation
    notationList: document.getElementById('notation-list'),
    copyNotationBtn: document.getElementById('copy-notation-btn'),
    
    // Modal
    modalOverlay: document.getElementById('modal-overlay'),
    modalIcon: document.getElementById('modal-icon'),
    modalTitle: document.getElementById('modal-title'),
    modalText: document.getElementById('modal-text'),
    modalRestartBtn: document.getElementById('modal-restart-btn'),
    modalWaitBtn: document.getElementById('modal-wait-btn'),
    modalLeaveBtn: document.getElementById('modal-leave-btn'),
    
    // Toast
    toast: document.getElementById('toast'),

    customTimeInput: document.getElementById('custom-time-input'),
    customTimeValue: document.getElementById('custom-time-value'),

    // Кнопки
    drawBtn: document.getElementById('draw-btn'),
    
    // Модалка превращения
    promotionModal: document.getElementById('promotion-modal'),
    promotionOptions: document.getElementById('promotion-options'),

    showQrBtn: document.getElementById('show-qr-btn'),
    lastGameSection: document.getElementById('last-game-section'),
    lastGameNotation: document.getElementById('last-game-notation'),
    copyLastGameBtn: document.getElementById('copy-last-game-btn'),
    qrModal: document.getElementById('qr-modal'),
    qrcodeContainer: document.getElementById('qrcode-container'),
    closeQrBtn: document.getElementById('close-qr-btn')
};