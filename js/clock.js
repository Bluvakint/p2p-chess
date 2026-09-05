import { state } from './state.js';
import { dom } from './dom.js';
import { formatTime, toggle } from './ui.js';
import { showGameOverModal } from './ui.js';

export function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(tick, 1000);
}

function tick() {
    if (state.gameOver || !state.gameStarted) {
        clearInterval(state.timerInterval);
        return;
    }
    
    if (state.game.turn() === 'w') {
        state.whiteTime--;
        if (state.whiteTime <= 0) {
            state.whiteTime = 0;
            handleTimeout('w');
            return;
        }
    } else {
        state.blackTime--;
        if (state.blackTime <= 0) {
            state.blackTime = 0;
            handleTimeout('b');
            return;
        }
    }
    updateClocks();
}

export function updateClocks() {
    const { playerColor, game, whiteTime, blackTime, gameOver, settings } = state;
    const topColor = playerColor === 'w' ? 'b' : 'w';
    const bottomColor = playerColor;
    
    dom.clockTopTime.textContent = formatTime(topColor === 'w' ? whiteTime : blackTime);
    dom.clockBottomTime.textContent = formatTime(bottomColor === 'w' ? whiteTime : blackTime);

    const turn = game.turn();
    dom.clockTop.classList.toggle('active', turn === topColor && !gameOver);
    dom.clockBottom.classList.toggle('active', turn === bottomColor && !gameOver);
    
    const lowTimeThreshold = 30;
    const hasTimer = settings.timeControl > 0;
    dom.clockTop.classList.toggle('low-time', turn === topColor && (topColor === 'w' ? whiteTime : blackTime) < lowTimeThreshold && hasTimer);
    dom.clockBottom.classList.toggle('low-time', turn === bottomColor && (bottomColor === 'w' ? whiteTime : blackTime) < lowTimeThreshold && hasTimer);
}

export function updateActivePlayer() {
    const myTurn = state.game.turn() === state.playerColor;
    dom.myInfo.classList.toggle('active-turn', myTurn);
    dom.opponentInfo.classList.toggle('active-turn', !myTurn);
}

function handleTimeout(color) {
    clearInterval(state.timerInterval);
    state.gameOver = true;
    const winner = color === 'w' ? 'b' : 'w';
    const iWon = winner === state.playerColor;
    showGameOverModal(iWon ? 'win' : 'lose', `Время вышло у ${color === 'w' ? 'белых' : 'чёрных'}`, state.isHost);
}

export function showClocks(show) {
    toggle(dom.clockTop, show);
    toggle(dom.clockBottom, show);
}