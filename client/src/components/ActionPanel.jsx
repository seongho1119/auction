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
  const [filterType, setFilterType] = useState('all'); // 'all' | 'item' | 'ability'

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

  const filteredInventory = inventory.filter(card => {
    if (filterType === 'item') return card.type !== 'ability';
    if (filterType === 'ability') return card.type === 'ability';
    return true;
  });

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

      <div className="my-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px', background: '#FFF5E2', borderTop: '3.5px solid #141414' }}>
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

        {/* Top row: Info + Filter Buttons + Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div className="my-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div className="my-name" style={{ fontSize: 15, fontWeight: 800, color: '#141414' }}>{myPlayer.name}</div>
              <div style={{ fontSize: 11, color: '#6b6b6b' }}>
                {isMyTurn ? (
                  <span style={{ color: '#E14731', fontWeight: 900 }}>▶ 내 턴</span>
                ) : (
                  <span>대기 중</span>
                )}
              </div>
            </div>
            <div className="my-money" style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 900, color: '#44A32A' }}>
              ${myPlayer.money}
            </div>
            {myPlayer.freeBankSell && (
              <span className="tag tag-gold" style={{ fontSize: 9 }}>수수료 면제</span>
            )}
          </div>

          {/* Filter tabs & Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Card Filter Tabs (물건 / 능력) */}
            <div style={{ display: 'flex', background: '#ffffff', border: '1.5px solid #141414', borderRadius: 'var(--r-md)', padding: 2 }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: filterType === 'all' ? '#141414' : 'transparent',
                  color: filterType === 'all' ? '#ffffff' : '#141414',
                  cursor: 'pointer',
                }}
              >
                전체 ({inventory.length})
              </button>
              <button
                onClick={() => setFilterType('item')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: filterType === 'item' ? '#141414' : 'transparent',
                  color: filterType === 'item' ? '#ffffff' : '#141414',
                  cursor: 'pointer',
                }}
              >
                물건 ({inventory.filter(c => c.type !== 'ability').length})
              </button>
              <button
                onClick={() => setFilterType('ability')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: filterType === 'ability' ? '#141414' : 'transparent',
                  color: filterType === 'ability' ? '#ffffff' : '#141414',
                  cursor: 'pointer',
                }}
              >
                능력 ({inventory.filter(c => c.type === 'ability').length})
              </button>
            </div>

            {/* Action buttons */}
            <div className="my-actions" style={{ display: 'flex', gap: 6 }}>
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

              {isMyTurn && (
                <button className="btn btn-danger btn-sm" onClick={handleEndTurn} disabled={isDealing}>
                  턴 종료
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Horizontal Row (No vertical stacking!) */}
        <div
          className="my-inventory"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            padding: '4px 2px 10px 2px',
            perspective: '1000px',
            minHeight: 148,
          }}
        >
          {filteredInventory.length === 0 ? (
            <div className="inventory-empty" style={{ width: '100%', padding: '20px 0', textAlign: 'center', fontSize: 12, color: '#6b6b6b' }}>
              선택한 분류의 카드가 없습니다
            </div>
          ) : (
            filteredInventory.map((card, idx) => {
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
                    flightFrom={{ x: 200, y: -240 }} // Fly from central deck object position
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
                      style={{ fontSize: 10, padding: '3px 8px', background: '#ffffff', border: '1px solid #141414' }}
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
                      style={{ fontSize: 10, padding: '3px 8px', color: '#141414', background: '#FFF5E2', border: '1px solid #141414', fontWeight: 800 }}
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
    </>
  );
}
