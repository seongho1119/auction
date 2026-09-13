// ============================================================
// OpponentSeat.jsx — Hangame Poker Style Opponent Seat & Face-down Hand
// Renders player avatar + money + face-down cards on felt surface
// /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
// ============================================================

import React from 'react';
import { CardFace } from './Card';
import { IconCrown, IconUser, IconMask, IconGem } from './SvgIcons';

const PLAYER_ICONS = [IconCrown, IconUser, IconMask, IconGem];

export function OpponentSeat({ player, playerIndex = 0, isActive = false }) {
  if (!player) return null;

  const IconComp = PLAYER_ICONS[playerIndex % PLAYER_ICONS.length] || IconUser;
  const cardCount = typeof player.inventoryCount === 'number' ? player.inventoryCount : (player.inventory?.length ?? 0);

  return (
    <div
      className={`opp-seat-container ${isActive ? 'active' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Turn indicator badge */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            background: '#141414',
            color: '#ffffff',
            fontSize: 9,
            fontWeight: 900,
            padding: '2px 8px',
            borderRadius: '99px',
            border: '1.5px solid #ffffff',
            letterSpacing: '0.1em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        >
          TURN
        </div>
      )}

      {/* Opponent Info Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: isActive ? '#FFF5E2' : '#ffffff',
          border: isActive ? '2px solid #141414' : '1.5px solid #141414',
          borderRadius: 'var(--r-lg)',
          boxShadow: isActive ? '0 6px 18px rgba(20,20,20,0.18)' : '0 2px 8px rgba(20,20,20,0.08)',
          minWidth: 160,
          transition: 'all 250ms ease',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '99px',
            background: '#FFF5E2',
            border: '1.5px solid #141414',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComp className="w-5 h-5" color="#141414" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#141414', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.name}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 900, color: '#141414' }}>
            ${player.money}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6b6b' }}>
          {cardCount}장
        </div>
      </div>

      {/* Opponent Face-down Hand Display on Felt (Hangame Poker Style) */}
      <div
        className="opp-hand-cards"
        style={{
          display: 'flex',
          gap: -18,
          alignItems: 'center',
          minHeight: 64,
          padding: '4px 8px',
        }}
      >
        {cardCount === 0 ? (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>손패 없음</div>
        ) : (
          Array.from({ length: Math.min(cardCount, 6) }).map((_, idx) => (
            <div
              key={idx}
              style={{
                marginLeft: idx > 0 ? -24 : 0,
                transform: `rotate(${(idx - (cardCount - 1) / 2) * 4}deg)`,
                transition: 'all 200ms ease',
              }}
            >
              <CardFace faceDown={true} size="sm" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
