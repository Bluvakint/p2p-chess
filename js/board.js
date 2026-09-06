import { PIECES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';

let dragState = null;
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
    
    // Клик для пустых клеток
    dom.board.addEventListener('click', (e) => {
        if (dragState) return;
        const square = e.target.closest('.square');
        if (square) onSquareClick(square.dataset.square);
    });
    
    // POINTER DOWN — работает и на мыши, и на тачскрине
    dom.board.addEventListener('pointerdown', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const squareEl = pieceEl.closest('.square');
        const fromSquare = squareEl.dataset.square;
        const piece = state.game.get(fromSquare);
        
        if (!piece || piece.color !== state.playerColor) return;
        if (!state.gameStarted || state.gameOver) return;
        if (state.game.turn() !== state.playerColor) return;
        
        const moves = state.game.moves({ square: fromSquare, verbose: true }).map(m => m.to);
        if (moves.length === 0) return;
        
        // Захватываем pointer
        pieceEl.setPointerCapture(e.pointerId);
        
        // Показываем подсказки
        state.selectedSquare = fromSquare;
        state.validMoves = moves;
        renderBoard();
        
        const pieceRect = pieceEl.getBoundingClientRect();
        const floatingEl = document.createElement('span');
        floatingEl.className = `floating-piece ${piece.color === 'w' ? 'white' : 'black'}`;
        floatingEl.textContent = PIECES[piece.color][piece.type];
        floatingEl.style.left = `${pieceRect.left}px`;
        floatingEl.style.top = `${pieceRect.top}px`;
        floatingEl.style.width = `${pieceRect.width}px`;
        floatingEl.style.height = `${pieceRect.height}px`;
        floatingEl.style.opacity = '0';
        document.body.appendChild(floatingEl);
        
        const sourceEl = dom.board.querySelector(`[data-square="${fromSquare}"]`);
        if (sourceEl) sourceEl.classList.add('drag-source');
        
        dragState = {
            fromSquare,
            pieceType: piece.type,
            pieceColor: piece.color,
            floatingEl,
            sourceEl,
            pointerId: e.pointerId,
            startX: pieceRect.left + pieceRect.width / 2,
            startY: pieceRect.top + pieceRect.height / 2,
            pieceWidth: pieceRect.width,
            pieceHeight: pieceRect.height,
            currentX: e.clientX,
            currentY: e.clientY
        };
        
        hasMoved = false;
    });
    
    // POINTER MOVE
    document.addEventListener('pointermove', (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        
        const dx = Math.abs(e.clientX - dragState.startX);
        const dy = Math.abs(e.clientY - dragState.startY);
        
        if (!hasMoved && (dx > 3 || dy > 3)) {
            hasMoved = true;
            dragState.floatingEl.style.opacity = '1';
            dom.board.classList.add('dragging');
        }
        
        if (hasMoved) {
            dragState.currentX = e.clientX;
            dragState.currentY = e.clientY;
            moveDrag(e.clientX, e.clientY);
        }
    });
    
    // POINTER UP
    document.addEventListener('pointerup', (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        
        if (!hasMoved) {
            // Клик
            const square = dragState.fromSquare;
            cleanupDrag();
            onSquareClick(square);
        } else {
            endDrag(e.clientX, e.clientY);
        }
    });
    
    // POINTER CANCEL (если браузер отменил pointer)
    document.addEventListener('pointercancel', (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        cleanupDrag();
    });
}

function moveDrag(x, y) {
    if (!dragState || !dragState.floatingEl) return;
    
    // Центрируем фигуру относительно курсора
    const left = x - dragState.pieceWidth / 2;
    const top = y - dragState.pieceHeight / 2;
    
    dragState.floatingEl.style.left = `${left}px`;
    dragState.floatingEl.style.top = `${top}px`;
    
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