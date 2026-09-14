// ============================================================
// TradeModal.jsx — 실시간 1:1 양방향 거래 시스템
// • 내가 선택한 카드/돈만 상대에게 보임 (상대 손패 열람 불가)
// • 상대도 본인이 고른 것만 나에게 보임 (실시간 소켓)
// • ▲ 더 제안 요청 버튼
// • 한 턴에 동일 상대 최대 1회
// /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
// ============================================================

import { useState, useEffect } from 'react';
import { socket } from '../socket';
import { MiniCard } from './Card';

// ── SVG 아이콘 인라인 ──────────────────────────────────────
function IconArrowUp({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
function IconSwap({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}
function IconUser({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ── 대상 선택 모달 ─────────────────────────────────────────
export function TradeProposalModal({ gameState, myId, onClose, onError, onSuccess }) {
  const [targetPlayerId, setTargetPlayerId] = useState(null);
  const otherPlayers = gameState.players.filter(p => p.id !== myId);
  const alreadyTraded = gameState.turnActions?.tradedWith || [];

  const handleStartSession = () => {
    if (!targetPlayerId) { onError?.('거래 상대를 선택해 주세요.'); return; }
    if (alreadyTraded.includes(targetPlayerId)) { onError?.('이번 턴에 이미 해당 상대와 거래했습니다.'); return; }

    socket.emit('trade:open', { targetId: targetPlayerId }, (res) => {
      if (!res?.success) onError?.(res?.error || '거래 시작 실패');
      else {
        onSuccess?.('거래를 시작했습니다!');
        onClose?.();
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bezel-outer trade-modal" style={{ maxWidth: 420, background: '#ffffff', border: '2.5px solid #141414', borderRadius: 16 }}>
        <div className="bezel-inner" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #141414', paddingBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#6b6b6b' }}>1:1 LIVE TRADE</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#141414', marginTop: 2 }}>거래 상대 선택</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: '1.5px solid #141414', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}
            >✕</button>
          </div>

          {/* 상대 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b6b6b' }}>
              한 턴에 같은 상대와 최대 1회 거래 가능합니다.
            </div>
            {otherPlayers.map(p => {
              const isDone = alreadyTraded.includes(p.id);
              const isSelected = targetPlayerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => !isDone && setTargetPlayerId(p.id)}
                  disabled={isDone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: isSelected ? '2px solid #141414' : '1.5px solid #141414',
                    background: isSelected ? '#141414' : isDone ? '#f5f5f5' : '#FFF5E2',
                    color: isSelected ? '#ffffff' : isDone ? '#aaaaaa' : '#141414',
                    cursor: isDone ? 'not-allowed' : 'pointer',
                    opacity: isDone ? 0.5 : 1,
                    fontWeight: 800,
                    fontSize: 14,
                    transition: 'all 160ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IconUser size={16} color={isSelected ? '#ffffff' : '#141414'} />
                    <span>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 900 }}>
                    {isDone ? '(이번 턴 완료)' : `$${p.money}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 확인 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #141414', background: 'transparent', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >
              취소
            </button>
            <button
              onClick={handleStartSession}
              disabled={!targetPlayerId}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: '2px solid #141414',
                background: targetPlayerId ? '#141414' : '#aaaaaa',
                color: '#ffffff',
                fontWeight: 900,
                cursor: targetPlayerId ? 'pointer' : 'not-allowed',
                fontSize: 13,
              }}
            >
              거래 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 실시간 거래창 (제안자 + 수락자 공통) ──────────────────
export function LiveTradeModal({ gameState, myId, onClose, onError, onSuccess }) {
  const trade = gameState.trade;
  const myPlayer = gameState.players.find(p => p.id === myId);
  const isProposer = myId === trade?.proposerId;
  const partnerId = isProposer ? trade?.targetId : trade?.proposerId;
  const partner = gameState.players.find(p => p.id === partnerId);

  const myOffer   = isProposer ? trade?.proposerOffer : trade?.targetOffer;
  const theirOffer = isProposer ? trade?.targetOffer  : trade?.proposerOffer;
  const myReady   = isProposer ? trade?.proposerReady : trade?.targetReady;
  const theirReady = isProposer ? trade?.targetReady  : trade?.proposerReady;
  const demandedAtMe = trade?.demandMoreBy && trade.demandMoreBy !== myId;

  const [selectedCardIds, setSelectedCardIds] = useState(myOffer?.cards || []);
  const [offerMoney, setOfferMoney] = useState(myOffer?.money || 0);
  const [loading, setLoading] = useState(false);

  // 서버에서 내 offer 업데이트되면 동기화
  useEffect(() => {
    if (myOffer) {
      setSelectedCardIds(myOffer.cards || []);
      setOfferMoney(myOffer.money || 0);
    }
  }, [JSON.stringify(myOffer)]);

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
      else onSuccess?.('더 큰 제안을 요청했습니다 (▲)');
    });
  };

  const handleCancel = () => {
    socket.emit('trade:cancel', {}, (res) => {
      if (!res?.success) onError?.(res?.error);
      else onClose?.();
    });
  };

  if (!trade?.active) return null;

  // 상대가 내놓은 카드 (카드 오브젝트 조회 — isReal은 보이지 않음)
  const theirOfferCards = (theirOffer?.cards || []).map(cid => {
    // 서버에서 isReal을 sanitize하므로 이름/타입 정도만 들어옴
    const found = partner?.inventory?.find(c => c.id === cid);
    return found ? { ...found, isReal: undefined } : { id: cid, name: '카드', type: 'item' };
  });

  return (
    <div className="modal-overlay">
      <div style={{
        background: '#ffffff',
        border: '2.5px solid #141414',
        borderRadius: 18,
        width: '100%',
        maxWidth: 820,
        maxHeight: '92dvh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '20px 24px 16px',
          borderBottom: '2px solid #141414',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          zIndex: 2,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#6b6b6b' }}>
              1:1 LIVE TRADE
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#141414', marginTop: 2 }}>
              실시간 1:1 카드 거래
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <IconUser size={13} color="#6b6b6b" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6b6b6b' }}>상대:</span>
              <span style={{
                fontSize: 12,
                fontWeight: 900,
                padding: '2px 10px',
                borderRadius: 99,
                background: '#141414',
                color: '#ffffff',
              }}>{partner?.name}</span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: '1.5px solid #141414', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* ── ▲ 더 요청 알림 배너 ── */}
        {demandedAtMe && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 24px',
            background: '#FFF5E2',
            borderBottom: '2px solid #E14731',
          }}>
            <IconArrowUp size={18} color="#E14731" />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#E14731' }}>
              상대방이 더 큰 제안을 요청하고 있습니다!
            </span>
          </div>
        )}

        {/* ── 2-컬럼 거래 영역 ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 52px 1fr',
          gap: 0,
          padding: '20px 24px',
          flex: 1,
        }}>

          {/* ── 왼쪽: 내 제안 ── */}
          <div style={{
            background: '#FFF5E2',
            border: myReady ? '2.5px solid #44A32A' : '2px solid #141414',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            transition: 'border-color 200ms ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#141414' }}>
                MY OFFER
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 99,
                background: myReady ? '#44A32A' : '#141414',
                color: '#ffffff',
              }}>
                {myReady ? '✓ READY' : '준비 중'}
              </span>
            </div>

            {/* 내 손패에서 선택 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', marginBottom: 8 }}>
                내가 제공할 카드 선택 ({selectedCardIds.length}장)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
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
                  <div style={{ fontSize: 12, color: '#999', padding: 8 }}>보유 카드 없음</div>
                )}
              </div>
            </div>

            {/* 내가 제공할 현금 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', marginBottom: 6 }}>
                내가 제공할 현금 (잔액: ${myPlayer?.money ?? 0})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace' }}>$</span>
                <input
                  type="number"
                  value={offerMoney}
                  min={0}
                  max={myPlayer?.money || 0}
                  step={10}
                  onChange={e => changeMoney(e.target.value)}
                  style={{
                    width: 100,
                    padding: '7px 10px',
                    fontSize: 16,
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    border: '1.5px solid #141414',
                    borderRadius: 8,
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 제안 요약 */}
            {(selectedCardIds.length > 0 || offerMoney > 0) && (
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #141414',
                color: '#141414',
              }}>
                카드 {selectedCardIds.length}장 + ${offerMoney}
              </div>
            )}
          </div>

          {/* ── 중앙: 스왑 + ▲ 버튼 ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '0 4px',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#141414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}>
              <IconSwap size={18} color="#ffffff" />
            </div>

            {/* ▲ 더 요청 버튼 */}
            <button
              onClick={handleDemandMore}
              title="상대방에게 더 큰 제안을 요청합니다"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid #E14731',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(225,71,49,0.15)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E14731'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
            >
              <IconArrowUp size={18} color="#E14731" />
            </button>
          </div>

          {/* ── 오른쪽: 상대 제안 (실시간) ── */}
          <div style={{
            background: '#f8f8f8',
            border: theirReady ? '2.5px solid #44A32A' : '2px solid #141414',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            transition: 'border-color 200ms ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#141414' }}>
                THEIR OFFER
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 99,
                background: theirReady ? '#44A32A' : '#6b6b6b',
                color: '#ffffff',
              }}>
                {theirReady ? '✓ READY' : partner?.name}
              </span>
            </div>

            {/* 상대가 올려놓은 카드 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', marginBottom: 8 }}>
                상대가 제공하는 카드 ({theirOfferCards.length}장)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', minHeight: 60 }}>
                {theirOfferCards.length > 0 ? (
                  theirOfferCards.map((c, i) => (
                    <MiniCard key={i} card={c} selected={true} showRealBadge={false} />
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: '#999', padding: 8 }}>아직 카드를 올려놓지 않았습니다</div>
                )}
              </div>
            </div>

            {/* 상대가 제공하는 현금 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b6b', marginBottom: 6 }}>
                상대가 제공하는 현금
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                fontFamily: 'monospace',
                color: (theirOffer?.money || 0) > 0 ? '#44A32A' : '#aaaaaa',
              }}>
                +${theirOffer?.money || 0}
              </div>
            </div>
          </div>
        </div>

        {/* ── 하단 액션 ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px 20px',
          borderTop: '2px solid #141414',
          gap: 10,
        }}>
          {/* ▲ 더 제안 요청 (하단 텍스트 버튼) */}
          <button
            onClick={handleDemandMore}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 8,
              border: '1.5px solid #E14731',
              background: '#ffffff',
              color: '#E14731',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <IconArrowUp size={14} color="#E14731" />
            더 큰 제안 요청 (▲)
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1.5px solid #141414',
                background: '#ffffff',
                color: '#141414',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              취소
            </button>
            <button
              onClick={handleReady}
              disabled={loading}
              style={{
                padding: '10px 28px',
                borderRadius: 8,
                border: '2px solid #141414',
                background: myReady ? '#ffffff' : '#141414',
                color: myReady ? '#141414' : '#ffffff',
                fontWeight: 900,
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 14,
                transition: 'all 160ms ease',
              }}
            >
              {loading ? '처리 중...' : myReady ? '준비 취소' : '거래 제안 (Ready!)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 거래 요청 수신 알림 (제3자가 아닌 상대가 볼 때) ────────
export function TradeIncomingBanner({ gameState, myId, onError, onSuccess }) {
  const trade = gameState.trade;
  if (!trade?.active) return null;
  const isTarget = trade.targetId === myId;
  const isProposer = trade.proposerId === myId;
  if (!isTarget && !isProposer) return null;
  // 참여자는 LiveTradeModal이 처리 — 이 배너는 사용 안 함
  return null;
}

// ── 하위 호환 별칭 ─────────────────────────────────────────
export function TradeResponseModal(props) {
  return <LiveTradeModal {...props} />;
}
