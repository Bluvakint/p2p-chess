import { state } from './state.js';
import { renderBoard } from './board.js';
import { updateNotation } from './notation.js';
import { updateActivePlayer } from './clock.js';
import { sendMove } from './peer.js';
import { playMove, playCapture, playCheck } from './sounds.js';
import { showPromotionModal } from './ui.js';

export function handleSquareClick(square) {
    const { game, playerColor, gameStarted, gameOver, selectedSquare, validMoves } = state;
    
    if (!gameStarted || gameOver) return;
    if (game.turn() !== playerColor) return;
    
    const piece = game.get(square);
    
    if (selectedSquare && validMoves.includes(square)) {
        // ПРОВЕРКА НА ПРЕВРАЩЕНИЕ
        const movingPiece = game.get(selectedSquare);
        const isPromotion = movingPiece.type === 'p' && (square[1] === '1' || square[1] === '8');
        
        if (isPromotion) {
            state.pendingPromotion = { from: selectedSquare, to: square };
            showPromotionModal(playerColor, (chosenPiece) => {
                makeMoveWithPromotion(state.pendingPromotion.from, state.pendingPromotion.to, chosenPiece);
            });
        } else {
            makeMove(selectedSquare, square);
        }
        
        state.selectedSquare = null;
        state.validMoves = [];
        renderBoard();
        return;
    }
    
    if (piece && piece.color === playerColor) {
        state.selectedSquare = square;
        state.validMoves = game.moves({ square, verbose: true }).map(m => m.to);
        renderBoard();
    } else {
        state.selectedSquare = null;
        state.validMoves = [];
        renderBoard();
    }
}

export function makeMoveWithPromotion(from, to, promotion) {
    const move = state.game.move({ from, to, promotion });
    if (!move) return;
    
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
}

export function makeMove(from, to) {
    const move = state.game.move({ from, to, promotion: 'q' }); // По умолчанию ферзь, если вдруг вызовут напрямую
    if (!move) return;
    
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