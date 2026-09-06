import { PIECES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';

let dragState = null;
let pointerStart = null;
let hasMoved = false;

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

export function initBoardClickHandler(onSquareClick) {
    
    // --- КЛИК (fallback для пустых клеток) ---
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
        startInteraction(pieceEl, e.clientX, e.clientY, 'mouse');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!dragState) return;
        if (!hasMoved) {
            hasMoved = true;
            showFloatingPiece(e.clientX, e.clientY);
        }
        moveDrag(e.clientX, e.clientY);
    });
    
    document.addEventListener('mouseup', (e) => {
        if (!dragState) return;
        if (!hasMoved) {
            // Не было движения — это клик
            const square = dragState.fromSquare;
            cleanupDrag();
            onSquareClick(square);
        } else {
            endDrag(e.clientX, e.clientY);
        }
    });
    
    // --- Touch (мобильные) ---
    dom.board.addEventListener('touchstart', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        e.preventDefault(); // БЛОКИРУЕМ СКРОЛЛ СРАЗУ
        startInteraction(pieceEl, touch.clientX, touch.clientY, 'touch');
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!dragState || e.touches.length !== 1) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        if (!hasMoved) {
            hasMoved = true;
            showFloatingPiece(touch.clientX, touch.clientY);
        }
        moveDrag(touch.clientX, touch.clientY);
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        if (!dragState) return;
        
        const touch = e.changedTouches[0];
        if (!hasMoved) {
            // Не было движения — это клик
            const square = dragState.fromSquare;
            cleanupDrag();
            onSquareClick(square);
        } else {
            endDrag(touch.clientX, touch.clientY);
        }
    });
}

function startInteraction(pieceEl, x, y, type) {
    const squareEl = pieceEl.closest('.square');
    const fromSquare = squareEl.dataset.square;
    const piece = state.game.get(fromSquare);
    
    if (!piece || piece.color !== state.playerColor) return;
    if (!state.gameStarted || state.gameOver) return;
    if (state.game.turn() !== state.playerColor) return;
    
    const moves = state.game.moves({ square: fromSquare, verbose: true }).map(m => m.to);
    if (moves.length === 0) return;
    
    // Показываем подсказки
    state.selectedSquare = fromSquare;
    state.validMoves = moves;
    renderBoard();
    
    // ВАЖНО: берём координаты центра фигуры, а не точки касания
    const pieceRect = pieceEl.getBoundingClientRect();
    const pieceCenterX = pieceRect.left + pieceRect.width / 2;
    const pieceCenterY = pieceRect.top + pieceRect.height / 2;
    
    // Запоминаем начальную позицию (для определения движения)
    pointerStart = { x: pieceCenterX, y: pieceCenterY };
    hasMoved = false;
    
    // Подсвечиваем исходную клетку
    const sourceEl = dom.board.querySelector(`[data-square="${fromSquare}"]`);
    if (sourceEl) sourceEl.classList.add('drag-source');
    
    // Создаём dragState
    dragState = {
        fromSquare,
        pieceType: piece.type,
        pieceColor: piece.color,
        sourceEl,
        floatingEl: null,
        // Сохраняем реальные координаты фигуры для первого отображения
        pieceCenterX,
        pieceCenterY
    };
}

function showFloatingPiece(x, y) {
    if (!dragState) return;
    
    const floatingEl = document.createElement('span');
    floatingEl.className = `floating-piece ${dragState.pieceColor === 'w' ? 'white' : 'black'}`;
    floatingEl.textContent = PIECES[dragState.pieceColor][dragState.pieceType];
    
    // Используем сохранённые координаты центра фигуры для первого отображения
    const startX = dragState.pieceCenterX;
    const startY = dragState.pieceCenterY;
    
    floatingEl.style.left = `${startX}px`;
    floatingEl.style.top = `${startY}px`;
    document.body.appendChild(floatingEl);
    
    dragState.floatingEl = floatingEl;
    dom.board.classList.add('dragging');
}

function moveDrag(x, y) {
    if (!dragState || !dragState.floatingEl) return;
    
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
    
    cleanupDrag();
    
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

function cleanupDrag() {
    if (dragState) {
        if (dragState.floatingEl) dragState.floatingEl.remove();
        dom.board.classList.remove('dragging');
        dom.board.querySelectorAll('.square.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (dragState.sourceEl) dragState.sourceEl.classList.remove('drag-source');
    }
    dragState = null;
    pointerStart = null;
    hasMoved = false;
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