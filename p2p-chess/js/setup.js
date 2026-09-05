import { state } from './state.js';
import { dom } from './dom.js';
import { showToast, toggle, updateReadyBadges, updateReadyButton, applySettingsToUI, setSettingsEditable } from './ui.js';
import { send } from './peer.js';

// 1. Универсальная функция для группы опций (объявлена в самом верху для безопасности)
function initOptionGroup(groupEl, onChange) {
    groupEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.option-btn');
        if (!btn || btn.disabled) return;
        
        groupEl.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onChange(btn.dataset.value);
    });
}

export function initSetup() {
    if (state.isHost) {
        dom.setupTitle.textContent = '🎮 Создание комнаты';
        dom.roomLink.value = window.location.href;
        
        // Вызываем отдельную функцию для инициализации обработчиков
        initSetupHandlers();
    } else {
        dom.setupTitle.textContent = '🎮 Ожидание мастера...';
        setSettingsEditable(false);
        toggle(dom.linkBox, false);
    }
    
    dom.readyBtn.addEventListener('click', handleReadyClick);
}

function onSettingsChange() {
    send({ type: 'settings_update', settings: state.settings });
    
    // Сбрасываем готовность при изменении настроек
    if (state.iAmReady) {
        state.iAmReady = false;
        updateReadyButton(state);
        updateReadyBadges(state);
        send({ type: 'unready' });
    }
}

function handleReadyClick() {
    if (!state.conn || !state.conn.open) {
        showToast('Соперник ещё не подключился');
        return;
    }
    
    state.iAmReady = !state.iAmReady;
    send({ type: state.iAmReady ? 'ready' : 'unready' });
    updateReadyButton(state);
    updateReadyBadges(state);
    checkBothReady();
}

export function checkBothReady() {
    if (!state.iAmReady || !state.opponentReady) return;
    if (!state.isHost) return; // Стартует только хост
    
    let hostPlaysWhite;
    if (state.settings.hostColor === 'white') hostPlaysWhite = true;
    else if (state.settings.hostColor === 'black') hostPlaysWhite = false;
    else hostPlaysWhite = Math.random() < 0.5;
    
    send({
        type: 'start',
        playerColor: hostPlaysWhite ? 'b' : 'w',
        settings: state.settings
    });
    
    state.playerColor = hostPlaysWhite ? 'w' : 'b';
    window.dispatchEvent(new CustomEvent('game:start'));
}

export function showReadyUI() {
    toggle(dom.linkBox, false);
    toggle(dom.readyStatus, true);
    toggle(dom.readyBtn, true);
}

export function returnToWaiting() {
    resetGameState();
    state.conn = null;
    
    toggle(dom.gameScreen, false);
    toggle(dom.setupScreen, true);
    dom.modalOverlay.classList.remove('active');
    
    toggle(dom.linkBox, true);
    toggle(dom.readyStatus, false);
    toggle(dom.readyBtn, false);
    
    dom.roomLink.value = window.location.href;
    dom.setupTitle.textContent = '🎮 Ожидание соперника...';
    
    showLastGameNotation();
    showToast('Соперник ушёл. Комната активна — пригласите нового игрока!');
}

export function returnToSetup(newSettings) {
    resetGameState();
    if (newSettings) state.settings = newSettings;
    applySettingsToUI(state.settings);
    setSettingsEditable(state.isHost);
    
    toggle(dom.gameScreen, false);
    toggle(dom.setupScreen, true);
    dom.modalOverlay.classList.remove('active');
    
    toggle(dom.linkBox, false);
    toggle(dom.readyStatus, true);
    toggle(dom.readyBtn, true);
    
    updateReadyButton(state);
    updateReadyBadges(state);
    
    dom.setupTitle.textContent = state.isHost ? '🎮 Новая партия' : '🎮 Мастер начинает новую партию...';
    showLastGameNotation();
}

