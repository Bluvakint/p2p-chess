import { state } from './state.js';
import { showToast } from './ui.js';

export function initPeer() {
    const urlParams = new URLSearchParams(window.location.search);
    const hostIdFromUrl = urlParams.get('room');
    state.isHost = !hostIdFromUrl;
    
    if (state.isHost) {
        const roomId = Math.random().toString(36).substring(2, 8);
        window.history.replaceState({}, '', `?room=${roomId}`);
        state.peer = new Peer(roomId);
        
        state.peer.on('connection', (connection) => {
            state.conn = connection;
            attachConnectionHandlers(connection);
        });
    } else {
        state.peer = new Peer();
        state.peer.on('open', () => {
            state.conn = state.peer.connect(hostIdFromUrl);
            attachConnectionHandlers(state.conn);
        });
    }
    
    state.peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        showToast('Ошибка сети: ' + err.type);
    });
    
    return state.isHost;
}

function attachConnectionHandlers(connection) {
    connection.on('open', () => {
        window.dispatchEvent(new CustomEvent('peer:connected'));
    });
    
    // Передаём данные через событие — без импорта из app.js
    connection.on('data', (data) => {
        window.dispatchEvent(new CustomEvent('peer:data', { detail: data }));
    });
    
    connection.on('close', () => {
        window.dispatchEvent(new CustomEvent('peer:disconnected'));
    });
}

export function send(data) {
    if (state.conn && state.conn.open) {
        state.conn.send(data);
    }
}

export function sendMove(data) {
    send(data);
}

export function closeConnection() {
    if (state.conn && state.conn.open) {
        state.conn.close();
    }
}