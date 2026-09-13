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
        gap: 4,
        position: 'relative',
        userSelect: 'none',
        padding: '4px 8px',
      }}
    >
      {/* Turn indicator badge */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            background: '#141414',
            color: '#ffffff',
            fontSize: 8,
            fontWeight: 900,
            padding: '1px 6px',
            borderRadius: '99px',
            border: '1px solid #ffffff',
            letterSpacing: '0.08em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
          gap: 8,
          padding: '4px 10px',
          background: isActive ? '#FFF5E2' : '#ffffff',
          border: isActive ? '2px solid #141414' : '1.5px solid #141414',
          borderRadius: 'var(--r-md)',
          boxShadow: isActive ? '0 4px 12px rgba(20,20,20,0.15)' : '0 1px 4px rgba(20,20,20,0.06)',
          minWidth: 140,
          transition: 'all 250ms ease',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '99px',
            background: '#FFF5E2',
            border: '1.5px solid #141414',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComp className="w-4 h-4" color="#141414" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#141414', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.name}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 900, color: '#141414' }}>
            ${player.money}
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: '#6b6b6b' }}>
          {cardCount}장
        </div>
      </div>

      {/* Opponent Face-down Hand Display on Felt */}
      <div
        className="opp-hand-cards"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          padding: '2px 0',
        }}
      >
        {cardCount === 0 ? (
          <div style={{ fontSize: 9, color: '#6b6b6b', fontWeight: 600 }}>손패 없음</div>
        ) : (
          Array.from({ length: Math.min(cardCount, 5) }).map((_, idx) => (
            <div
              key={idx}
              style={{
                marginLeft: idx > 0 ? -18 : 0,
                transform: `rotate(${(idx - (cardCount - 1) / 2) * 3}deg)`,
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
