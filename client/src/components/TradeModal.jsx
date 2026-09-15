// ============================================================
// TradeModal.jsx — 실시간 1:1 카드 거래 (v3)
// Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
// • 단일 창 UX: 상대 선택 + 내 오퍼 작성 + 실시간 상태 동시 표시
// • THEIR OFFER: 카드 수량(뒷면)만 표시 — 이름/종류 완전 비공개
// • ▲ 버튼: 상대에게 더 큰 제안 요청 신호
// • 양쪽 Ready! → 자동 거래 성사
// • 한 턴에 동일 상대 1회 제한
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { MiniCard } from './Card';

// ── 인라인 아이콘 ─────────────────────────────────────────
const Ico = {
  ArrowUp: ({ s = 14, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  Check: ({ s = 14, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  User: ({ s = 13, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  X: ({ s = 12, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Swap: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
    </svg>
  ),
};

// ── 카드 뒷면 (THEIR OFFER에서 사용 — 내용 숨김) ──────────
function CardBack({ count = 0 }) {
  if (count === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '24px 0',
        color: '#bbb',
      }}>
        <div style={{ fontSize: 28 }}>🂠</div>
        <div style={{ fontSize: 11, fontWeight: 600 }}>카드 없음</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 44,
            height: 60,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #2d5016 0%, #3a6b1e 40%, #2d5016 100%)',
            border: '1.5px solid #3a6b1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.5}deg)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 격자 패턴 */}
          <div style={{
            position: 'absolute',
            inset: 3,
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)',
          }} />
          <span style={{ fontSize: 16, zIndex: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>🂠</span>
        </div>
      ))}
    </div>
  );
}

// ── Ready 상태 뱃지 ───────────────────────────────────────
function ReadyBadge({ ready, name }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.05em',
      background: ready ? '#166534' : '#6b6b6b',
      color: '#ffffff',
      transition: 'background 200ms ease',
    }}>
      {ready && <Ico.Check s={9} c="#ffffff" />}
      {ready ? 'READY' : (name || '대기 중')}
    </div>
  );
}

