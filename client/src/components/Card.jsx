// ============================================================
// Card.jsx — CardFace + MiniCard components (Zero Emoji Architecture)
// ============================================================

import { CARD_SVG_MAP, IconVase, IconLightning } from './SvgIcons';

const SIZE_STYLES = {
  sm: { width: 72, height: 100, iconSize: 'w-5 h-5', nameSize: 8, priceSize: 9 },
  md: { width: 92, height: 128, iconSize: 'w-6 h-6', nameSize: 9, priceSize: 10 },
  lg: { width: 120, height: 168, iconSize: 'w-8 h-8', nameSize: 11, priceSize: 12 },
};

export function CardFace({ card, size = 'md', selected, showRealBadge, faceDown, onClick }) {
  const s = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isAbility = card?.type === 'ability';

  if (!card || faceDown) {
    return (
      <div
        className="game-card"
        style={{ width: s.width, height: s.height, cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
      >
        <div className="card-back-face">
          <div className="card-back-pattern" />
          <div className="card-back-mark">
            <IconVase className="w-5 h-5 opacity-40" color="var(--text-muted)" />
          </div>
        </div>
      </div>
    );
  }

  const SvgComp = CARD_SVG_MAP[card.id] || (isAbility ? IconLightning : IconVase);
  const iconColor = isAbility ? "var(--secondary)" : (card.isSet ? "var(--primary-dark)" : "var(--text-primary)");
  
  // Price display: if isReal is known, show exact price. If unrevealed (e.g. auction), show both Real / Fake values!
  const priceDisplay = isAbility
    ? null
    : (card.isReal !== undefined
        ? `$${card.isReal ? card.realPrice : card.fakePrice}`
        : `$${card.realPrice ?? '?'} / $${card.fakePrice ?? '?'}`);

  return (
    <div
      className={`game-card${selected ? ' selected' : ''}`}
      style={{ width: s.width, height: s.height, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className={`card-face ${isAbility ? 'ability-face' : 'item-face'}`}>
        {/* Real/Fake badge */}
        {showRealBadge && (
          <div className={`card-real-badge ${card.isReal === true ? 'badge-real' : card.isReal === false ? 'badge-fake' : 'badge-unrevealed'}`}>
            {card.isReal === true ? '진' : card.isReal === false ? '가' : '?'}
          </div>
        )}

        {/* Type label */}
        <div className="card-type-label" style={{ fontSize: size === 'lg' ? 9 : 7 }}>
          {isAbility ? 'ABILITY' : 'ITEM'}
        </div>

        {/* SVG Icon */}
        <div className="card-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <SvgComp className={s.iconSize} color={iconColor} />
        </div>

        {/* Name */}
        <div className="card-name" style={{ fontSize: s.nameSize }}>
          {card.name}
        </div>

        {/* Price */}
        {priceDisplay && (
          <div className="card-price" style={{ fontSize: s.priceSize }}>
            {priceDisplay}
          </div>
        )}

        {/* Set badge */}
        {card.isSet && (
          <div className="tag tag-gold" style={{ marginTop: 3, fontSize: 7, padding: '1px 5px' }}>
            세트
          </div>
        )}
      </div>
    </div>
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
