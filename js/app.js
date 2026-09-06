import { state } from './state.js';
import { dom } from './dom.js';
import { showToast, toggle, applySettingsToUI, showGameOverModal, updateReadyBadges } from './ui.js';
import { initPeer, send, closeConnection } from './peer.js';
import { renderBoard, initBoardClickHandler } from './board.js';
import { handleSquareClick } from './game.js';
import { updateNotation, copyNotation } from './notation.js';
import { startTimer, updateClocks, updateActivePlayer, showClocks } from './clock.js';
import { playGameOver, playCheck, playCapture, playMove, playClick } from './sounds.js';
import { initSetup, showReadyUI, returnToWaiting, returnToSetup, checkBothReady, resetGameState, handleHostDisconnect } from './setup.js';

// ========== Инициализация ==========
function init() {
    state.game = new Chess();
    
    const isHost = initPeer();
    initSetup();
    initBoardClickHandler(handleSquareClick);
    initGlobalEventListeners();
    initBeforeUnloadWarning();
    
    // Первичная отрисовка для джойнера
    if (!isHost) {
        state.playerColor = 'w';
        renderBoard();
    }
}

function initGlobalEventListeners() {
    window.addEventListener('peer:connected', onPeerConnected);
    window.addEventListener('peer:disconnected', onPeerDisconnected);
    window.addEventListener('game:start', onGameStart);
    window.addEventListener('peer:data', (e) => handleIncomingData(e.detail));
    window.addEventListener('game:check-over', checkGameOver);
    
    dom.resignBtn.addEventListener('click', handleResign);
    dom.copyNotationBtn.addEventListener('click', copyNotation);
    dom.modalRestartBtn.addEventListener('click', handleModalRestart);
    
    dom.modalWaitBtn.addEventListener('click', () => {
        dom.modalOverlay.classList.remove('active');
        dom.modalOverlay.classList.add('hidden');
    });
    
    dom.modalLeaveBtn.addEventListener('click', handleModalLeave);
    dom.drawBtn.addEventListener('click', handleDrawOffer);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.square')) return;
        if (e.target.closest('button')) {
            playClick();
        }
    });
    
     // === Drag & Drop события от board.js ===
    window.addEventListener('board:move', (e) => {
        const { from, to } = e.detail;
        import('./game.js').then(g => g.makeMove(from, to));
    });
    
    window.addEventListener('board:promotion', (e) => {
        const { from, to } = e.detail;
        import('./ui.js').then(ui => {
            state.pendingPromotion = { from, to };
            ui.showPromotionModal(state.playerColor, (chosenPiece) => {
                import('./game.js').then(g => g.makeMoveWithPromotion(from, to, chosenPiece));
            });
        });
    });
    
    dom.showQrBtn.addEventListener('click', () => {
        dom.qrcodeContainer.innerHTML = '';
        new QRCode(dom.qrcodeContainer, {
            text: window.location.href,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        dom.qrModal.classList.remove('hidden');
        dom.qrModal.classList.add('active');
    });

    dom.closeQrBtn.addEventListener('click', () => {
        dom.qrModal.classList.remove('active');
        dom.qrModal.classList.add('hidden');
    });

    // Копирование последней нотации
    dom.copyLastGameBtn.addEventListener('click', () => {
        if (state.lastGameNotation) {
            navigator.clipboard.writeText(state.lastGameNotation);
            showToast('Нотация последней игры скопирована!');
        }
    });
}

// ========== Peer события ==========
function onPeerConnected() {
    showReadyUI();
    
    if (state.isHost) {
        send({ type: 'init', settings: state.settings });
        dom.setupTitle.textContent = '🎮 Соперник подключился!';
    } else {
        dom.setupTitle.textContent = '🎮 Подключено к мастеру';
    }
}

function onPeerDisconnected() {
    if (state.isHost) {
        returnToWaiting();
    } else {
        // Джойнер: мастер ушел, становимся новым мастером
        handleHostDisconnect();
    }
}

// ========== Обработка входящих данных ==========
export function handleIncomingData(data) {
    switch (data.type) {
        case 'init':
        case 'settings_update':
            state.settings = data.settings;
            applySettingsToUI(state.settings);
            showToast('Мастер обновил настройки');
            
            if (state.iAmReady) {
                state.iAmReady = false;
                updateReadyButton(state);
                updateReadyBadges(state);
                send({ type: 'unready' });
            }
            break;
        
        case 'ready':
            state.opponentReady = true;
            showToast('Соперник готов!');
            checkBothReady();
            break;
        
        case 'unready':
            state.opponentReady = false;
            break;
        
        case 'start':
            state.playerColor = data.playerColor;
            state.settings = data.settings;
            onGameStart();
            break;
        
        case 'move':
            state.game.move(data.move);
            
            // Звук хода соперника
            if (state.game.in_check()) {
                playCheck();
            } else if (data.move.captured) {
                playCapture();
            } else {
                playMove();
            }
            
            if (data.whiteTime !== undefined) {
                state.whiteTime = data.whiteTime;
                state.blackTime = data.blackTime;
                updateClocks();
            }
            state.selectedSquare = null;
            state.validMoves = [];
            renderBoard();
            updateNotation();
            updateActivePlayer();
            checkGameOver();
            break;

        case 'draw_offer':
            state.drawReceived = true;
            const accept = confirm('Соперник предлагает ничью. Принять?');
            if (accept) {
                send({ type: 'draw_accept' });
                endGameByDraw('Ничья по соглашению сторон');
            } else {
                send({ type: 'draw_decline' });
                showToast('Вы отклонили предложение ничьей');
            }
            state.drawReceived = false;
            break;
            
        case 'draw_accept':
            endGameByDraw('Соперник принял предложение ничьей');
            break;
            
        case 'draw_decline':
            state.drawOffered = false;
            dom.drawBtn.disabled = false;
            dom.drawBtn.textContent = '🤝 Ничья';
            showToast('Соперник отклонил предложение ничьей');
            break;
            
        
        case 'return_to_setup':
            returnToSetup(data.settings);
            break;
        
        case 'resign':
            state.gameOver = true;
            clearInterval(state.timerInterval);
            showGameOverModal(data.winner === state.playerColor ? 'win' : 'lose', 'Соперник сдался', state.isHost);
            break;
    }
    
    if (['ready', 'unready', 'init', 'settings_update'].includes(data.type)) {
        updateReadyBadges(state);
    }
}

// ========== Старт игры ==========
function onGameStart() {
    resetGameState();
    
    state.gameStarted = true;
    state.gameOver = false;
    
    toggle(dom.setupScreen, false);
    toggle(dom.gameScreen, true);
    
    // Цвета
    const oppColor = state.playerColor === 'w' ? 'b' : 'w';
    
    dom.myColorIndicator.className = `color-indicator ${state.playerColor === 'w' ? 'white' : 'black'}`;
    dom.myColorText.textContent = state.playerColor === 'w' ? 'Белые' : 'Чёрные';
    dom.opponentColorIndicator.className = `color-indicator ${oppColor === 'w' ? 'white' : 'black'}`;
    dom.opponentColorText.textContent = oppColor === 'w' ? 'Белые' : 'Чёрные';
    
    // Мастер
    toggle(dom.myMaster, state.isHost);
    toggle(dom.opponentMaster, !state.isHost);
    
    // Часы
    if (state.settings.timeControl > 0) {
        state.whiteTime = state.settings.timeControl;
        state.blackTime = state.settings.timeControl;
        showClocks(true);
        updateClocks();
        startTimer();
    } else {
        showClocks(false);
    }
    
    renderBoard();
    updateNotation();
    updateActivePlayer();
}

// ========== Окончание игры ==========
export function checkGameOver() {
    if (!state.game.game_over()) return;
    state.gameOver = true;
    clearInterval(state.timerInterval);
    
    // === ЗВУК ОКОНЧАНИЯ ИГРЫ ===
    playGameOver();
    // ============================
    
    let result, reason;
    if (state.game.in_checkmate()) {
        const winner = state.game.turn() === 'w' ? 'Чёрные' : 'Белые';
        result = state.game.turn() !== state.playerColor ? 'win' : 'lose';
        reason = `Мат! ${winner} победили`;
    } else if (state.game.in_stalemate()) {
        result = 'draw';
        reason = 'Пат — ничья';
    } else {
        result = 'draw';
        reason = 'Ничья';
    }
    
    showGameOverModal(result, reason, state.isHost);
}

// ========== Кнопки ==========
function handleResign() {
    if (state.gameOver) return;
    if (!confirm('Вы уверены, что хотите сдаться?')) return;
    
    state.gameOver = true;
    clearInterval(state.timerInterval);
    send({ type: 'resign', winner: state.playerColor === 'w' ? 'b' : 'w' });
    showGameOverModal('lose', 'Вы сдались', state.isHost);
}

function handleModalRestart() {
    if (state.isHost) send({ type: 'return_to_setup', settings: state.settings });
    returnToSetup(state.settings);
}

function handleModalLeave() {
    closeConnection();
    window.location.href = window.location.pathname;
}

function handleDrawOffer() {
    if (state.gameOver || state.drawReceived) return;
    
    if (state.drawOffered) {
        showToast('Вы уже предлагали ничью');
        return;
    }
    
    send({ type: 'draw_offer' });
    state.drawOffered = true;
    dom.drawBtn.disabled = true;
    dom.drawBtn.textContent = '⏳ Ожидание...';
    showToast('Предложение ничьей отправлено');
}

function endGameByDraw(reason) {
    resetGameState();
    
    state.gameOver = true;
    clearInterval(state.timerInterval);
    
    import('./ui.js').then(ui => {
        ui.showGameOverModal('draw', reason, state.isHost);
        import('./sounds.js').then(s => s.playGameOver());
    });
}

function initBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
        if (state.gameStarted && !state.gameOver) {
            const msg = 'Игра будет прервана!';
            e.preventDefault();
            e.returnValue = msg;
            return msg;
        }
    });
}

// ========== Запуск ==========
init();