// ── 전체 거래 모달 (단일 창) ──────────────────────────────
// ActionPanel에서 "거래" 버튼 → 이 모달 하나만 열림
// 거래가 active가 아닐 때: 상대 선택 + 내 오퍼 구성
// 거래가 active일 때: 양쪽 실시간 거래창
export function TradeProposalModal({ gameState, myId, onClose, onError, onSuccess }) {
  const trade = gameState.trade;
  const myPlayer = gameState.players.find(p => p.id === myId);
  const alreadyTraded = gameState.turnActions?.tradedWith || [];
  const otherPlayers = gameState.players.filter(p => p.id !== myId);

  // 거래가 이미 active + 내가 참여자면 LiveTradeModal을 바로 보여줌
  const isParticipant = trade?.active && (trade.proposerId === myId || trade.targetId === myId);

  // ── State ─────────────────────────────────────────────
  const [targetId, setTargetId] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // 이미 참여 중이면 LiveTradeModal 위임
  if (isParticipant) {
    return (
      <LiveTradeModal
        gameState={gameState}
        myId={myId}
        onClose={onClose}
        onError={onError}
        onSuccess={onSuccess}
      />
    );
  }

  const target = targetId ? gameState.players.find(p => p.id === targetId) : null;

  const toggleCard = (cardId) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const changeMoney = (val) => {
    setOfferMoney(Math.max(0, Math.min(myPlayer?.money || 0, Math.round(Number(val) / 10) * 10)));
  };

  // 제안 전송: trade:open → trade:update_offer 순서
  const handlePropose = () => {
    if (!targetId) { onError?.('거래 상대를 선택해 주세요.'); return; }
    if (alreadyTraded.includes(targetId)) { onError?.('이번 턴에 이미 해당 상대와 거래했습니다.'); return; }
    setSubmitting(true);
    socket.emit('trade:open', { targetId }, (res) => {
      if (!res?.success) { setSubmitting(false); onError?.(res?.error || '거래 시작 실패'); return; }
      // 내 오퍼 즉시 전송
      if (selectedCardIds.length > 0 || offerMoney > 0) {
        socket.emit('trade:update_offer', { cards: selectedCardIds, money: offerMoney }, () => {});
      }
      setSubmitting(false);
      onSuccess?.('거래를 제안했습니다!');
      // 모달은 닫지 않음 — isParticipant가 true가 돼서 LiveTradeModal로 전환됨
    });
  };

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={styles.shell}>

        {/* 헤더 */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>1:1 LIVE ITEM TRADE</div>
            <div style={styles.title}>실시간 1:1 카드 거래</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <Ico.X s={14} c="#141414" />
          </button>
        </div>

        {/* 상대 선택 */}
        <div style={{ padding: '12px 20px', borderBottom: '1.5px solid #e5e5e5' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', marginBottom: 8 }}>
            거래 상대 선택 (턴당 상대별 최대 1회)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {otherPlayers.map(p => {
              const done = alreadyTraded.includes(p.id);
              const sel = targetId === p.id;
              return (
                <button
                  key={p.id}
                  disabled={done}
                  onClick={() => !done && setTargetId(sel ? null : p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 99,
                    border: sel ? '2px solid #166534' : '1.5px solid #d0d0d0',
                    background: sel ? '#166534' : done ? '#f5f5f5' : '#ffffff',
                    color: sel ? '#ffffff' : done ? '#aaa' : '#141414',
                    fontWeight: 700, fontSize: 13,
                    cursor: done ? 'not-allowed' : 'pointer',
                    opacity: done ? 0.5 : 1,
                    transition: 'all 140ms ease',
                  }}
                >
                  <Ico.User s={13} c={sel ? '#ffffff' : '#888'} />
                  {p.name}
                  {done && <span style={{ fontSize: 10, opacity: 0.7 }}>(완료)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-column 거래 영역 */}
        <div style={styles.columns}>
          {/* 내 오퍼 */}
          <div style={{ ...styles.panel, background: '#fffbf0' }}>
            <div style={styles.panelLabel}>MY OFFER</div>

            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6 }}>
              내가 제공할 카드 선택 ({selectedCardIds.length}장)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 70, maxHeight: 160, overflowY: 'auto' }}>
              {(myPlayer?.inventory || []).map(c => (
                <MiniCard
                  key={c.id}
                  card={c}
                  selected={selectedCardIds.includes(c.id)}
                  onClick={() => toggleCard(c.id)}
                  showRealBadge={true}
                />
              ))}
              {!myPlayer?.inventory?.length && (
                <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>보유 카드 없음</div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6 }}>
                내가 제공할 현금 (잔액: ${myPlayer?.money ?? 0})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 16 }}>$</span>
                <input
                  type="number"
                  value={offerMoney}
                  min={0} max={myPlayer?.money || 0} step={10}
                  onChange={e => changeMoney(e.target.value)}
                  style={styles.moneyInput}
                />
              </div>
            </div>

            {/* 내 오퍼 요약 태그 */}
            {(selectedCardIds.length > 0 || offerMoney > 0) && (
              <div style={styles.summaryTag}>
                카드 {selectedCardIds.length}장  +  ${offerMoney}
              </div>
            )}
          </div>

          {/* 중앙 화살표 */}
          <div style={styles.centerCol}>
            <div style={styles.swapCircle}>
              <Ico.Swap s={16} c="#ffffff" />
            </div>
          </div>

          {/* 상대 오퍼 (선택 전) */}
          <div style={{ ...styles.panel, background: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
            <div style={styles.panelLabel}>THEIR OFFER</div>
            {target ? (
              <div style={{ color: '#888', fontSize: 12, fontWeight: 600, textAlign: 'center', marginTop: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                거래 제안 후<br />상대 응답 실시간 표시
              </div>
            ) : (
              <div style={{ color: '#bbb', fontSize: 12, fontWeight: 600, textAlign: 'center', marginTop: 12 }}>
                상단에서 거래 대상을<br />선택하세요
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>취소</button>
          <button
            onClick={handlePropose}
            disabled={!targetId || submitting}
            style={{
              ...styles.primaryBtn,
              background: targetId && !submitting ? '#166534' : '#aaa',
              cursor: targetId && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? '제안 중...' : '거래 제안하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 실시간 거래창 (양측 공통) ─────────────────────────────
export function LiveTradeModal({ gameState, myId, onClose, onError, onSuccess }) {
  const trade = gameState.trade;
  const myPlayer = gameState.players.find(p => p.id === myId);
  const isProposer = myId === trade?.proposerId;
  const partnerId  = isProposer ? trade?.targetId : trade?.proposerId;
  const partner    = gameState.players.find(p => p.id === partnerId);

  const myOffer    = isProposer ? trade?.proposerOffer : trade?.targetOffer;
  const theirOffer = isProposer ? trade?.targetOffer   : trade?.proposerOffer;
  const myReady    = isProposer ? trade?.proposerReady : trade?.targetReady;
  const theirReady = isProposer ? trade?.targetReady   : trade?.proposerReady;
  const demandedAtMe = trade?.demandMoreBy && trade.demandMoreBy !== myId;

  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [offerMoney, setOfferMoney]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const syncedRef = useRef(false);

  // 서버 → 로컬 동기화 (최초 1회)
  useEffect(() => {
    if (myOffer && !syncedRef.current) {
      setSelectedCardIds(myOffer.cards || []);
      setOfferMoney(myOffer.money || 0);
      syncedRef.current = true;
    }
  }, [myOffer]);

  const pushOffer = (cards, money) => {
    socket.emit('trade:update_offer', { cards, money }, (res) => {
      if (!res?.success) onError?.(res?.error);
    });
  };

  const toggleCard = (cardId) => {
    const next = selectedCardIds.includes(cardId)
      ? selectedCardIds.filter(id => id !== cardId)
      : [...selectedCardIds, cardId];
    setSelectedCardIds(next);
    pushOffer(next, offerMoney);
  };

  const changeMoney = (val) => {
    const amt = Math.max(0, Math.min(myPlayer?.money || 0, Math.round(Number(val) / 10) * 10));
    setOfferMoney(amt);
    pushOffer(selectedCardIds, amt);
  };

  const handleReady = () => {
    setLoading(true);
    socket.emit('trade:ready', { ready: !myReady }, (res) => {
      setLoading(false);
      if (!res?.success) onError?.(res?.error);
    });
  };

  const handleDemandMore = () => {
    socket.emit('trade:demand_more', {}, (res) => {
      if (!res?.success) onError?.(res?.error);
      else onSuccess?.('▲ 더 큰 제안을 요청했습니다.');
    });
  };

  const handleCancel = () => {
    socket.emit('trade:cancel', {}, (res) => {
      if (!res?.success) onError?.(res?.error);
      else onClose?.();
    });
  };

  if (!trade?.active) return null;

  // 상대가 올려놓은 카드 개수만 추출 — 이름/종류 완전 비공개
  const theirCardCount = (theirOffer?.cards || []).length;
  const theirMoney     = theirOffer?.money || 0;

  return (
    <div className="modal-overlay">
      <div style={styles.shell}>

        {/* 헤더 */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>1:1 LIVE ITEM TRADE</div>
            <div style={styles.title}>실시간 1:1 카드 거래</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Ico.User s={12} c="#888" />
              <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>vs</span>
              <span style={{
                fontSize: 12, fontWeight: 800,
                padding: '2px 10px', borderRadius: 99,
                background: '#141414', color: '#ffffff',
              }}>{partner?.name}</span>
              <ReadyBadge ready={theirReady} name={partner?.name} />
            </div>
          </div>
          <button style={styles.closeBtn} onClick={handleCancel}>
            <Ico.X s={14} c="#141414" />
          </button>
        </div>

        {/* ▲ 더 요청 받은 배너 */}
        {demandedAtMe && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 20px',
            background: '#fef2f2',
            borderBottom: '1.5px solid #fca5a5',
          }}>
            <Ico.ArrowUp s={15} c="#dc2626" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
              {partner?.name}이(가) 더 큰 제안을 요청하고 있습니다!
            </span>
          </div>
        )}

        {/* 2-컬럼 */}
        <div style={styles.columns}>

          {/* 내 오퍼 */}
          <div style={{
            ...styles.panel,
            background: '#fffbf0',
            borderColor: myReady ? '#166534' : '#d0d0d0',
            borderWidth: myReady ? 2 : 1.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={styles.panelLabel}>MY OFFER</div>
              <ReadyBadge ready={myReady} name="나" />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 6 }}>
              내가 제공할 카드 선택 ({selectedCardIds.length}장)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 64, maxHeight: 150, overflowY: 'auto' }}>
              {(myPlayer?.inventory || []).map(c => (
                <MiniCard
                  key={c.id}
                  card={c}
                  selected={selectedCardIds.includes(c.id)}
                  onClick={() => toggleCard(c.id)}
                  showRealBadge={true}
                />
              ))}
              {!myPlayer?.inventory?.length && (
                <div style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>보유 카드 없음</div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 5 }}>
                현금 제공 (잔액 ${myPlayer?.money ?? 0})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 15 }}>$</span>
                <input
                  type="number"
                  value={offerMoney}
                  min={0} max={myPlayer?.money || 0} step={10}
                  onChange={e => changeMoney(e.target.value)}
                  style={styles.moneyInput}
                />
              </div>
            </div>

            {(selectedCardIds.length > 0 || offerMoney > 0) && (
              <div style={styles.summaryTag}>
                카드 {selectedCardIds.length}장 + ${offerMoney}
              </div>
            )}
          </div>

          {/* 중앙 */}
          <div style={styles.centerCol}>
            <div style={styles.swapCircle}>
              <Ico.Swap s={15} c="#ffffff" />
            </div>
            {/* ▲ 더 요청 버튼 */}
            <button
              onClick={handleDemandMore}
              title="상대에게 더 큰 제안 요청"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '1.5px solid #dc2626',
                background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 5px rgba(220,38,38,0.12)',
                transition: 'all 140ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.querySelector('svg').setAttribute('stroke', '#ffffff'); }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.querySelector('svg').setAttribute('stroke', '#dc2626'); }}
            >
              <Ico.ArrowUp s={15} c="#dc2626" />
            </button>
          </div>

          {/* 상대 오퍼 — 카드 뒷면만, 이름 비공개 */}
          <div style={{
            ...styles.panel,
            background: '#f8f8f8',
            borderColor: theirReady ? '#166534' : '#d0d0d0',
            borderWidth: theirReady ? 2 : 1.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={styles.panelLabel}>THEIR OFFER</div>
              <ReadyBadge ready={theirReady} name={partner?.name} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 8 }}>
              상대가 제안한 카드 ({theirCardCount}장)
              <span style={{ marginLeft: 6, fontSize: 9, color: '#bbb', fontWeight: 500 }}>이름 비공개</span>
            </div>

            {/* 카드 뒷면만 표시 */}
            <div style={{ minHeight: 68 }}>
              <CardBack count={theirCardCount} />
            </div>

            {/* 현금은 숫자로만 */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', marginBottom: 4 }}>
                현금 제안
              </div>
              <div style={{
                fontSize: 20, fontWeight: 900, fontFamily: 'monospace',
                color: theirMoney > 0 ? '#166534' : '#ccc',
              }}>
                +${theirMoney}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 */}
        <div style={styles.footer}>
          {/* ▲ 더 요청 텍스트 버튼 */}
          <button
            onClick={handleDemandMore}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: '1.5px solid #dc2626',
              background: '#ffffff', color: '#dc2626',
              fontWeight: 700, fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Ico.ArrowUp s={12} c="#dc2626" />
            더 크게 제안 요청 (▲)
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.cancelBtn} onClick={handleCancel}>취소</button>
            <button
              onClick={handleReady}
              disabled={loading}
              style={{
                ...styles.primaryBtn,
                background: myReady ? '#ffffff' : '#166534',
                color: myReady ? '#166534' : '#ffffff',
                border: myReady ? '2px solid #166534' : '2px solid #166534',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? '...' : myReady ? '✓ Ready (취소)' : 'Ready!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 하위 호환 ─────────────────────────────────────────────
export function TradeResponseModal(props) {
  return <LiveTradeModal {...props} />;
}

// ── 공유 스타일 토큰 ──────────────────────────────────────
const styles = {
  shell: {
    background: '#ffffff',
    border: '2px solid #141414',
    borderRadius: 14,
    width: '100%',
    maxWidth: 760,
    maxHeight: '92dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 50px rgba(0,0,0,0.18)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '18px 20px 14px',
    borderBottom: '1.5px solid #e5e5e5',
    position: 'sticky',
    top: 0,
    background: '#ffffff',
    zIndex: 2,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: '#999',
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    color: '#141414',
    marginTop: 2,
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    background: 'none',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    width: 30, height: 30,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 120ms ease',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 44px 1fr',
    padding: '16px 20px',
    gap: 0,
    flex: 1,
  },
  panel: {
    border: '1.5px solid #d0d0d0',
    borderRadius: 10,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    transition: 'border-color 200ms ease',
  },
  panelLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  centerCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '0 2px',
  },
  swapCircle: {
    width: 36, height: 36,
    borderRadius: '50%',
    background: '#141414',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.16)',
  },
  moneyInput: {
    width: 90, padding: '6px 9px',
    fontSize: 15, fontWeight: 800,
    fontFamily: 'monospace',
    border: '1.5px solid #d0d0d0',
    borderRadius: 7,
    background: '#ffffff',
    outline: 'none',
  },
  summaryTag: {
    marginTop: 8,
    fontSize: 11, fontWeight: 700,
    padding: '5px 10px', borderRadius: 7,
    background: '#ffffff',
    border: '1px solid #d0d0d0',
    color: '#141414',
    display: 'inline-block',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px 16px',
    borderTop: '1.5px solid #e5e5e5',
    gap: 8,
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: 8,
    border: '1.5px solid #d0d0d0',
    background: '#ffffff',
    fontWeight: 700, fontSize: 13,
    cursor: 'pointer',
    color: '#141414',
  },
  primaryBtn: {
    padding: '9px 22px',
    borderRadius: 8,
    border: '2px solid #166534',
    background: '#166534',
    color: '#ffffff',
    fontWeight: 900, fontSize: 13,
    transition: 'all 150ms ease',
  },
};
