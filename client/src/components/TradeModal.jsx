// ============================================================
// TradeModal.jsx — 거래 모달 (제안자 / 수락자 / 제3자 분기)
// ============================================================

import { useState } from 'react';
import { socket } from '../socket';
import { MiniCard } from './Card';

// 거래 제안 모달 (제안자가 보는 화면)
export function TradeProposalModal({ gameState, myId, onClose, onError, onSuccess }) {
  const [targetPlayerId, setTargetPlayerId] = useState(null);
  const [myOfferCards, setMyOfferCards] = useState([]);     // 내가 주는 카드 ID 배열
  const [myOfferMoney, setMyOfferMoney] = useState(0);      // 내가 주는 돈
  const [theirCards, setTheirCards] = useState([]);          // 상대에게 요청하는 카드 ID 배열
  const [theirMoney, setTheirMoney] = useState(0);           // 상대에게 요청하는 돈
  const [loading, setLoading] = useState(false);

  const myPlayer = gameState.players.find(p => p.id === myId);
  const otherPlayers = gameState.players.filter(p => p.id !== myId);
  const targetPlayer = targetPlayerId ? gameState.players.find(p => p.id === targetPlayerId) : null;
  const alreadyTraded = gameState.turnActions?.tradedWith || [];

  const toggleMyCard = (cardId) => {
    setMyOfferCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleTheirCard = (cardId) => {
    setTheirCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handlePropose = () => {
    if (!targetPlayerId) { onError?.('대상 플레이어를 선택해 주세요.'); return; }
    if (myOfferMoney < 0 || theirMoney < 0) { onError?.('금액은 0 이상이어야 합니다.'); return; }
    if (myOfferMoney > (myPlayer?.money || 0)) { onError?.('제시 금액이 잔액을 초과합니다.'); return; }
    if (myOfferMoney % 10 !== 0 || theirMoney % 10 !== 0) { onError?.('금액은 $10 단위여야 합니다.'); return; }

    setLoading(true);
    socket.emit('trade:propose', {
      targetId: targetPlayerId,
      offerCards: myOfferCards,
      offerMoney: myOfferMoney,
      requestCards: theirCards,
      requestMoney: theirMoney,
    }, (res) => {
      setLoading(false);
      if (!res?.success) onError?.(res?.error || '거래 제안 실패');
      else {
        onSuccess?.('거래를 제안했습니다!');
        onClose?.();
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bezel-outer trade-modal">
        <div className="bezel-inner" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90dvh' }}>
          {/* Header */}
          <div className="trade-modal-header">
            <div className="trade-modal-title">🤝 거래 제안</div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>

          {/* Step 1: 대상 선택 */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div className="target-select-label">거래 대상</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {otherPlayers.map(p => {
                const disabled = alreadyTraded.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`btn ${targetPlayerId === p.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => { setTargetPlayerId(p.id); setTheirCards([]); }}
                    disabled={disabled}
                    title={disabled ? '이미 이번 턴에 거래한 상대입니다.' : ''}
                  >
                    👤 {p.name} {disabled ? '(완료)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body: 두 영역 */}
          <div className="trade-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
            {/* 내가 주는 것 */}
            <div className="trade-side">
              <div className="trade-side-title">내가 주는 것 (나: {myPlayer?.name})</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>카드 선택 (클릭)</div>
                <div className="trade-cards-grid">
                  {(myPlayer?.inventory || []).map(c => (
                    <MiniCard
                      key={c.id}
                      card={c}
                      selected={myOfferCards.includes(c.id)}
                      onClick={() => toggleMyCard(c.id)}
                      showRealBadge={true}
                    />
                  ))}
                  {!myPlayer?.inventory?.length && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>카드 없음</div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  현금 (잔액: ${myPlayer?.money ?? 0})
                </div>
                <input
                  type="number"
                  className="trade-money-input"
                  value={myOfferMoney}
                  min={0}
                  max={myPlayer?.money || 0}
                  step={10}
                  onChange={e => setMyOfferMoney(Math.max(0, Math.round(Number(e.target.value) / 10) * 10))}
                />
                <span style={{ marginLeft: 8, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>달러</span>
              </div>

              {/* 선택 요약 */}
              {(myOfferCards.length > 0 || myOfferMoney > 0) && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(197,163,90,0.06)', border: '1px solid var(--border-gold)', borderRadius: 8, padding: '6px 10px' }}>
                  카드 {myOfferCards.length}장 + ${myOfferMoney}
                </div>
              )}
            </div>

            {/* 중간 화살표 */}
            <div className="trade-divider">
              <span className="trade-arrow">⇄</span>
            </div>

            {/* 상대에게 요청하는 것 */}
            <div className="trade-side">
              <div className="trade-side-title">
                {targetPlayer ? `${targetPlayer.name}에게 요청` : '대상을 선택하세요'}
              </div>
              {targetPlayer ? (
                <>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>카드 선택 (클릭)</div>
                    <div className="trade-cards-grid">
                      {(targetPlayer?.inventory || []).map(c => (
                        <MiniCard
                          key={c.id}
                          card={{ ...c, isReal: undefined }} // isReal 숨김
                          selected={theirCards.includes(c.id)}
                          onClick={() => toggleTheirCard(c.id)}
                          showRealBadge={false}
                        />
                      ))}
                      {!targetPlayer?.inventory?.length && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>카드 없음</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      현금 (잔액: ${targetPlayer?.money ?? 0})
                    </div>
                    <input
                      type="number"
                      className="trade-money-input"
                      value={theirMoney}
                      min={0}
                      max={targetPlayer?.money || 0}
                      step={10}
                      onChange={e => setTheirMoney(Math.max(0, Math.round(Number(e.target.value) / 10) * 10))}
                    />
                    <span style={{ marginLeft: 8, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>달러</span>
                  </div>
                  {(theirCards.length > 0 || theirMoney > 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(197,163,90,0.06)', border: '1px solid var(--border-gold)', borderRadius: 8, padding: '6px 10px' }}>
                      카드 {theirCards.length}장 + ${theirMoney}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                  위에서 거래 상대를 선택하세요
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="trade-modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button
              className="btn btn-primary"
              onClick={handlePropose}
              disabled={!targetPlayerId || loading}
            >
              {loading ? <span className="animate-spin">⟳</span> : '🤝'}
              <span>{loading ? '제안 중...' : '거래 제안'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 거래 수락/거절 모달 (수락자가 보는 화면)
export function TradeResponseModal({ gameState, myId, onClose, onError, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const trade = gameState.trade;
  const proposer = gameState.players.find(p => p.id === trade?.proposerId);
  const target = gameState.players.find(p => p.id === trade?.targetId);
  const myPlayer = gameState.players.find(p => p.id === myId);

  // 내가 주는 카드 (요청된 카드)
  const cardsIGive = (myPlayer?.inventory || []).filter(c => (trade?.request?.cards || []).includes(c.id));
  const moneyIGive = trade?.request?.money || 0;
  // 내가 받는 카드 (제안된 카드)
  const cardsIGet = (proposer?.inventory || []).filter(c => (trade?.offer?.cards || []).includes(c.id));
  const moneyIGet = trade?.offer?.money || 0;

  const handleRespond = (accepted) => {
    setLoading(true);
    socket.emit('trade:respond', { accepted }, (res) => {
      setLoading(false);
      if (!res?.success) onError?.(res?.error || '거래 응답 실패');
      else {
        onSuccess?.(accepted ? '거래 성사!' : '거래 거절');
        onClose?.();
      }
    });
  };

  if (!trade?.active || trade.status !== 'pending') return null;

  return (
    <div className="modal-overlay">
      <div className="bezel-outer trade-modal">
        <div className="bezel-inner" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="trade-modal-header">
            <div>
              <div className="tag tag-gold" style={{ marginBottom: 6 }}>📨 거래 제안 수신</div>
              <div className="trade-modal-title">{proposer?.name}이(가) 거래를 제안했습니다!</div>
            </div>
          </div>

          <div className="trade-modal-body" style={{ overflowY: 'auto' }}>
            {/* 내가 받는 것 */}
            <div className="trade-side">
              <div className="trade-side-title">내가 받는 것</div>
              <div className="trade-cards-grid">
                {cardsIGet.map(c => (
                  <MiniCard key={c.id} card={{ ...c, isReal: undefined }} showRealBadge={false} />
                ))}
                {cardsIGet.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>카드 없음</div>}
              </div>
              {moneyIGet > 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--emerald)' }}>
                  +${moneyIGet}
                </div>
              )}
            </div>

            <div className="trade-divider">
              <span className="trade-arrow" style={{ fontSize: 28 }}>⇄</span>
            </div>

            {/* 내가 주는 것 */}
            <div className="trade-side">
              <div className="trade-side-title">내가 주는 것</div>
              <div className="trade-cards-grid">
                {cardsIGive.map(c => (
                  <MiniCard key={c.id} card={c} showRealBadge={true} />
                ))}
                {cardsIGive.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>카드 없음</div>}
              </div>
              {moneyIGive > 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--rose)' }}>
                  -${moneyIGive}
                </div>
              )}
            </div>
          </div>

          <div className="trade-modal-footer">
            <button
              className="btn btn-danger"
              onClick={() => handleRespond(false)}
              disabled={loading}
            >
              ❌ 거절
            </button>
            <button
              className="btn btn-emerald"
              onClick={() => handleRespond(true)}
              disabled={loading}
            >
              {loading ? <span className="animate-spin">⟳</span> : '✅'}
              <span>{loading ? '처리 중...' : '수락'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
