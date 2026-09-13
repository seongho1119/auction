// ============================================================
// ActionPanel.jsx — 내 플레이어 액션 패널 (하단)
// ============================================================

import { useState, useEffect } from 'react';
import { socket } from '../socket';
import { CardFace, Card3D, MiniCard } from './Card';
import { TradeProposalModal } from './TradeModal';
import { AbilityModal } from './AbilityModal';

// 세트 카드 가치 테이블
const SET_VALUE_TABLE = { 0: 80, 1: 60, 2: 45, 3: 30 };

function getCardSellValue(card, inventory) {
  if (!card || card.type === 'ability') return 0;
  if (card.isSet) {
    const owned = inventory.filter(c => c.isSet);
    if (owned.length < 3) return card.isReal ? card.realPrice : card.fakePrice;
    const fakeCount = owned.filter(c => !c.isReal).length;
    return SET_VALUE_TABLE[Math.min(fakeCount, 3)];
  }
  return card.isReal ? card.realPrice : card.fakePrice;
}

export function ActionPanel({ gameState, myId, onError, onSuccess }) {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [abilityCard, setAbilityCard] = useState(null);
  const [selectedAuctionCardId, setSelectedAuctionCardId] = useState(null);
  const [isDealing, setIsDealing] = useState(false);

  const myPlayer = gameState?.players?.find(p => p.id === myId);
  const isMyTurn = gameState?.players?.[gameState.turnIndex]?.id === myId;
  const auctionUsed = gameState?.turnActions?.auctionUsed;
  const tradeCount = gameState?.turnActions?.tradeCount || 0;
  const inventory = myPlayer?.inventory || [];

  // Interaction Lock trigger when inventory length grows (e.g. card deal)
  useEffect(() => {
    if (inventory.length > 0) {
      setIsDealing(true);
      const timer = setTimeout(() => setIsDealing(false), inventory.length * 150 + 600);
      return () => clearTimeout(timer);
    }
  }, [inventory.length]);

  const handleStartAuction = () => {
    if (isDealing) return;
    if (!selectedAuctionCardId) { onError?.('경매에 올릴 카드를 선택해 주세요.'); return; }
    socket.emit('auction:start', { cardId: selectedAuctionCardId }, (res) => {
      if (!res?.success) onError?.(res?.error || '경매 시작 실패');
      else { onSuccess?.('경매를 시작했습니다!'); setSelectedAuctionCardId(null); }
    });
  };

  const handleBankSell = (cardId) => {
    if (isDealing) return;
    socket.emit('bank:sell', { cardId }, (res) => {
      if (!res?.success) onError?.(res?.error || '은행 판매 실패');
      else onSuccess?.('판매 완료!');
    });
  };

  const handleEndTurn = () => {
    if (isDealing) return;
    socket.emit('turn:end', {}, (res) => {
      if (!res?.success) onError?.(res?.error || '턴 종료 실패');
    });
  };

  if (!myPlayer) return null;

  return (
    <>
      {/* Trade Modal */}
      {showTradeModal && (
        <TradeProposalModal
          gameState={gameState}
          myId={myId}
          onClose={() => setShowTradeModal(false)}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      {/* Ability Modal */}
      {abilityCard && (
        <AbilityModal
          card={abilityCard}
          gameState={gameState}
          myId={myId}
          onClose={() => setAbilityCard(null)}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      <div className="my-panel" style={{ position: 'relative' }}>
        {/* Interaction Lock overlay during dealing animation */}
        {isDealing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              background: 'rgba(0, 0, 0, 0.05)',
              cursor: 'wait',
              borderRadius: 'var(--r-lg)',
              pointerEvents: 'all',
            }}
          />
        )}

        {/* Top row: info + actions */}
        <div className="my-panel-top">
          <div className="my-info">
            <div>
              <div className="my-name">{myPlayer.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isMyTurn ? (
                  <span style={{ color: 'var(--accent)', fontWeight: 800 }}>▶ 내 턴</span>
                ) : (
                  <span>대기 중</span>
                )}
              </div>
            </div>
            <div className="my-money">${myPlayer.money}</div>
            {myPlayer.freeBankSell && (
              <span className="tag tag-gold">수수료 면제</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="my-actions">
            {/* 경매 부치기 */}
            {isMyTurn && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartAuction}
                disabled={isDealing || auctionUsed || !selectedAuctionCardId || gameState.auction?.active}
                title={auctionUsed ? '이번 턴 경매 사용 완료' : '선택한 카드를 경매에 올립니다'}
              >
                경매
                {auctionUsed && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>완료</span>}
              </button>
            )}

            {/* 거래 제안 */}
            {isMyTurn && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowTradeModal(true)}
                disabled={isDealing || tradeCount >= 2 || gameState.trade?.active}
                title={tradeCount >= 2 ? '이번 턴 거래 2회 완료' : `거래 (${tradeCount}/2회)`}
              >
                거래 ({tradeCount}/2)
              </button>
            )}

            {/* 턴 종료 */}
            {isMyTurn && (
              <button className="btn btn-danger btn-sm" onClick={handleEndTurn} disabled={isDealing}>
                턴 종료
              </button>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            인벤토리 ({inventory.length}장)
            {selectedAuctionCardId && isMyTurn && !auctionUsed && (
              <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: 8 }}>선택된 카드를 경매에 올릴 수 있습니다</span>
            )}
          </div>
          <div className="my-inventory" style={{ perspective: '1000px' }}>
            {inventory.length === 0 ? (
              <div className="inventory-empty">
                <span>[덱]</span> 카드가 없습니다
              </div>
            ) : (
              inventory.map((card, idx) => {
                const isSelected = selectedAuctionCardId === card.id;
                const isAbility = card.type === 'ability';
                const value = getCardSellValue(card, inventory);
                const fee = myPlayer.freeBankSell ? 0 : 10;
                const canBankSell = !isAbility && value > 10;
                const earnFromSell = canBankSell ? value - fee : 0;

                return (
                  <div
                    key={card.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  >
                    <CardFace
                      card={card}
                      faceDown={false}
                      selected={isSelected}
                      showRealBadge={true}
                      flightFrom={{ x: -140, y: -260 }}
                      staggerIndex={idx}
                      onClick={() => {
                        if (isDealing) return;
                        if (isAbility) {
                          setAbilityCard(card);
                        } else {
                          setSelectedAuctionCardId(prev => prev === card.id ? null : card.id);
                        }
                      }}
                    />
                    {/* Sell button */}
                    {isMyTurn && !isAbility && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '3px 8px' }}
                        onClick={() => handleBankSell(card.id)}
                        disabled={isDealing || !canBankSell}
                        title={canBankSell ? `은행에 $${earnFromSell} 판매` : '수수료 후 판매 불가'}
                      >
                        판매 ${earnFromSell > 0 ? earnFromSell : '×'}
                      </button>
                    )}
                    {/* Ability use badge */}
                    {isAbility && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '3px 8px', color: '#141414' }}
                        onClick={() => !isDealing && setAbilityCard(card)}
                        disabled={isDealing}
                      >
                        능력 사용
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
