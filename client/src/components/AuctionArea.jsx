// ============================================================
// AuctionArea.jsx — 경매 영역 컴포넌트
// ============================================================

import { useState } from 'react';
import { socket } from '../socket';
import { Card } from './Card';

export function AuctionArea({ gameState, myId, myPlayer, onError, onSuccess }) {
  const { auction, deck = [] } = gameState;
  const [bidAmount, setBidAmount] = useState(10);
  const isMyTurn = gameState.players[gameState.turnIndex]?.id === myId;
  const isActive = auction?.active;
  const isSeller = auction?.sellerId === myId;

  const currentHighBidder = isActive && auction.highestBidderId
    ? gameState.players.find(p => p.id === auction.highestBidderId)
    : null;

  const minBid = (auction?.currentBid || 0) + 10;

  const handleBid = () => {
    if (bidAmount < minBid) {
      onError?.(`최소 $${minBid} 이상 입찰해야 합니다.`);
      return;
    }
    socket.emit('auction:bid', { amount: bidAmount }, (res) => {
      if (!res?.success) onError?.(res?.error || '입찰 실패');
      else {
        onSuccess?.(`$${bidAmount} 입찰 완료!`);
        setBidAmount(bidAmount + 10);
      }
    });
  };

  const handleClose = () => {
    socket.emit('auction:close', {}, (res) => {
      if (!res?.success) onError?.(res?.error || '낙찰 처리 실패');
    });
  };

  const handleDraw = () => {
    socket.emit('deck:draw', {}, (res) => {
      if (!res?.success) onError?.(res?.error || '카드 뽑기 실패');
      else onSuccess?.('카드를 뽑았습니다!');
    });
  };

  return (
    <div className={`auction-area ${isActive ? 'active' : ''}`}>
      {/* Title */}
      <div className={`auction-title ${isActive ? 'active-text' : ''}`}>
        {isActive ? '🔨 경매 진행 중' : '경매장'}
      </div>

      {/* Auction Card */}
      {isActive && auction.card ? (
        <div className="flex flex-col items-center gap-4">
          <div className="auction-card-slot">
            <Card
              card={auction.card}
              faceDown={false}
              size="auction"
              showRealBadge={false}
            />
            {auction.currentBid > 0 && (
              <div className="auction-price-badge">
                현재가: ${auction.currentBid}
              </div>
            )}
          </div>

          {/* Current highest bidder */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {currentHighBidder
              ? <span>최고 입찰: <strong style={{ color: 'var(--gold)' }}>{currentHighBidder.name}</strong> $<strong style={{ color: 'var(--gold)' }}>{auction.currentBid}</strong></span>
              : <span>아직 입찰자 없음</span>}
          </div>

          {/* Bid history */}
          {auction.bids?.length > 0 && (
            <div className="auction-bidders" style={{ maxHeight: 100, overflowY: 'auto' }}>
              {[...auction.bids].reverse().slice(0, 5).map((b, i) => {
                const p = gameState.players.find(pl => pl.id === b.playerId);
                return (
                  <div key={i} className={`bid-entry ${i === 0 ? 'top-bid' : ''}`}>
                    <span className="bid-player">{p?.name || '?'}</span>
                    <span className="bid-amount">${b.amount}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bid controls */}
          {!isSeller && (
            <div className="bid-controls">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setBidAmount(Math.max(minBid, bidAmount - 10))}
              >−</button>
              <input
                type="number"
                className="bid-amount-input"
                value={bidAmount}
                min={minBid}
                step={10}
                onChange={e => setBidAmount(Math.max(minBid, Math.round(Number(e.target.value) / 10) * 10))}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setBidAmount(bidAmount + 10)}
              >+</button>
              <button
                className="btn btn-primary"
                onClick={handleBid}
                disabled={!myPlayer || myPlayer.money < bidAmount}
              >
                $입찰
              </button>
            </div>
          )}

          {/* Close auction (turn player only) */}
          {isMyTurn && (
            <button className="btn btn-secondary btn-sm" onClick={handleClose}>
              {auction.highestBidderId ? '✅ 낙찰 처리' : '❌ 유찰 처리'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>🔨</div>
          경매 중인 물품이 없습니다
        </div>
      )}

      {/* Deck Info */}
      <div className="section-divider" style={{ width: '100%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
        <div className="deck-info">
          <span style={{ fontSize: 20 }}>📦</span>
          <div>
            <div className="deck-count">{deck.length}</div>
            <div className="deck-label">덱 잔여</div>
          </div>
        </div>

        {isMyTurn && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDraw}
            disabled={myPlayer?.money < 20 || deck.length === 0}
            title={`$20을 내고 카드 1장 뽑기 (현재 잔액: $${myPlayer?.money ?? 0})`}
          >
            🃏 뽑기 ($20)
          </button>
        )}
      </div>
    </div>
  );
}
