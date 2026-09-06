import { PIECES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';

let dragClone = null;
let startSquare = null;
let pointerId = null;
let hasMoved = false;
let ignoreNextClick = false;

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
    
    dom.board.addEventListener('pointerdown', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;
        
        const squareEl = pieceEl.closest('.square');
        const fromSquare = squareEl.dataset.square;
        const piece = state.game.get(fromSquare);
        
        if (!piece || piece.color !== state.playerColor) return;
        if (!state.gameStarted || state.gameOver) return;
        if (state.game.turn() !== state.playerColor) return;
        
        const moves = state.game.moves({ square: fromSquare, verbose: true }).map(m => m.to);
        if (moves.length === 0) return;
        
        e.preventDefault();
        pieceEl.setPointerCapture(e.pointerId);
        
        startSquare = fromSquare;
        pointerId = e.pointerId;
        hasMoved = false;
        
        // Показываем подсказки
        state.selectedSquare = fromSquare;
        state.validMoves = moves;
        document.querySelectorAll('.square').forEach(sq => {
            sq.classList.remove('selected', 'valid-move', 'valid-capture');
        });
        squareEl.classList.add('selected');
        moves.forEach(moveSq => {
            const targetEl = dom.board.querySelector(`[data-square="${moveSq}"]`);
            if (targetEl) {
                targetEl.classList.add(state.game.get(moveSq) ? 'valid-capture' : 'valid-move');
            }
        });
        
        // Создаем КЛОН фигуры для перетаскивания
        const rect = pieceEl.getBoundingClientRect();
        dragClone = document.createElement('div');
        dragClone.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
        dragClone.textContent = PIECES[piece.color][piece.type];
        dragClone.style.position = 'fixed';
        dragClone.style.left = `${rect.left}px`;
        dragClone.style.top = `${rect.top}px`;
        dragClone.style.width = `${rect.width}px`;
        dragClone.style.height = `${rect.height}px`;
        dragClone.style.zIndex = '9999';
        dragClone.style.pointerEvents = 'none';
        dragClone.style.opacity = '0.8';
        dragClone.style.transition = 'none';
        dragClone.style.display = 'flex';
        dragClone.style.alignItems = 'center';
        dragClone.style.justifyContent = 'center';
        dragClone.style.fontSize = window.getComputedStyle(pieceEl).fontSize;
        document.body.appendChild(dragClone);
        
        // Скрываем оригинал на время drag
        pieceEl.style.opacity = '0.3';
        squareEl.classList.add('drag-source');
    });

    document.addEventListener('pointermove', (e) => {
        if (!dragClone || e.pointerId !== pointerId) return;
        
        const rect = dragClone.getBoundingClientRect();
        const dx = Math.abs(e.clientX - (rect.left + rect.width / 2));
        const dy = Math.abs(e.clientY - (rect.top + rect.height / 2));
        
        if (!hasMoved && (dx > 5 || dy > 5)) {
            hasMoved = true;
            dom.board.classList.add('dragging');
        }
        
        if (hasMoved) {
            // Фигура выше курсора, курсор снизу
            dragClone.style.left = `${e.clientX - rect.width / 2}px`;
            dragClone.style.top = `${e.clientY - rect.height - 10}px`;
            
            highlightSquareUnder(e.clientX, e.clientY);
        }
    });

    document.addEventListener('pointerup', (e) => {
        if (!dragClone || e.pointerId !== pointerId) return;
        
        if (!hasMoved) {
            cleanupDrag();
            onSquareClick(startSquare);
        } else {
            ignoreNextClick = true;
            const toSquare = getSquareAtPosition(e.clientX, e.clientY);
            cleanupDrag();
            
            if (toSquare && state.validMoves.includes(toSquare)) {
                const isPromotion = state.game.get(startSquare).type === 'p' && (toSquare[1] === '1' || toSquare[1] === '8');
                if (isPromotion) {
                    window.dispatchEvent(new CustomEvent('board:promotion', { detail: { from: startSquare, to: toSquare } }));
                } else {
                    window.dispatchEvent(new CustomEvent('board:move', { detail: { from: startSquare, to: toSquare } }));
                }
            } else {
                state.selectedSquare = null;
                state.validMoves = [];
                renderBoard();
            }
        }
    });

    document.addEventListener('pointercancel', (e) => {
        if (!dragClone || e.pointerId !== pointerId) return;
        cleanupDrag();
        state.selectedSquare = null;
        state.validMoves = [];
        renderBoard();
    });
    
    dom.board.addEventListener('click', (e) => {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }
        const square = e.target.closest('.square');
        if (square) onSquareClick(square.dataset.square);
    });

    function highlightSquareUnder(x, y) {
        dom.board.querySelectorAll('.square.drag-over').forEach(el => el.classList.remove('drag-over'));
        const sq = getSquareAtPosition(x, y);
        if (sq && state.validMoves.includes(sq)) {
            const el = dom.board.querySelector(`[data-square="${sq}"]`);
            if (el) el.classList.add('drag-over');
        }
    }

    function getSquareAtPosition(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const square = el.closest('.square');
        return square ? square.dataset.square : null;
    }

    function cleanupDrag() {
        if (dragClone) {
            dragClone.remove();
            dragClone = null;
        }
        dom.board.classList.remove('dragging');
        dom.board.querySelectorAll('.square.drag-over, .drag-source').forEach(el => {
            el.classList.remove('drag-over', 'drag-source');
        });
        // Возвращаем прозрачность оригинальной фигуре
        document.querySelectorAll('.piece').forEach(p => p.style.opacity = '');
        pointerId = null;
        hasMoved = false;
    }
}