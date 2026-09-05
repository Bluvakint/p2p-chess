import { state } from './state.js';
import { dom } from './dom.js';
import { showToast } from './ui.js';

export function updateNotation() {
    const history = state.game.history({ verbose: true });
    const list = dom.notationList;
    list.innerHTML = '';
    
    if (history.length === 0) {
        list.innerHTML = '<div class="notation-empty">Ходов пока нет</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1];
        
        fragment.appendChild(createMoveNumber(moveNum));
        fragment.appendChild(createMoveEl(whiteMove.san, i === history.length - 1));
        fragment.appendChild(createMoveEl(blackMove?.san || '', blackMove && i + 1 === history.length - 1));
    }
    
    list.appendChild(fragment);
    list.scrollTop = list.scrollHeight;
}

function createMoveNumber(num) {
    const el = document.createElement('div');
    el.className = 'notation-move-number';
    el.textContent = `${num}.`;
    return el;
}

function createMoveEl(text, isLatest) {
    const el = document.createElement('div');
    el.className = 'notation-move' + (isLatest ? ' latest' : '');
    el.textContent = text;
    return el;
}

export function copyNotation() {
    const history = state.game.history();
    if (history.length === 0) {
        showToast('Нотация пуста');
        return;
    }
    
    const text = history.reduce((acc, move, i) => {
        if (i % 2 === 0) acc += `${Math.floor(i / 2) + 1}. `;
        acc += move + (i % 2 === 0 && i < history.length - 1 ? ' ' : ' ');
        return acc;
    }, '').trim();
    
    navigator.clipboard.writeText(text);
    showToast('Нотация скопирована!');
}