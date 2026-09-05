let audioCtx;

// Инициализация аудио (браузеры требуют пользовательского действия для запуска звука)
function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Вспомогательная функция для создания тона
function playTone(freq, type, duration, delay = 0, volume = 0.3) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    // Плавное затухание (чтобы не было щелчков)
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + duration);
}

export function playMove() {
    ensureAudioContext();
    // Мягкий "стук" дерева
    playTone(180, 'sine', 0.1, 0, 0.3);
}

export function playCapture() {
    ensureAudioContext();
    // Более резкий и низкий звук для взятия фигуры
    playTone(120, 'triangle', 0.15, 0, 0.4);
}

export function playCheck() {
    ensureAudioContext();
    // Двойной предупреждающий сигнал
    playTone(500, 'sine', 0.1, 0, 0.2);
    playTone(500, 'sine', 0.1, 0.15, 0.2);
}

export function playGameOver() {
    ensureAudioContext();
    // Приятный нисходящий аккорд
    playTone(400, 'sine', 0.4, 0, 0.2);
    playTone(300, 'sine', 0.4, 0.2, 0.2);
    playTone(200, 'sine', 0.6, 0.4, 0.2);
}

export function playClick() {
    ensureAudioContext();
    // Короткий, тихий, высокочастотный щелчок для UI
    playTone(800, 'sine', 0.05, 0, 0.1);
}