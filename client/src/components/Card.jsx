// ============================================================
// Card.jsx — CardFace + MiniCard components
// ============================================================

const CARD_ICONS = {
  1:'🏺',2:'🏺',3:'🕯️',4:'🕯️',5:'✉️',6:'✉️',7:'⌚',8:'⌚',
  9:'🖼️',10:'🖼️',11:'🪙',12:'🪙',13:'💎',14:'💎',
  15:'🗿',16:'🗿',17:'🗿',18:'🪆',19:'🪆',20:'🪆',
  21:'⚡',22:'💣',23:'🎭',24:'🔍',25:'💵',26:'💰',
  27:'💸',28:'🔄',29:'🔀',30:'🌀',31:'🎁',
};

const SIZE_STYLES = {
  sm: { width: 72, height: 100, iconSize: 20, nameSize: 8, priceSize: 9 },
  md: { width: 92, height: 128, iconSize: 24, nameSize: 9, priceSize: 10 },
  lg: { width: 120, height: 168, iconSize: 32, nameSize: 11, priceSize: 12 },
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
            <span style={{ fontSize: 14, opacity: 0.4 }}>🎴</span>
          </div>
        </div>
      </div>
    );
  }

  const icon = CARD_ICONS[card.id] || (isAbility ? '⚡' : '🃏');
  const priceDisplay = isAbility
    ? null
    : (card.isReal !== undefined ? `$${card.isReal ? card.realPrice : card.fakePrice}` : `$?`);

  return (
    <div
      className={`game-card${selected ? ' selected' : ''}`}
      style={{ width: s.width, height: s.height, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className={`card-face ${isAbility ? 'ability-face' : 'item-face'}`}>
        {/* Real/Fake badge */}
        {showRealBadge && card.isReal !== undefined && (
          <div className={`card-real-badge ${card.isReal ? 'badge-real' : 'badge-fake'}`}>
            {card.isReal ? '진' : '가'}
          </div>
        )}

        {/* Type label */}
        <div className="card-type-label" style={{ fontSize: size === 'lg' ? 9 : 7 }}>
          {isAbility ? 'ABILITY' : 'ITEM'}
        </div>

        {/* Icon */}
        <div className="card-icon" style={{ fontSize: s.iconSize }}>{icon}</div>

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
          <div className="tag tag-violet" style={{ marginTop: 3, fontSize: 7, padding: '1px 5px' }}>
            세트
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniCard({ card, selected, showRealBadge, onClick }) {
  const isAbility = card?.type === 'ability';
  const icon = card ? (CARD_ICONS[card.id] || '🃏') : '—';

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
          background: card.isReal ? 'rgba(62,201,126,0.15)' : 'rgba(232,92,92,0.15)',
          color: card.isReal ? 'var(--emerald)' : 'var(--rose)',
          border: `1px solid ${card.isReal ? 'rgba(62,201,126,0.3)' : 'rgba(232,92,92,0.3)'}`,
        }}>
          {card.isReal ? '진' : '가'}
        </div>
      )}
      <div className="mini-card-icon">{icon}</div>
      <div className="mini-card-name">{card?.name ?? '—'}</div>
    </div>
  );
}
