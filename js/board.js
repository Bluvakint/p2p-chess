import { PIECES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';

let dragState = null;
let pointerStart = null;
const DRAG_THRESHOLD = 3; // уменьшили с 5 до 3 пикселей

export function renderBoard() {
    const { game, playerColor, selectedSquare, validMoves } = state;
    const boardEl = dom.board;
    
    const boardState = game.board();
    const history = game.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;
    const checkSquare = game.in_check() ? findKingSquare(boardState, game.turn()) : null;
    
    const rows = playerColor === 'w' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
    const cols = playerColor === 'w' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];

    const fragment = document.createDocumentFragment();
    
    for (const row of rows) {
        for (const col of cols) {
            const squareName = String.fromCharCode(97 + col) + (8 - row);
            const square = createSquareElement(squareName, row, col, boardState[row][col]);
            
            if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) {
                square.classList.add('last-move');
            }
            if (selectedSquare === squareName) square.classList.add('selected');
            if (checkSquare === squareName) square.classList.add('in-check');
            
            const piece = boardState[row][col];
            const isValidTarget = validMoves.includes(squareName);
            if (isValidTarget) {
                square.classList.add(piece ? 'valid-capture' : 'valid-move');
            }
            
            fragment.appendChild(square);
        }
    }
    
    boardEl.innerHTML = '';
    boardEl.appendChild(fragment);
}

function createSquareElement(squareName, row, col, piece) {
    const square = document.createElement('div');
    const isLight = (row + col) % 2 === 0;
    square.className = `square ${isLight ? 'light' : 'dark'}`;
    square.dataset.square = squareName;
    
    if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
        pieceEl.textContent = PIECES[piece.color][piece.type];
        square.appendChild(pieceEl);
    }
    
    return square;
}

function findKingSquare(boardState, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.type === 'k' && piece.color === color) {
                return String.fromCharCode(97 + c) + (8 - r);
            }
        }
    }
    return null;
}

// ========== Инициализация событий ==========
export function initBoardClickHandler(onSquareClick) {
    
    // --- КЛИК (универсальный fallback) ---
    dom.board.addEventListener('click', (e) => {
        if (dragState) return;
        const square = e.target.closest('.square');
        if (square) onSquareClick(square.dataset.square);
    });
    
    // --- Mouse ---
    dom.board.addEventListener('mousedown', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;
        e.preventDefault();
        
        const squareEl = pieceEl.closest('.square');
        const fromSquare = squareEl.dataset.square;
        const piece = state.game.get(fromSquare);
        
        // СРАЗУ выбираем фигуру и показываем подсказки (как при клике)
        if (piece && piece.color === state.playerColor && state.gameStarted && !state.gameOver && state.game.turn() === state.playerColor) {
            const moves = state.game.moves({ square: fromSquare, verbose: true }).map(m => m.to);
            if (moves.length > 0) {
                state.selectedSquare = fromSquare;
                state.validMoves = moves;
                renderBoard();
            }
        }
        
        pointerStart = { x: e.clientX, y: e.clientY, pieceEl, fromSquare };
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!pointerStart) return;
        
        // Если drag ещё не начался — проверяем порог
        if (!dragState) {
            const dx = Math.abs(e.clientX - pointerStart.x);
            const dy = Math.abs(e.clientY - pointerStart.y);
            if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
            
            // Порог пройден — начинаем drag с ТЕКУЩИМИ координатами
            startDrag(pointerStart.pieceEl, e.clientX, e.clientY, pointerStart.fromSquare);
            return;
        }
        
        moveDrag(e.clientX, e.clientY);
    });
    
    document.addEventListener('mouseup', (e) => {
        if (pointerStart && !dragState) {
            // Короткий клик — обрабатываем как обычный клик по клетке
            const square = pointerStart.pieceEl.closest('.square');
            if (square) onSquareClick(square.dataset.square);
        } else if (dragState) {
            endDrag(e.clientX, e.clientY);
        }
        pointerStart = null;
    });
    
    // --- Touch (мобильные) ---
    dom.board.addEventListener('touchstart', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl || e.touches.length !== 1) return;
        const touch = e.touches[0];
        
        const squareEl = pieceEl.closest('.square');
        const fromSquare = squareEl.dataset.square;
        const piece = state.game.get(fromSquare);
        
        // СРАЗУ показываем подсказки
        if (piece && piece.color === state.playerColor && state.gameStarted && !state.gameOver && state.game.turn() === state.playerColor) {
            const moves = state.game.moves({ square: fromSquare, verbose: true }).map(m => m.to);
            if (moves.length > 0) {
                state.selectedSquare = fromSquare;
                state.validMoves = moves;
                renderBoard();
            }
        }
        
        pointerStart = { x: touch.clientX, y: touch.clientY, pieceEl, fromSquare };
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!pointerStart || e.touches.length !== 1) return;
        const touch = e.touches[0];
        
        if (!dragState) {
            const dx = Math.abs(touch.clientX - pointerStart.x);
            const dy = Math.abs(touch.clientY - pointerStart.y);
            if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
            
            startDrag(pointerStart.pieceEl, touch.clientX, touch.clientY, pointerStart.fromSquare);
        }
        
        if (dragState) {
            e.preventDefault();
            moveDrag(touch.clientX, touch.clientY);
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        if (pointerStart && !dragState) {
            const square = pointerStart.pieceEl.closest('.square');
            if (square) onSquareClick(square.dataset.square);
        } else if (dragState) {
            const touch = e.changedTouches[0];
            endDrag(touch.clientX, touch.clientY);
        }
        pointerStart = null;
    });
}

