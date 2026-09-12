// ============================================================
// LobbyScreen.jsx — 경매 보드게임 로비 (Open Room List + White Editorial)
// Outfit font · Editorial Clean White · Live Socket Room List
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { socket, connectSocket } from '../socket';

const PLAYER_EMOJIS = ['🎩', '👑', '🎭', '🃏'];
const RULES = [
  '초기 자금 $100 지급',
  '31장 카드 덱 (물건 20 + 능력 11)',
  '경매·거래로 자산 극대화',
  '한 바퀴 돌 때마다 카드 1장 추가',
  '물건 카드 소진 시 게임 종료',
  '최종 자산 최다 플레이어 승리',
];

export function LobbyScreen({ onJoined }) {
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [openRooms, setOpenRooms] = useState([]);
  const [view, setView] = useState('list'); // list | create | direct
  const [directCode, setDirectCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const brandRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    connectSocket();

    // 개방된 방 목록 수신
    const handleRoomsList = (list) => {
      setOpenRooms(list || []);
    };

    socket.on('rooms:list', handleRoomsList);

    // GSAP entry animation
    const ctx = gsap.context(() => {
      gsap.from('.lobby-eyebrow', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });
      gsap.from('.lobby-h1', { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.25 });
      gsap.from('.lobby-desc', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.45 });
      gsap.from('.lobby-rule-item', { y: 16, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, delay: 0.6 });
    }, brandRef);

    gsap.from(formRef.current, { x: 40, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 });

    return () => {
      socket.off('rooms:list', handleRoomsList);
      ctx.revert();
    };
  }, []);

  const handleCreate = () => {
    if (!name.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    setLoading(true); setError('');
    const finalRoomName = roomName.trim() || `${name.trim()}의 경매방`;

    socket.emit('room:create', { name: name.trim(), roomName: finalRoomName, maxPlayers }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomId: res.roomId, roomName: finalRoomName, playerName: name.trim(), isHost: true });
      } else {
        setError(res.error || '방 생성에 실패했습니다.');
      }
    });
  };

  const handleJoinRoom = (targetRoomId) => {
    if (!name.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    setLoading(true); setError('');

    socket.emit('room:join', { name: name.trim(), roomId: targetRoomId }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomId: res.roomId, playerName: name.trim(), isHost: false });
      } else {
        setError(res.error || '방 참가에 실패했습니다.');
      }
    });
  };

  const handleDirectJoin = () => {
    if (!name.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    if (!directCode.trim()) { setError('방 코드를 입력해 주세요.'); return; }
    handleJoinRoom(directCode.trim().toUpperCase());
  };

  return (
    <div className="lobby-root">
      {/* ── Left: Brand Panel ── */}
      <div className="lobby-brand" ref={brandRef}>
        <div className="lobby-brand-bg" />
        <div className="lobby-brand-noise" />
        <div className="lobby-grid-lines" />

        <div className="lobby-brand-content">
          <div className="lobby-eyebrow">온라인 멀티플레이어 보드게임</div>

          <h1 className="lobby-h1">
            경매 <em>보드게임</em>
          </h1>

          <p className="lobby-desc">
            실시간 턴제 심리전 경매 게임.
            진품과 가품이 뒤섞인 31장의 카드 속에서
            경매와 거래로 최고의 자산가가 되세요.
          </p>

          <div className="lobby-rules-grid">
            {RULES.map((r, i) => (
              <div key={i} className="lobby-rule-item">
                <span className="lobby-rule-dot" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form & Room List Panel ── */}
      <div className="lobby-form-panel" ref={formRef}>
        <div className="lobby-form-inner">
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">내 닉네임</label>
            <input
              className="form-input"
              placeholder="플레이어 이름 입력"
              value={name}
              maxLength={14}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {view === 'list' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div className="lobby-form-title" style={{ fontSize: 22 }}>열린 게임 방</div>
                  <div className="lobby-form-sub" style={{ marginBottom: 0 }}>목록에서 방을 선택해 참가하세요</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!name.trim()) { setError('닉네임을 먼저 입력해 주세요.'); return; }
                    setError('');
                    setView('create');
                  }}
                >
                  + 방 만들기
                </button>
              </div>

              {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

              {/* Room Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 2, marginBottom: 20 }}>
                {openRooms.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--bg-void)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', color: 'var(--text-muted)', fontSize: 13 }}>
                    현재 열린 방이 없습니다.<br />새로운 방을 만들어보세요!
                  </div>
                ) : (
                  openRooms.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'var(--bg-void)',
                        border: '1px solid var(--border-1)',
                        borderRadius: 'var(--r-lg)',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.roomName}
                          <span className="tag tag-gold" style={{ fontSize: 9 }}>{r.id}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          방장: {r.hostName} · 인원: {r.count}/{r.maxPlayers}명
                        </div>
                      </div>

                      <div>
                        {r.isPlaying ? (
                          <span className="tag tag-muted">게임 중</span>
                        ) : r.count >= r.maxPlayers ? (
                          <span className="tag tag-rose">만석</span>
                        ) : (
                          <button
                            className="btn btn-gold btn-sm"
                            onClick={() => handleJoinRoom(r.id)}
                            disabled={loading}
                          >
                            참가하기
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setView('direct')}
                  style={{ fontSize: 12 }}
                >
                  코드로 직접 참가하기 →
                </button>
              </div>
            </>
          )}

          {view === 'create' && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setView('list')}>
                ← 방 목록으로 돌아가기
              </button>
              <div className="lobby-form-title">새 방 개설</div>
              <div className="lobby-form-sub" style={{ marginBottom: 20 }}>방 이름과 게임 인원을 설정하세요</div>

              <div className="form-group">
                <label className="form-label">방 이름 (선택)</label>
                <input
                  className="form-input"
                  placeholder={`${name || '플레이어'}의 경매방`}
                  value={roomName}
                  maxLength={20}
                  onChange={e => setRoomName(e.target.value)}
                />
              </div>

              <div className="form-label" style={{ marginBottom: 8 }}>최대 인원 설정</div>
              <div className="player-count-row">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    className={`player-count-btn${maxPlayers === n ? ' active' : ''}`}
                    onClick={() => setMaxPlayers(n)}
                  >
                    {n}명
                  </button>
                ))}
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn btn-primary btn-lg w-full" onClick={handleCreate} disabled={loading} style={{ marginTop: 12 }}>
                {loading ? <span className="animate-spin">↻</span> : '방 열기'}
              </button>
            </>
          )}

          {view === 'direct' && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setView('list')}>
                ← 방 목록으로 돌아가기
              </button>
              <div className="lobby-form-title">코드로 직접 참가</div>
              <div className="lobby-form-sub" style={{ marginBottom: 20 }}>전달받은 5자리 방 코드를 입력하세요</div>

              <div className="form-group">
                <label className="form-label">방 코드</label>
                <input
                  className="form-input form-code-input"
                  placeholder="ABCDE"
                  value={directCode}
                  maxLength={5}
                  onChange={e => setDirectCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleDirectJoin(); }}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn btn-primary btn-lg w-full" onClick={handleDirectJoin} disabled={loading} style={{ marginTop: 12 }}>
                {loading ? <span className="animate-spin">↻</span> : '참가하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Waiting Room ──────────────────────────────────────────
export function WaitingRoom({ roomId, roomName, playerName, isHost, lobbyData, maxPlayers: localMax }) {
  const [copied, setCopied] = useState(false);
  const playerCount = lobbyData?.count || 1;
  const totalSlots = lobbyData?.maxPlayers || localMax || 4;
  const players = lobbyData?.players || [{ name: playerName }];
  const displayRoomName = lobbyData?.roomName || roomName || '경매 보드게임 방';

  const copyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleStart = () => {
    socket.emit('game:start', {}, (res) => {
      if (!res?.success) alert(res?.error || '시작 실패');
    });
  };

  return (
    <div className="waiting-root">
      <div className="waiting-card">
        <div className="waiting-header">
          <div className="waiting-header-bg" />

          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {displayRoomName}
          </div>

          <div className="waiting-code-block">
            <div className="waiting-code-label">방 코드 (초기 공유용)</div>
            <div
              className="waiting-code-value"
              style={{ cursor: 'pointer' }}
              onClick={copyCode}
              title="클릭하여 복사"
            >
              {roomId}
            </div>
            {copied && (
              <div style={{ fontSize: 11, color: 'var(--emerald)', marginTop: 4 }}>코드 복사 완료!</div>
            )}
          </div>

          <div className="waiting-count-text">
            {playerCount} / {totalSlots}명 참가 완료
          </div>
        </div>

        {/* Player slots */}
        <div className="player-slots-grid">
          {Array(totalSlots).fill(null).map((_, i) => {
            const p = players[i];
            const isFilled = !!p;
            return (
              <div key={i} className={`player-slot ${isFilled ? 'filled' : 'empty'}`}>
                <div className="slot-avatar">
                  {isFilled ? PLAYER_EMOJIS[i] || '👤' : '—'}
                </div>
                <div>
                  {isFilled ? (
                    <div className="slot-name">
                      {p.name}
                      {p.name === playerName && (
                        <span className="tag tag-gold" style={{ fontSize: 8 }}>나</span>
                      )}
                      {i === 0 && <span className="tag tag-muted" style={{ fontSize: 8 }}>방장</span>}
                    </div>
                  ) : (
                    <div className="slot-empty-text">대기 중...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="waiting-footer">
          {isHost ? (
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleStart}
              disabled={playerCount < 2}
            >
              {playerCount < 2 ? `최소 2명 필요 (${playerCount}/${totalSlots})` : `게임 시작 (${playerCount}명)`}
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              방장이 게임을 시작하기를 기다리는 중...
            </div>
          )}
          <button className="btn btn-ghost btn-sm w-full" onClick={() => window.location.reload()}>
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