export function resetGameState() {
    // 1. СОХРАНЯЕМ нотацию перед сбросом
    if (state.gameStarted) {
        const history = state.game.history();
        if (history.length > 0) {
            let text = '';
            for (let i = 0; i < history.length; i += 2) {
                text += `${Math.floor(i / 2) + 1}. ${history[i]}`;
                if (history[i + 1]) text += ` ${history[i + 1]}`;
                text += ' ';
            }
            state.lastGameNotation = text.trim();
        }
    }

    // 2. Стандартный сброс
    state.gameStarted = false;
    state.gameOver = false;
    clearInterval(state.timerInterval);
    state.game.reset();
    state.selectedSquare = null;
    state.validMoves = [];
    state.iAmReady = false;
    state.opponentReady = false;
    state.drawOffered = false;
    state.drawReceived = false;
    dom.drawBtn.disabled = false;
    dom.drawBtn.textContent = '🤝 Ничья';
}

function showLastGameNotation() {
    if (state.lastGameNotation) {
        dom.lastGameNotation.textContent = state.lastGameNotation;
        toggle(dom.lastGameSection, true);
    } else {
        toggle(dom.lastGameSection, false);
    }
}

export function handleHostDisconnect() {
    resetGameState();
    
    // Очищаем URL от старой комнаты
    window.history.replaceState({}, '', window.location.pathname);
    
    // Превращаем джойнера в мастера
    state.isHost = true;
    
    // Уничтожаем старое Peer-соединение
    if (state.peer) state.peer.destroy();
    
    // Создаём новый peer с новым ID
    const newRoomId = Math.random().toString(36).substring(2, 8);
    state.peer = new Peer(newRoomId);
    window.history.replaceState({}, '', `?room=${newRoomId}`);
    
    // ВАЖНО: Добавляем обработчик подключения к новому peer
    state.peer.on('connection', (connection) => {
        state.conn = connection;
        
        connection.on('open', () => {
            showReadyUI();
            connection.send({ type: 'init', settings: state.settings });
            dom.setupTitle.textContent = '🎮 Соперник подключился!';
        });
        
        connection.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('peer:data', { detail: data }));
        });
        
        connection.on('close', () => {
            window.dispatchEvent(new CustomEvent('peer:disconnected'));
        });
    });
    
    state.peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        showToast('Ошибка сети: ' + err.type);
    });
    
    // Обновляем UI под мастера
    dom.setupTitle.textContent = '🎮 Создание комнаты (Мастер ушёл)';
    dom.roomLink.value = window.location.href;
    setSettingsEditable(true);
    
    // Переинициализируем обработчики setup (цвет, время)
    initSetupHandlers();
    
    toggle(dom.gameScreen, false);
    toggle(dom.setupScreen, true);
    dom.modalOverlay.classList.remove('active');
    
    toggle(dom.linkBox, true);
    toggle(dom.readyStatus, false);
    toggle(dom.readyBtn, false);
    
    showLastGameNotation();
    showToast('Мастер отключился. Вы стали мастером новой комнаты!');
}

function initSetupHandlers() {
    // Обработка выбора цвета
    initOptionGroup(dom.colorOptions, (value) => {
        state.settings.hostColor = value;
        onSettingsChange();
    });
    
    // Обработка выбора времени
    initOptionGroup(dom.timeOptions, (value) => {
        if (value === 'custom') {
            toggle(dom.customTimeInput, true);
            dom.customTimeValue.focus();
        } else {
            toggle(dom.customTimeInput, false);
            state.settings.timeControl = parseInt(value);
            onSettingsChange();
        }
    });
    
    // Обработчик ввода кастомного времени
    dom.customTimeValue.addEventListener('input', () => {
        const minutes = parseInt(dom.customTimeValue.value);
        if (minutes && minutes >= 1 && minutes <= 180) {
            state.settings.timeControl = minutes * 60;
            onSettingsChange();
        }
    });
    
    // Кнопка копирования ссылки
    dom.copyLinkBtn.onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Ссылка скопирована!');
    };
}