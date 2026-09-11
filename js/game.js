import { state } from './state.js';
import { renderBoard } from './board.js';
import { updateNotation } from './notation.js';
import { updateActivePlayer } from './clock.js';
import { sendMove } from './peer.js';
import { playMove, playCapture, playCheck } from './sounds.js';
import { showPromotionModal } from './ui.js';

/**
 * Выполняет ход на доске и отправляет сопернику
 * @param {string} from - Начальная клетка (например, 'e2')
 * @param {string} to - Конечная клетка (например, 'e4')
 * @param {string} [promotion] - Фигура для превращения (опционально)
 */
export function executeMove(from, to, promotion = 'q') {
    const move = state.game.move({ from, to, promotion });
    if (!move) return false;
    
    playSoundForMove(move);
    
    const data = { type: 'move', move };
    if (state.settings.timeControl > 0) {
        data.whiteTime = state.whiteTime;
        data.blackTime = state.blackTime;
    }
    sendMove(data);
    
    renderBoard();
    updateNotation();
    updateActivePlayer();
    window.dispatchEvent(new CustomEvent('game:check-over'));
    
    return true;
}

export function handleSquareClick(square) {
    const { game, playerColor, gameStarted, gameOver, selectedSquare, validMoves } = state;
    
    if (!gameStarted || gameOver) return;
    if (game.turn() !== playerColor) return;
    
    const piece = game.get(square);
    
    // Если выбрана клетка и кликнули на допустимый ход
    if (selectedSquare && validMoves.includes(square)) {
        const movingPiece = game.get(selectedSquare);
        const isPromotion = movingPiece.type === 'p' && (square[1] === '1' || square[1] === '8');
        
        if (isPromotion) {
            state.pendingPromotion = { from: selectedSquare, to: square };
            showPromotionModal(playerColor, (chosenPiece) => {
                executeMove(state.pendingPromotion.from, state.pendingPromotion.to, chosenPiece);
                state.pendingPromotion = null;
            });
        } else {
            executeMove(selectedSquare, square);
        }
        
        state.selectedSquare = null;
        state.validMoves = [];
        renderBoard();
        return;
    }
    
    // Выбор своей фигуры
    if (piece && piece.color === playerColor) {
        state.selectedSquare = square;
        state.validMoves = game.moves({ square, verbose: true }).map(m => m.to);
        renderBoard();
    } else {
        // Сброс выделения
        state.selectedSquare = null;
        state.validMoves = [];
        renderBoard();
    }
}

function playSoundForMove(move) {
    if (state.game.in_check()) {
        playCheck();
    } else if (move.captured) {
        playCapture();
    } else {
        playMove();
    }
}