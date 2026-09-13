// ============================================================
// GameBoard.jsx — 메인 게임 보드 (Premium Redesign)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { socket } from '../socket';
import { CardFace, MiniCard } from './Card';
import { EventLog } from './EventLog';
import { TradeProposalModal, TradeResponseModal } from './TradeModal';
import { AbilityModal } from './AbilityModal';
import { IconCrown, IconUser, IconMask, IconGem, IconHammer } from './SvgIcons';

const PLAYER_ICONS = [IconCrown, IconUser, IconMask, IconGem];
const SET_VALUE_TABLE = { 0: 80, 1: 60, 2: 45, 3: 30 };

function getCardValue(card, inventory) {
  if (!card || card.type === 'ability') return 0;
  if (card.isSet) {
    const owned = inventory.filter(c => c.isSet);
    if (owned.length < 3) return card.isReal ? card.realPrice : card.fakePrice;
    const fakeCount = owned.filter(c => !c.isReal).length;
    return SET_VALUE_TABLE[Math.min(fakeCount, 3)];
  }
  return card.isReal ? card.realPrice : card.fakePrice;
}

export function GameBoard({ gameState, myId, playerName, onError, onSuccess }) {
  const [bidAmount, setBidAmount] = useState(10);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [abilityCard, setAbilityCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const boardRef = useRef(null);
  const prevRoundRef = useRef(null);
  const [showRoundBanner, setShowRoundBanner] = useState(null);

  const { players = [], turnIndex, auction, trade, log = [], turnActions = {}, roundIndex = 0 } = gameState || {};

  // Reliable player matching (by socket ID or by player Name fallback)
  const me = players.find(p => p.id === myId) || (playerName ? players.find(p => p.name === playerName) : null) || players[0];
  const opponents = me ? players.filter(p => p.id !== me.id) : players;
  const currentPlayer = players[turnIndex];
  const isMyTurn = currentPlayer?.id === me?.id;

  // Synced deck counts across all players
  const totalDeckCount = gameState.deckCount ?? gameState.deck?.length ?? 0;
  const itemCardsInDeck = gameState.deckItemCount ?? gameState.deck?.filter?.(c => c?.type === 'item')?.length ?? 0;

  // Board entry & Card Dealing GSAP Animation
  useEffect(() => {
    if (!boardRef.current) return;
    gsap.from('.board-top', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('.auction-zone', { scale: 0.96, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
    gsap.from('.my-panel', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 });
  }, []);

  // Card dealing animation when round advances
  useEffect(() => {
    if (prevRoundRef.current !== null && roundIndex > prevRoundRef.current) {
      setShowRoundBanner(roundIndex);
      // Trigger fly-out card deal animation
      gsap.fromTo('.poker-card-fly', 
        { scale: 0.2, x: 0, y: 0, opacity: 1 },
        { scale: 1, y: 140, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out' }
      );
      setTimeout(() => setShowRoundBanner(null), 2500);
    }
    prevRoundRef.current = roundIndex;
  }, [roundIndex]);

  const needsTradeResponse = trade?.active && trade?.status === 'pending' && trade?.targetId === me?.id;
  const isThirdParty = trade?.active && trade?.proposerId !== me?.id && trade?.targetId !== me?.id;
  const tradeNames = isThirdParty ? {
    proposer: players.find(p => p.id === trade.proposerId)?.name,
    target: players.find(p => p.id === trade.targetId)?.name,
  } : null;

  const handleBid = () => {
    const amt = Math.round(bidAmount / 10) * 10;
    socket.emit('auction:bid', { amount: amt }, res => {
      if (!res?.success) onError?.(res?.error);
      else { onSuccess?.(`$${amt} 입찰!`); setBidAmount(amt + 10); }
    });
  };

  const handleCloseAuction = () => {
    socket.emit('auction:close', {}, res => {
      if (!res?.success) onError?.(res?.error);
    });
  };

  const handleStartAuction = () => {
    if (!selectedCardId) { onError?.('경매에 올릴 카드를 선택하세요'); return; }
    socket.emit('auction:start', { cardId: selectedCardId }, res => {
      if (!res?.success) onError?.(res?.error);
      else { onSuccess?.('경매 시작!'); setSelectedCardId(null); }
    });
  };

  const handleDeckDraw = () => {
    socket.emit('deck:draw', {}, res => {
      if (!res?.success) onError?.(res?.error);
      else onSuccess?.('카드를 뽑았습니다!');
    });
  };

  const handleBankSell = (cardId) => {
    socket.emit('bank:sell', { cardId }, res => {
      if (!res?.success) onError?.(res?.error);
      else onSuccess?.('은행 판매 완료');
    });
  };

  const handleEndTurn = () => {
    socket.emit('turn:end', {}, res => {
      if (!res?.success) onError?.(res?.error);
    });
  };

  const oppCount = opponents.length;
  const topClass = `board-top players-${Math.min(oppCount + 1, 4)}`;

  if (!me) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>게임 상태 로딩 중...</span>
    </div>
  );

  return (
    <div className="board-root" ref={boardRef}>
      {/* ── TOP: Opponents ── */}
      <div className={topClass}>
        {opponents.map((opp) => {
          const pi = players.findIndex(p => p.id === opp.id);
          const active = opp.id === currentPlayer?.id;
          return (
            <div key={opp.id} className={`opp-panel${active ? ' active' : ''}`}>
              {active && <div className="turn-pip">턴</div>}
              <div className="opp-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const IconComp = PLAYER_ICONS[pi % PLAYER_ICONS.length] || IconUser;
                  return <IconComp className="w-5 h-5" color="var(--text-primary)" />;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="opp-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.name}</div>
                <div className="opp-money">${opp.money}</div>
              </div>
              <div className="opp-card-count">
                {typeof opp.inventoryCount === 'number' ? opp.inventoryCount : opp.inventory?.length ?? 0}장
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MIDDLE: 3-column Poker Felt Surface ── */}
      <div className="board-middle">
        {/* Col 1: Auction & Center Deck Zone */}
        <div className={`auction-zone${auction?.active ? ' live' : ''}`}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={`auction-zone-label${auction?.active ? ' live-label' : ''}`}>
              {auction?.active ? '경매 진행 중' : '경매 보드'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="deck-pill">
                <span className="deck-count">{totalDeckCount}</span>
                <span className="deck-label">덱</span>
              </div>
              <div className="round-badge">R{roundIndex + 1}</div>
            </div>
          </div>

          {auction?.active && auction.card ? (
            <>
              {/* Auction card display */}
              <div style={{ position: 'relative' }}>
                <CardFace
                  card={auction.card}
                  size="lg"
                  showRealBadge={me?.revealedCards?.includes(auction.card.id)}
                />
                {auction.highestBidderId && (
                  <div style={{ position: 'absolute', top: -8, right: -8 }}>
                    <div className="tag tag-gold animate-glow" style={{ fontSize: 11, padding: '4px 10px' }}>
                      ${ auction.currentBid}
                    </div>
                  </div>
                )}
              </div>

              {/* Bid history */}
              {auction.bids?.length > 0 && (
                <div className="bid-history">
                  {[...auction.bids].reverse().map((b, i) => {
                    const bidder = players.find(p => p.id === b.playerId);
                    const isTop = b.playerId === auction.highestBidderId && i === 0;
                    return (
                      <div key={i} className={`bid-row${isTop ? ' top' : ''}`}>
                        <span className="bid-name">{bidder?.name ?? '?'}</span>
                        <span className="bid-amt">${b.amount}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bid controls (for non-sellers) */}
              {auction.sellerId !== myId && (
                <div className="bid-controls">
                  <input
                    type="number"
                    className="bid-number-input"
                    min={auction.currentBid + 10}
                    step={10}
                    value={bidAmount}
                    onChange={e => setBidAmount(Number(e.target.value))}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleBid}>
                    입찰
                  </button>
                </div>
              )}

              {/* Close auction (seller, my turn) */}
              {auction.sellerId === myId && isMyTurn && (
                <button className="btn btn-emerald btn-sm" onClick={handleCloseAuction}>
                  낙찰 종료
                </button>
              )}

              {/* Item cards in deck indicator */}
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                물건 카드 잔여: {itemCardsInDeck}장
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.5 }}>
              <IconHammer className="w-10 h-10" color="var(--text-muted)" />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>경매 대기 중</div>
            </div>
          )}

          {/* My turn quick actions */}
          {isMyTurn && !auction?.active && (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1, fontSize: 11 }}
                onClick={handleDeckDraw}
                disabled={!gameState.deck?.length || me.money < 20}
                title="$20을 내고 덱에서 카드를 뽑습니다"
              >
                뽑기 $20
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: 11 }}
                onClick={() => setShowTradeModal(true)}
                disabled={turnActions.tradeCount >= 2 || trade?.active}
                title={`거래 (${turnActions.tradeCount ?? 0}/2회)`}
              >
                거래 {turnActions.tradeCount ?? 0}/2
              </button>
            </div>
          )}
        </div>

        {/* Col 2: Event Log */}
        <EventLog logs={log} />

        {/* Col 3: Status Panel */}
        <div className="status-panel">
          <div className="status-label">현황</div>

          <div className={`status-item${isMyTurn ? ' highlight' : ''}`}>
            <div className="status-item-label">현재 턴</div>
            <div className={`status-item-value${isMyTurn ? ' gold' : ''}`}>
              {currentPlayer?.name}
              {isMyTurn && <span className="tag tag-gold" style={{ marginLeft: 6, fontSize: 8 }}>내 턴</span>}
            </div>
          </div>

          <div className="status-item">
            <div className="status-item-label">라운드</div>
            <div className="status-item-value violet">R{roundIndex + 1}</div>
          </div>

          <div className="status-item">
            <div className="status-item-label">남은 물건 카드</div>
            <div className="status-item-value">{itemCardsInDeck}장</div>
          </div>

          {isMyTurn && (
            <div className="status-item">
              <div className="status-item-label">이번 턴 행동</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <div className="action-row">
                  <div className={`action-check${turnActions.auctionUsed ? ' done' : ''}`}>
                    {turnActions.auctionUsed ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 12 }}>경매</span>
                </div>
                <div className="action-row">
                  <div className={`action-check${(turnActions.tradeCount ?? 0) >= 2 ? ' done' : ''}`}>
                    {turnActions.tradeCount ?? 0}/2
                  </div>
                  <span style={{ fontSize: 12 }}>거래</span>
                </div>
              </div>
            </div>
          )}

          {isMyTurn && (
            <button className="btn btn-danger btn-sm w-full" style={{ marginTop: 'auto' }} onClick={handleEndTurn}>
              턴 종료
            </button>
          )}
        </div>
      </div>

      {/* ── BOTTOM: My Panel ── */}
      <div className="my-panel">
        <div className="my-info-block">
          <div className="my-name">{me.name}</div>
          <div className="my-money">${me.money}</div>
          {isMyTurn && <div className="my-turn-chip">내 턴</div>}
          {me.freeBankSell && <div className="tag tag-emerald" style={{ marginTop: 2 }}>수수료 면제</div>}
        </div>

        {/* Inventory */}
        <div className="my-inventory">
          {me.inventory?.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              카드 없음
            </div>
          ) : (
            me.inventory?.map(card => {
              const isAbility = card.type === 'ability';
              const value = getCardValue(card, me.inventory);
              const fee = me.freeBankSell ? 0 : 10;
              const canSell = !isAbility && value > fee;
              const earn = canSell ? value - fee : 0;

              return (
                <div key={card.id} className="card-wrap">
                  <CardFace
                    card={card}
                    size="sm"
                    selected={selectedCardId === card.id}
                    showRealBadge={true}
                    onClick={() => {
                      if (isAbility) setAbilityCard(card);
                      else setSelectedCardId(p => p === card.id ? null : card.id);
                    }}
                  />
                  {isMyTurn && !isAbility && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 9.5, padding: '3px 8px', lineHeight: 1 }}
                      disabled={!canSell}
                      onClick={() => handleBankSell(card.id)}
                      title={canSell ? `은행 판매 $${earn}` : '판매 불가'}
                    >
                      {canSell ? `$${earn}` : '×'}
                    </button>
                  )}
                  {isAbility && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 9.5, padding: '3px 8px', color: 'var(--violet)', lineHeight: 1 }}
                      onClick={() => setAbilityCard(card)}
                    >
                      사용
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick auction button */}
        {isMyTurn && selectedCardId && (
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={handleStartAuction}
            disabled={turnActions.auctionUsed || auction?.active}
          >
            경매 올리기
          </button>
        )}
      </div>

      {/* ── Modals ── */}
      {showTradeModal && (
        <TradeProposalModal
          gameState={gameState}
          myId={myId}
          onClose={() => setShowTradeModal(false)}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

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

      {needsTradeResponse && (
        <TradeResponseModal
          gameState={gameState}
          myId={myId}
          onClose={() => {}}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      {/* Third-party trade banner */}
      {isThirdParty && tradeNames && (
        <div className="trade-notif">
          {tradeNames.proposer}과(와) {tradeNames.target}이(가) 거래 중
        </div>
      )}

      {/* Round banner */}
      {showRoundBanner !== null && (
        <div className="round-banner">
          <div className="round-banner-num">R{showRoundBanner}</div>
          <div className="round-banner-text">라운드 완료! 모두 카드 1장 획득</div>
        </div>
      )}
    </div>
  );
}
