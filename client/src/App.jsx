// ============================================================
// App.jsx — 최상위 라우터 + Socket 이벤트 핸들러
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { socket, connectSocket } from './socket';
import { LobbyScreen, WaitingRoom } from './components/LobbyScreen';
import { GameBoard } from './components/GameBoard';
import { ResultScreen } from './components/ResultScreen';
import './index.css';

// ── Toast 컴포넌트 ─────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Reveal Toast ───────────────────────────────────────────
function RevealToast({ reveal, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!reveal) return null;
  return (
    <div className="modal-overlay" style={{ background: 'transparent', pointerEvents: 'none' }}>
      <div className="reveal-toast">
        <div style={{ fontSize: 36, marginBottom: 8 }}>
          {reveal.isReal ? '✅' : '❌'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>진위 확인 결과</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {reveal.cardName}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: reveal.isReal ? 'var(--emerald)' : 'var(--rose)',
        }}>
          {reveal.isReal ? '✅ 진품' : '❌ 가품'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          이 결과는 나만 볼 수 있습니다
        </div>
      </div>
    </div>
  );
}

// ── 앱 상태 ────────────────────────────────────────────────
// screen: 'lobby' | 'waiting' | 'game' | 'result'
let toastIdCounter = 0;

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | waiting | game | result
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [lobbyData, setLobbyData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [results, setResults] = useState(null);
  const [myId, setMyId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [revealInfo, setRevealInfo] = useState(null);

  // ── Toast helper ─────────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const onError = useCallback((msg) => addToast(msg, 'error', 4000), [addToast]);
  const onSuccess = useCallback((msg) => addToast(msg, 'success', 2500), [addToast]);

  // ── Socket setup ─────────────────────────────────────────
  useEffect(() => {
    connectSocket();

    socket.on('connect', () => {
      setMyId(socket.id);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      addToast('서버와의 연결이 끊어졌습니다.', 'error', 5000);
    });

    socket.on('connect_error', () => {
      addToast('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'error', 5000);
    });

    socket.on('lobby:update', (data) => {
      setLobbyData(data);
    });

    socket.on('game:state', (state) => {
      setGameState(state);
      if (screen === 'waiting' || screen === 'lobby') {
        setScreen('game');
      }
    });

    socket.on('game:ended', ({ results }) => {
      setResults(results);
      setScreen('result');
    });

    socket.on('player:left', ({ name }) => {
      addToast(`⚠️ ${name}이(가) 게임을 떠났습니다.`, 'error', 4000);
    });

    socket.on('ability:reveal', (data) => {
      setRevealInfo(data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('lobby:update');
      socket.off('game:state');
      socket.off('game:ended');
      socket.off('player:left');
      socket.off('ability:reveal');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // screen 변경 시에도 socket 이벤트가 올바르게 처리되도록
  useEffect(() => {
    socket.on('game:state', (state) => {
      setGameState(state);
      setScreen(prev => (prev === 'waiting' || prev === 'lobby') ? 'game' : prev);
    });
    return () => socket.off('game:state');
  }, []);

  const handleJoined = ({ roomId, playerName, isHost }) => {
    setRoomId(roomId);
    setPlayerName(playerName);
    setIsHost(isHost);
    setMyId(socket.id);
    setScreen('waiting');
  };

  const handlePlayAgain = () => {
    setScreen('lobby');
    setGameState(null);
    setResults(null);
    setRoomId(null);
    setLobbyData(null);
  };

  return (
    <>
      {/* ── Screen Router ── */}
      {screen === 'lobby' && (
        <LobbyScreen onJoined={handleJoined} />
      )}

      {screen === 'waiting' && (
        <WaitingRoom
          roomId={roomId}
          playerName={playerName}
          isHost={isHost}
          lobbyData={lobbyData}
          onGameStart={() => setScreen('game')}
        />
      )}

      {screen === 'game' && gameState && (
        <GameBoard
          gameState={gameState}
          myId={myId}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      {screen === 'result' && results && (
        <ResultScreen
          results={results}
          myId={myId}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* ── 연결 중 로딩 ── */}
      {screen === 'game' && !gameState && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">게임 상태 로딩 중...</div>
        </div>
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} />

      {/* ── Reveal Toast (진위 확인) ── */}
      {revealInfo && (
        <RevealToast
          reveal={revealInfo}
          onClose={() => setRevealInfo(null)}
        />
      )}
    </>
  );
}
