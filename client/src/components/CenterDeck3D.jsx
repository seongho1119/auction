// ============================================================
// CenterDeck3D.jsx — Center Physical 3D Deck Stack & Shuffle Animation
// Perspective: 1000px · 3D Riffle Shuffle · Click-to-Draw
// /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconVase } from './SvgIcons';

export function CenterDeck3D({ count = 30, onDraw, disabled, isMyTurn }) {
  const [isShuffling, setIsShuffling] = useState(false);

  const handleShuffle = (e) => {
    e.stopPropagation();
    if (isShuffling) return;
    setIsShuffling(true);
    setTimeout(() => setIsShuffling(false), 1400);
  };

  const stackSize = Math.min(6, Math.max(1, Math.ceil(count / 5)));

  return (
    <div
      className="center-deck-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '16px 24px',
        background: 'rgba(0, 0, 0, 0.22)',
        border: '2px dashed rgba(255, 255, 255, 0.4)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#ffffff' }}>
          중앙 3D 덱 ({count}장)
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 10, padding: '3px 10px', background: '#FFF5E2', color: '#141414', border: '1.5px solid #141414' }}
          onClick={handleShuffle}
          disabled={isShuffling}
        >
          {isShuffling ? '섞는 중...' : '덱 섞기'}
        </button>
      </div>

      {/* 3D Physical Deck Stack */}
      <div
        style={{
          perspective: '1000px',
          width: 90,
          height: 126,
          position: 'relative',
          cursor: isMyTurn && !disabled && !isShuffling ? 'pointer' : 'default',
          margin: '10px 0',
        }}
        onClick={() => {
          if (isMyTurn && !disabled && !isShuffling) {
            onDraw?.();
          }
        }}
        title={isMyTurn ? '클릭하여 카드 뽑기 ($20)' : '상대방 턴'}
      >
        <AnimatePresence>
          {Array.from({ length: stackSize }).map((_, idx) => {
            const offset = (stackSize - 1 - idx) * 3;
            // Riffle shuffle split
            const isLeftHalf = idx % 2 === 0;

            return (
              <motion.div
                key={idx}
                className="deck-card-layer"
                initial={false}
                animate={
                  isShuffling
                    ? {
                        x: isLeftHalf ? -38 : 38,
                        rotateZ: isLeftHalf ? -14 : 14,
                        y: -8,
                        scale: 0.95,
                      }
                    : {
                        x: -offset,
                        y: -offset,
                        rotateZ: 0,
                        scale: 1,
                      }
                }
                transition={{
                  duration: isShuffling ? 0.6 : 0.4,
                  repeat: isShuffling ? 1 : 0,
                  repeatType: 'reverse',
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: isShuffling ? idx * 0.04 : 0,
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: 90,
                  height: 126,
                  borderRadius: 'var(--r-md)',
                  background: '#ffffff',
                  border: '2px solid #141414',
                  boxShadow: `${-offset}px ${offset}px 0 #141414, 0 4px 12px rgba(0,0,0,0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transformStyle: 'preserve-3d',
                }}
              >
                {idx === stackSize - 1 && (
                  <div style={{ opacity: 0.18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconVase className="w-8 h-8" color="#141414" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Top hover indicator */}
        {isMyTurn && !disabled && !isShuffling && (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            style={{
              position: 'absolute',
              top: -24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#141414',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '99px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            뽑기 $20
          </motion.div>
        )}
      </div>

      {/* Action button below deck */}
      {isMyTurn && (
        <button
          className="btn btn-primary btn-sm"
          style={{ width: '100%', fontSize: 12 }}
          onClick={onDraw}
          disabled={disabled || isShuffling || count === 0}
        >
          덱에서 카드 뽑기 ($20)
        </button>
      )}
    </div>
  );
}
