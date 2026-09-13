// ============================================================
// Card3D.jsx — 3D Card Dealing & Flip System (Framer Motion)
// Perspective: 1000px · Preserve-3D · Staggered Flight & Flip
// /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
// ============================================================

import React from 'react';
import { motion } from 'framer-motion';
import { CARD_SVG_MAP, IconVase, IconLightning } from './SvgIcons';

const SIZE_MAP = {
  sm: { width: 72, height: 100, iconSize: 'w-5 h-5', nameSize: 8, priceSize: 9 },
  md: { width: 92, height: 128, iconSize: 'w-6 h-6', nameSize: 9, priceSize: 10 },
  lg: { width: 120, height: 168, iconSize: 'w-8 h-8', nameSize: 11, priceSize: 12 },
};

export function Card3D({
  card,
  size = 'md',
  isFlipped = true, // true = show front, false = show back
  selected = false,
  showRealBadge = false,
  onClick,
  flightFrom, // optional { x, y } offset for dealing animation
  staggerIndex = 0,
  onAnimationComplete,
  className = '',
}) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;
  const isAbility = card?.type === 'ability';

  const priceDisplay = isAbility
    ? null
    : (card?.isReal !== undefined
        ? `$${card.isReal ? card.realPrice : card.fakePrice}`
        : (card ? `$${card.realPrice ?? '?'} / $${card.fakePrice ?? '?'}` : null));

  const SvgComp = card ? (CARD_SVG_MAP[card.id] || (isAbility ? IconLightning : IconVase)) : IconVase;
  const iconColor = isAbility ? "var(--accent)" : (card?.isSet ? "#141414" : "#383838");

  // Initial flight offset if dealing from deck
  const initialX = flightFrom ? flightFrom.x : 0;
  const initialY = flightFrom ? flightFrom.y : 0;
  const initialScale = flightFrom ? 0.3 : 1;

  return (
    <div
      className={`card-3d-wrapper ${className}`}
      style={{
        perspective: '1000px',
        width: s.width,
        height: s.height,
        display: 'inline-block',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <motion.div
        className={`card-3d-inner ${selected ? 'selected' : ''}`}
        initial={{
          x: initialX,
          y: initialY,
          scale: initialScale,
          rotateY: 0, // start with back facing player if dealing
          rotateZ: flightFrom ? -10 : 0,
        }}
        animate={{
          x: 0,
          y: selected ? -12 : 0,
          scale: selected ? 1.05 : 1,
          rotateY: isFlipped ? 180 : 0,
          rotateZ: 0,
        }}
        transition={{
          x: { duration: 0.6, delay: staggerIndex * 0.15, ease: [0.34, 1.56, 0.64, 1] },
          y: { duration: 0.6, delay: staggerIndex * 0.15, ease: [0.34, 1.56, 0.64, 1] },
          scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          rotateY: { duration: 0.5, delay: staggerIndex * 0.15 + 0.35, ease: [0.16, 1, 0.3, 1] },
          rotateZ: { duration: 0.5, delay: staggerIndex * 0.15 },
        }}
        onAnimationComplete={() => onAnimationComplete?.()}
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        {/* ── CARD BACK (rotateY: 0deg) ── */}
        <div
          className="card-face-side card-back-side"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            borderRadius: 'var(--r-md)',
            background: '#ffffff',
            border: '2px solid #141414',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: selected ? '0 8px 24px rgba(20,20,20,0.2)' : '0 2px 8px rgba(20,20,20,0.1)',
            overflow: 'hidden',
          }}
        >
          <div className="card-back-pattern" style={{ opacity: 0.12 }} />
          <div className="card-back-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconVase className="w-6 h-6" color="#141414" />
          </div>
        </div>

        {/* ── CARD FRONT (rotateY: 180deg) ── */}
        <div
          className={`card-face-side card-front-side ${isAbility ? 'ability-face' : 'item-face'}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 'var(--r-md)',
            background: isAbility ? '#FFF5E2' : '#ffffff',
            border: selected ? '2.5px solid #141414' : '1.5px solid #141414',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '10px 8px',
            boxShadow: selected ? '0 10px 28px rgba(20,20,20,0.22)' : '0 2px 8px rgba(20,20,20,0.08)',
          }}
        >
          {/* Real/Fake Badge */}
          {showRealBadge && card && (
            <div
              className={`card-real-badge ${card.isReal === true ? 'badge-real' : card.isReal === false ? 'badge-fake' : 'badge-unrevealed'}`}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                fontSize: 8,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '99px',
                background: card.isReal ? '#FFF5E2' : 'rgba(225,71,49,0.15)',
                color: card.isReal ? '#141414' : '#E14731',
                border: '1px solid #141414',
              }}
            >
              {card.isReal === true ? '진' : card.isReal === false ? '가' : '?'}
            </div>
          )}

          {/* Type Label */}
          <div style={{ fontSize: size === 'lg' ? 9 : 7, fontWeight: 800, letterSpacing: '0.12em', color: '#6b6b6b' }}>
            {isAbility ? 'ABILITY' : 'ITEM'}
          </div>

          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0' }}>
            <SvgComp className={s.iconSize} color={iconColor} />
          </div>

          {/* Name & Price */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: s.nameSize, fontWeight: 800, color: '#141414', lineHeight: 1.2 }}>
              {card?.name ?? '—'}
            </div>
            {priceDisplay && (
              <div style={{ fontSize: s.priceSize, fontFamily: 'var(--mono)', fontWeight: 800, color: '#141414', marginTop: 2 }}>
                {priceDisplay}
              </div>
            )}
            {card?.isSet && (
              <div className="tag tag-gold" style={{ marginTop: 2, fontSize: 7, padding: '1px 5px', background: '#141414', color: '#ffffff' }}>
                세트
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
