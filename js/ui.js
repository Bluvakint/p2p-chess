import { dom } from './dom.js';
import { PIECES } from './constants.js'; // Добавь этот импорт в начало файла

export function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(() => dom.toast.classList.remove('show'), 2500);
}

export function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function toggle(el, visible) {
    el.classList.toggle('hidden', !visible);
}

export function updateReadyBadges(state) {
    const { isHost, iAmReady, opponentReady } = state;
    const { hostReadyBadge, guestReadyBadge } = dom;
    
    if (isHost) {
        setBadge(hostReadyBadge, iAmReady);
        setBadge(guestReadyBadge, opponentReady);
    } else {
        setBadge(hostReadyBadge, opponentReady);
        setBadge(guestReadyBadge, iAmReady);
    }
}

function setBadge(el, isReady) {
    el.textContent = isReady ? '✓ Готов' : 'Ожидает';
    el.className = `ready-badge ${isReady ? 'ready' : 'waiting'}`;
}

export function updateReadyButton(state) {
    const { readyBtn } = dom;
    if (state.iAmReady) {
        readyBtn.textContent = '❌ Отменить готовность';
        readyBtn.classList.add('is-ready');
    } else {
        readyBtn.textContent = '✅ Готов';
        readyBtn.classList.remove('is-ready');
    }
}

export function applySettingsToUI(settings) {
    updateOptionGroup(dom.colorOptions, settings.hostColor);
    
    // Проверяем, является ли время стандартным или кастомным
    const standardTimes = [0, 300, 600, 900];
    if (standardTimes.includes(settings.timeControl)) {
        updateOptionGroup(dom.timeOptions, String(settings.timeControl));
        toggle(dom.customTimeInput, false);
    } else {
        // Кастомное время — выбираем кнопку "Своё" и показываем поле ввода
        updateOptionGroup(dom.timeOptions, 'custom');
        toggle(dom.customTimeInput, true);
        dom.customTimeValue.value = Math.floor(settings.timeControl / 60);
    }
}

function updateOptionGroup(groupEl, value) {
    groupEl.querySelectorAll('.option-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.value === value);
    });
}

export function setSettingsEditable(editable) {
    dom.colorOptions.querySelectorAll('.option-btn').forEach(b => b.disabled = !editable);
    dom.timeOptions.querySelectorAll('.option-btn').forEach(b => b.disabled = !editable);
    toggle(dom.colorHint, !editable);
    toggle(dom.timeHint, !editable);
}

export function showGameOverModal(result, reason, isHost) {
    const icons = { win: '🏆', lose: '😔', draw: '🤝' };
    const titles = { win: 'Победа!', lose: 'Поражение', draw: 'Ничья' };
    
    dom.modalIcon.textContent = icons[result];
    dom.modalTitle.textContent = titles[result];
    dom.modalText.textContent = reason;

    toggle(dom.modalRestartBtn, isHost);
    toggle(dom.modalWaitBtn, !isHost);
    toggle(dom.modalLeaveBtn, !isHost);
    
    dom.modalOverlay.classList.remove('hidden');
    dom.modalOverlay.classList.add('active');
}

export function showPromotionModal(color, onSelect) {
    dom.promotionOptions.innerHTML = '';
    const pieces = ['q', 'r', 'b', 'n'];
    
    pieces.forEach(type => {
        const btn = document.createElement('button');
        btn.className = `promotion-piece-btn ${color === 'w' ? 'white' : 'black'}`;
        btn.textContent = PIECES[color][type];
        btn.addEventListener('click', () => {
            dom.promotionModal.classList.remove('active');
            dom.promotionModal.classList.add('hidden');
            // Вызываем коллбек, передавая выбранную фигуру
            onSelect(type);
        });
        dom.promotionOptions.appendChild(btn);
    });
    
    dom.promotionModal.classList.remove('hidden');
    dom.promotionModal.classList.add('active');
}

export function hidePromotionModal() {
    dom.promotionModal.classList.remove('active');
}