// ============================================================
// Card.jsx — CardFace + MiniCard components (Zero Emoji Architecture)
// ============================================================

import { Card3D } from './Card3D';
import { CARD_SVG_MAP, IconVase } from './SvgIcons';

export { Card3D };

export function CardFace({ card, size = 'md', selected, showRealBadge, faceDown, onClick, flightFrom, staggerIndex = 0 }) {
  return (
    <Card3D
      card={card}
      size={size}
      isFlipped={!faceDown}
      selected={selected}
      showRealBadge={showRealBadge}
      onClick={onClick}
      flightFrom={flightFrom}
      staggerIndex={staggerIndex}
    />
  );
}

export function MiniCard({ card, selected, showRealBadge, onClick }) {
  const isAbility = card?.type === 'ability';
  const SvgComp = card ? (CARD_SVG_MAP[card.id] || IconVase) : null;
  const iconColor = isAbility ? "var(--secondary)" : "var(--text-primary)";

  return (
    <div
      className={`mini-card ${isAbility ? 'ability' : 'item'}${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      {showRealBadge && card?.isReal !== undefined && (
        <div style={{
          position: 'absolute',
          top: 3,
          right: 3,
          fontSize: 6.5,
          fontWeight: 700,
          padding: '1px 4px',
          borderRadius: '99px',
          background: card.isReal ? 'rgba(68,163,42,0.15)' : 'rgba(225,71,49,0.15)',
          color: card.isReal ? 'var(--secondary)' : 'var(--accent)',
          border: `1px solid ${card.isReal ? 'rgba(68,163,42,0.3)' : 'rgba(225,71,49,0.3)'}`,
        }}>
          {card.isReal ? '진' : '가'}
        </div>
      )}
      <div className="mini-card-icon" style={{ display: 'flex', alignItems: 'center' }}>
        {SvgComp ? <SvgComp className="w-4 h-4" color={iconColor} /> : '—'}
      </div>
      <div className="mini-card-name">{card?.name ?? '—'}</div>
    </div>
  );
}