// ========== Drag логика ==========
function startDrag(pieceEl, x, y, fromSquare) {
    const piece = state.game.get(fromSquare);
    if (!piece) {
        pointerStart = null;
        return;
    }
    
    const sourceEl = dom.board.querySelector(`[data-square="${fromSquare}"]`);
    if (sourceEl) sourceEl.classList.add('drag-source');
    
    const floatingEl = document.createElement('span');
    floatingEl.className = `floating-piece ${piece.color === 'w' ? 'white' : 'black'}`;
    floatingEl.textContent = PIECES[piece.color][piece.type];
    floatingEl.style.left = `${x}px`;
    floatingEl.style.top = `${y}px`;
    document.body.appendChild(floatingEl);
    
    dom.board.classList.add('dragging');
    
    dragState = {
        fromSquare,
        pieceType: piece.type,
        floatingEl,
        sourceEl
    };
}

function moveDrag(x, y) {
    if (!dragState) return;
    
    dragState.floatingEl.style.left = `${x}px`;
    dragState.floatingEl.style.top = `${y}px`;
    
    const squareUnder = getSquareAtPosition(x, y);
    dom.board.querySelectorAll('.square.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (squareUnder && state.validMoves.includes(squareUnder)) {
        const el = dom.board.querySelector(`[data-square="${squareUnder}"]`);
        if (el) el.classList.add('drag-over');
    }
}

function endDrag(x, y) {
    if (!dragState) return;

    const fromSquare = dragState.fromSquare;
    const pieceType = dragState.pieceType;
    const toSquare = getSquareAtPosition(x, y);
    
    // Очищаем визуал
    if (dragState.floatingEl) dragState.floatingEl.remove();
    dom.board.classList.remove('dragging');
    dom.board.querySelectorAll('.square.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (dragState.sourceEl) dragState.sourceEl.classList.remove('drag-source');

    dragState = null;
    
    // Если отпустили на валидной клетке — делаем ход
    if (toSquare && state.validMoves.includes(toSquare)) {
        const isPromotion = pieceType === 'p' && (toSquare[1] === '1' || toSquare[1] === '8');
        
        if (isPromotion) {
            window.dispatchEvent(new CustomEvent('board:promotion', {
                detail: { from: fromSquare, to: toSquare }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('board:move', {
                detail: { from: fromSquare, to: toSquare }
            }));
        }
    }
    
    state.selectedSquare = null;
    state.validMoves = [];
    renderBoard();
}

function getSquareAtPosition(x, y) {
    if (dragState && dragState.floatingEl) {
        dragState.floatingEl.style.display = 'none';
    }
    
    const el = document.elementFromPoint(x, y);
    
    if (dragState && dragState.floatingEl) {
        dragState.floatingEl.style.display = '';
    }
    
    if (!el) return null;
    const square = el.closest('.square');
    return square ? square.dataset.square : null;
}