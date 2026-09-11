// Кэшируем все DOM-элементы, чтобы не делать querySelector повторно
export const dom = {
    // Setup
    setupScreen: null,
    setupTitle: null,
    colorOptions: null,
    timeOptions: null,
    colorHint: null,
    timeHint: null,
    linkBox: null,
    roomLink: null,
    copyLinkBtn: null,
    readyStatus: null,
    readyBtn: null,
    hostReadyBadge: null,
    guestReadyBadge: null,
    disconnectWarning: null,
    
    // Game
    gameScreen: null,
    board: null,
    myInfo: null,
    opponentInfo: null,
    myMaster: null,
    opponentMaster: null,
    myColorIndicator: null,
    myColorText: null,
    opponentColorIndicator: null,
    opponentColorText: null,
    myStatus: null,
    opponentStatus: null,
    clockTop: null,
    clockBottom: null,
    clockTopTime: null,
    clockBottomTime: null,
    resignBtn: null,
    
    // Notation
    notationList: null,
    copyNotationBtn: null,
    
    // Modal
    modalOverlay: null,
    modalIcon: null,
    modalTitle: null,
    modalText: null,
    modalRestartBtn: null,
    modalWaitBtn: null,
    modalLeaveBtn: null,
    
    // Toast
    toast: null,

    customTimeInput: null,
    customTimeValue: null,

    // Кнопки
    drawBtn: null,
    
    // Модалка превращения
    promotionModal: null,
    promotionOptions: null,

    showQrBtn: null,
    lastGameSection: null,
    lastGameNotation: null,
    copyLastGameBtn: null,
    qrModal: null,
    qrcodeContainer: null,
    closeQrBtn: null
};

// Инициализация после загрузки DOM
export function initDom() {
    dom.setupScreen = document.getElementById('setup-screen');
    dom.setupTitle = document.getElementById('setup-title');
    dom.colorOptions = document.getElementById('color-options');
    dom.timeOptions = document.getElementById('time-options');
    dom.colorHint = document.getElementById('color-hint');
    dom.timeHint = document.getElementById('time-hint');
    dom.linkBox = document.getElementById('link-box');
    dom.roomLink = document.getElementById('room-link');
    dom.copyLinkBtn = document.getElementById('copy-link-btn');
    dom.readyStatus = document.getElementById('ready-status');
    dom.readyBtn = document.getElementById('ready-btn');
    dom.hostReadyBadge = document.getElementById('host-ready-badge');
    dom.guestReadyBadge = document.getElementById('guest-ready-badge');
    dom.disconnectWarning = document.getElementById('disconnect-warning');
    
    dom.gameScreen = document.getElementById('game-screen');
    dom.board = document.getElementById('board');
    dom.myInfo = document.getElementById('my-info');
    dom.opponentInfo = document.getElementById('opponent-info');
    dom.myMaster = document.getElementById('my-master');
    dom.opponentMaster = document.getElementById('opponent-master');
    dom.myColorIndicator = document.getElementById('my-color-indicator');
    dom.myColorText = document.getElementById('my-color-text');
    dom.opponentColorIndicator = document.getElementById('opponent-color-indicator');
    dom.opponentColorText = document.getElementById('opponent-color-text');
    dom.myStatus = document.getElementById('my-status');
    dom.opponentStatus = document.getElementById('opponent-status');
    dom.clockTop = document.getElementById('clock-top');
    dom.clockBottom = document.getElementById('clock-bottom');
    dom.clockTopTime = document.getElementById('clock-top-time');
    dom.clockBottomTime = document.getElementById('clock-bottom-time');
    dom.resignBtn = document.getElementById('resign-btn');
    
    dom.notationList = document.getElementById('notation-list');
    dom.copyNotationBtn = document.getElementById('copy-notation-btn');
    
    dom.modalOverlay = document.getElementById('modal-overlay');
    dom.modalIcon = document.getElementById('modal-icon');
    dom.modalTitle = document.getElementById('modal-title');
    dom.modalText = document.getElementById('modal-text');
    dom.modalRestartBtn = document.getElementById('modal-restart-btn');
    dom.modalWaitBtn = document.getElementById('modal-wait-btn');
    dom.modalLeaveBtn = document.getElementById('modal-leave-btn');
    
    dom.toast = document.getElementById('toast');
    dom.customTimeInput = document.getElementById('custom-time-input');
    dom.customTimeValue = document.getElementById('custom-time-value');
    dom.drawBtn = document.getElementById('draw-btn');
    dom.promotionModal = document.getElementById('promotion-modal');
    dom.promotionOptions = document.getElementById('promotion-options');
    dom.showQrBtn = document.getElementById('show-qr-btn');
    dom.lastGameSection = document.getElementById('last-game-section');
    dom.lastGameNotation = document.getElementById('last-game-notation');
    dom.copyLastGameBtn = document.getElementById('copy-last-game-btn');
    dom.qrModal = document.getElementById('qr-modal');
    dom.qrcodeContainer = document.getElementById('qrcode-container');
    dom.closeQrBtn = document.getElementById('close-qr-btn');
}