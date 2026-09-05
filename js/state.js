import { DEFAULT_SETTINGS } from './constants.js';

// Глобальное состояние приложения
export const state = {
    // Роли
    isHost: false,
    playerColor: null,
    
    // Сеть
    peer: null,
    conn: null,
    
    // Игра
    game: null, // инициализируется в app.js
    gameStarted: false,
    gameOver: false,
    selectedSquare: null,
    validMoves: [],
    pendingPromotion: null,
    
    // Настройки
    settings: { ...DEFAULT_SETTINGS },
    
    // Таймеры
    whiteTime: 0,
    blackTime: 0,
    timerInterval: null,
    
    // Готовность
    iAmReady: false,
    opponentReady: false,

    drawOffered: false,
    drawReceived: false,
    pendingPromotion: null,
    lastGameNotation: null
};