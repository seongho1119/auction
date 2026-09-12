// ============================================================
// AbilityModal.jsx — 능력 카드 사용 모달
// ============================================================

import { useState } from 'react';
import { socket } from '../socket';
import { MiniCard } from './Card';

const ABILITY_NEEDS_TARGET_PLAYER = ['destroy_item', 'collect_bid10'];
const ABILITY_NEEDS_TARGET_CARD = ['reveal_truth', 'destroy_item', 'sell_fake_minus10', 'discard_draw'];

export function AbilityModal({ card, gameState, myId, onClose, onError, onSuccess }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [loading, setLoading] = useState(false);

  const effect = card?.effect;
  const otherPlayers = gameState.players.filter(p => p.id !== myId);
  const myPlayer = gameState.players.find(p => p.id === myId);

  const needsTargetPlayer = ABILITY_NEEDS_TARGET_PLAYER.includes(effect);
  const needsTargetCard = ABILITY_NEEDS_TARGET_CARD.includes(effect);

  // 경매 카드 ID (진위 확인 용)
  const auctionCardId = gameState.auction?.active ? gameState.auction.card?.id : null;

  // 선택된 플레이어의 카드 목록 (destroy_item / reveal_truth)
  const targetPlayer = selectedPlayerId ? gameState.players.find(p => p.id === selectedPlayerId) : null;
  const targetPlayerCards = targetPlayer?.inventory || [];

  // 내 카드 목록 (sell_fake_minus10, discard_draw)
  const myCards = myPlayer?.inventory || [];

  const buildParams = () => {
    const params = {};
    if (needsTargetPlayer) params.targetPlayerId = selectedPlayerId;
    if (effect === 'destroy_item' || effect === 'reveal_truth') params.targetCardId = selectedCardId;
    if (effect === 'sell_fake_minus10') params.cardId = selectedCardId;
    if (effect === 'discard_draw') params.discardCardId = selectedCardId;
    return params;
  };

  const canConfirm = () => {
    if (needsTargetPlayer && !selectedPlayerId) return false;
    if (effect === 'destroy_item' && !selectedCardId) return false;
    if (effect === 'sell_fake_minus10' && !selectedCardId) return false;
    if (effect === 'discard_draw' && !selectedCardId) return false;
    if (effect === 'reveal_truth' && !selectedCardId && !auctionCardId) return false;
    return true;
  };

  const handleConfirm = () => {
    setLoading(true);
    const params = buildParams();

    // reveal_truth: auctionCard 선택 시 자동
    if (effect === 'reveal_truth' && !selectedCardId && auctionCardId) {
      params.targetCardId = auctionCardId;
    }

    socket.emit('ability:use', { cardId: card.id, params }, (res) => {
      setLoading(false);
      if (!res?.success) {
        onError?.(res?.error || '능력 카드 사용 실패');
      } else {
        onSuccess?.(`"${card.name}" 능력 발동!`);
        onClose?.();
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bezel-outer ability-modal">
        <div className="bezel-inner">
          {/* Header */}
          <div className="trade-modal-header">
            <div>
              <div className="tag tag-purple" style={{ marginBottom: 6 }}>⚡ 능력 카드</div>
              <div className="trade-modal-title">{card?.name}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>

          {/* Body */}
          <div className="ability-modal-body">
            <div className="ability-effect-desc">{card?.desc}</div>

            {/* 대상 플레이어 선택 */}
            {needsTargetPlayer && (
              <div>
                <div className="target-select-label">대상 플레이어 선택</div>
                <div className="target-player-list">
                  {otherPlayers.map(p => (
                    <div
                      key={p.id}
                      className={`target-player-item ${selectedPlayerId === p.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedPlayerId(p.id); setSelectedCardId(null); }}
                    >
                      <span style={{ fontSize: 20 }}>👤</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: 13 }}>${p.money}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.inventory?.length ?? p.inventoryCount ?? '?'}장</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 대상 카드 선택 (상대 카드) */}
            {(effect === 'destroy_item' || (effect === 'reveal_truth' && selectedPlayerId)) && targetPlayer && (
              <div>
                <div className="target-select-label">카드 선택 ({targetPlayer.name})</div>
                <div className="target-card-list">
                  {targetPlayerCards
                    .filter(c => effect === 'destroy_item' ? c.type === 'item' : true)
                    .map(c => (
                      <MiniCard
                        key={c.id}
                        card={c}
                        selected={selectedCardId === c.id}
                        onClick={() => setSelectedCardId(c.id)}
                      />
                    ))}
                  {targetPlayerCards.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>카드 없음</div>
                  )}
                </div>
              </div>
            )}

            {/* 진위 확인: 경매 카드 or 상대 카드 선택 */}
            {effect === 'reveal_truth' && !selectedPlayerId && auctionCardId && (
              <div>
                <div className="target-select-label">경매 중인 카드 확인 가능</div>
                <div
                  className={`target-player-item ${selectedCardId === auctionCardId ? 'selected' : ''}`}
                  onClick={() => setSelectedCardId(auctionCardId)}
                >
                  <span style={{ fontSize: 20 }}>🔨</span>
                  <span style={{ fontSize: 14 }}>현재 경매 중인 카드</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  또는 위에서 플레이어를 선택해 특정 카드를 확인하세요.
                </div>
              </div>
            )}

            {/* 내 카드 선택 (sell_fake_minus10: 가짜 카드만) */}
            {effect === 'sell_fake_minus10' && (
              <div>
                <div className="target-select-label">판매할 가짜 물건 선택</div>
                <div className="target-card-list">
                  {myCards.filter(c => c.type === 'item' && c.isReal === false).map(c => (
                    <MiniCard
                      key={c.id}
                      card={c}
                      selected={selectedCardId === c.id}
                      onClick={() => setSelectedCardId(c.id)}
                      showRealBadge={true}
                    />
                  ))}
                  {myCards.filter(c => c.type === 'item' && c.isReal === false).length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>가짜 물건 없음</div>
                  )}
                </div>
              </div>
            )}

            {/* 내 카드 선택 (discard_draw) */}
            {effect === 'discard_draw' && (
              <div>
                <div className="target-select-label">버릴 카드 선택</div>
                <div className="target-card-list">
                  {myCards.map(c => (
                    <MiniCard
                      key={c.id}
                      card={c}
                      selected={selectedCardId === c.id}
                      onClick={() => setSelectedCardId(c.id)}
                      showRealBadge={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="trade-modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm() || loading}
            >
              {loading ? <span className="animate-spin">⟳</span> : '⚡'}
              <span>{loading ? '발동 중...' : '능력 발동'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
