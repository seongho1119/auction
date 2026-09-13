// ============================================================
// GameBoard.jsx — 메인 게임 보드 (Premium Redesign)
// ==================================================import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { socket } from '../socket';
import { CardFace, MiniCard } from './Card';
import { CenterDeck3D } from './CenterDeck3D';
import { ActionPanel } from './ActionPanel';
import { TradeProposalModal, TradeResponseModal } from './TradeModal';
import { AbilityModal } from './AbilityModal';
import { IconCrown, IconUser, IconMask, IconGem, IconHammer } from './SvgIcons';

const PLAYER_ICONS = [IconCrown, IconUser, IconMask, IconGem];

export function GameBoard({ gameState, myId, playerName, onError, onSuccess }) {
  const [bidAmount, setBidAmount] = useState(10);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [abilityCard, setAbilityCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [revealModal, setRevealModal] = useState(null);
  const boardRef = useRef(null);
  const prevRoundRef = useRef(null);
  const [showRoundBanner, setShowRoundBanner] = useState(null);

  const { players = [], turnIndex, auction, trade, log = [], turnActions = {}, roundIndex = 0 } = gameState || {};

  const me = players.find(p => p.id === myId) || (playerName ? players.find(p => p.name === playerName) : null) || players[0];
  const opponents = me ? players.filter(p => p.id !== me.id) : players;
  const currentPlayer = players[turnIndex];
  const isMyTurn = currentPlayer?.id === me?.id;

  const totalDeckCount = gameState.deckCount ?? gameState.deck?.length ?? 0;
  const itemCardsInDeck = gameState.deckItemCount ?? gameState.deck?.filter?.(c => c?.type === 'item')?.length ?? 0;

  useEffect(() => {
    const handleReveal = (data) => {
      setRevealModal(data);
    };
    socket.on('ability:reveal', handleReveal);
    return () => socket.off('ability:reveal', handleReveal);
  }, []);

  useEffect(() => {
    if (!boardRef.current) return;
    gsap.from('.board-top', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('.auction-zone', { scale: 0.96, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
    gsap.from('.my-panel', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 });
  }, []);

  useEffect(() => {
    if (prevRoundRef.current !== null && roundIndex > prevRoundRef.current) {
      setShowRoundBanner(roundIndex);
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

  const handleDeckDraw = () => {
    socket.emit('deck:draw', {}, res => {
      if (!res?.success) onError?.(res?.error);
      else onSuccess?.('카드를 뽑았습니다!');
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

      {/* ── MIDDLE: 2-column Spacious Poker Felt Surface (No EventLog / No Status Box) ── */}
      <div className="board-middle" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Col 1: Auction Zone */}
        <div className={`auction-zone${auction?.active ? ' live' : ''}`}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={`auction-zone-label${auction?.active ? ' live-label' : ''}`}>
              {auction?.active ? '경매 진행 중' : '경매 보드'}
            </div>
            <div className="round-badge">R{roundIndex + 1}</div>
          </div>

          {auction?.active && auction.card ? (
            <>
              {/* Auction card display */}
              <div style={{ position: 'relative', margin: '12px 0' }}>
                <CardFace
                  card={auction.card}
                  size="lg"
                  showRealBadge={me?.revealedCards?.includes(auction.card.id)}
                />
                {auction.highestBidderId && (
                  <div style={{ position: 'absolute', top: -8, right: -8 }}>
                    <div className="tag tag-gold animate-glow" style={{ fontSize: 11, padding: '4px 10px', background: '#141414', color: '#ffffff' }}>
                      ${auction.currentBid}
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

              {/* Bid controls */}
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

              {/* Close auction */}
              {auction.sellerId === myId && isMyTurn && (
                <button className="btn btn-primary btn-sm" onClick={handleCloseAuction}>
                  낙찰 종료
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, opacity: 0.6 }}>
              <IconHammer className="w-10 h-10" color="#ffffff" />
              <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>경매 대기 중</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>내 턴에 손패 카드를 선택하여 경매에 부칠 수 있습니다</div>
            </div>
          )}
        </div>

        {/* Col 2: Center Physical 3D Deck Object with Shuffle Animation */}
        <CenterDeck3D
          count={totalDeckCount}
          onDraw={handleDeckDraw}
          disabled={!gameState.deck?.length || me.money < 20}
          isMyTurn={isMyTurn}
        />
      </div>

      {/* ── BOTTOM: My Action Panel (Horizontal Hand Layout) ── */}
      <ActionPanel
        gameState={gameState}
        myId={myId}
        onError={onError}
        onSuccess={onSuccess}
      />

      {/* ── Modals & Notifications ── */}
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

      {/* ── Truth Reveal Modal (Crisp Solid Background) ── */}
      {revealModal && (
        <div className="modal-overlay" onClick={() => setRevealModal(null)}>
          <div
            style={{
              background: '#FFF5E2',
              border: '3px solid #141414',
              borderRadius: 'var(--r-xl)',
              padding: '28px 32px',
              textAlign: 'center',
              width: 340,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.15em', color: '#6b6b6b', marginBottom: 8, textTransform: 'uppercase' }}>
              진위 확인 결과
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#141414', marginBottom: 16 }}>
              {revealModal.cardName}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                padding: '12px 20px',
                borderRadius: 'var(--r-md)',
                background: revealModal.isReal ? '#FFF5E2' : 'rgba(225, 71, 49, 0.15)',
                color: revealModal.isReal ? '#141414' : '#E14731',
                border: '2px solid #141414',
                marginBottom: 20,
              }}
            >
              {revealModal.isReal ? '진품 (REAL)' : '가품 (FAKE)'}
            </div>
            <button className="btn btn-primary btn-sm w-full" onClick={() => setRevealModal(null)}>
              확인 완료
            </button>
          </div>
        </div>
      )}

      {/* Third-party trade notification */}
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
