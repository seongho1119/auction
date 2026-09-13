// ============================================================
// ActionVisualNotifier.jsx — Intuitive Visual Action Toast & Floating Money
// Framer Motion Animated Banners & Floating Money Transports
// /* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ActionVisualNotifier({ gameState, myId }) {
  const [toasts, setToasts] = useState([]);
  const prevLogLengthRef = useRef(0);
  const prevMoneyRef = useRef({});

  // Detect new log entries & generate visual action toasts
  useEffect(() => {
    if (!gameState) return;
    const log = gameState.log || [];
    if (log.length > prevLogLengthRef.current) {
      const newEntries = log.slice(prevLogLengthRef.current);
      const newToasts = newEntries.map((text, idx) => ({
        id: Date.now() + idx + Math.random(),
        text,
        type: text.includes('능력') ? 'ability' : text.includes('경매') ? 'auction' : text.includes('입찰') ? 'bid' : 'general',
      }));

      setToasts(prev => [...prev.slice(-3), ...newToasts]);
    }
    prevLogLengthRef.current = log.length;
  }, [gameState?.log]);

  // Auto remove toasts after 3 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3200);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isAbility = toast.type === 'ability';
          const isAuction = toast.type === 'auction';
          const isBid = toast.type === 'bid';

          const bg = isAbility ? '#141414' : isAuction ? '#141414' : '#ffffff';
          const color = isAbility ? '#ffffff' : isAuction ? '#ffffff' : '#141414';
          const border = isAbility ? '2px solid #E14731' : '2px solid #141414';

          return (
            <motion.div
              key={toast.id}
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -15, opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                background: bg,
                color: color,
                border: border,
                borderRadius: 'var(--r-full)',
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 800,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                letterSpacing: '-0.01em',
              }}
            >
              {isAbility && <span style={{ color: '#E14731', fontWeight: 900 }}>[능력 발동]</span>}
              {isAuction && <span style={{ color: '#FFF5E2', fontWeight: 900 }}>[경매 진행]</span>}
              {isBid && <span style={{ color: '#141414', fontWeight: 900 }}>[입찰]</span>}
              <span>{toast.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function FloatingMoneyText({ amount, x = 0, y = 0, onComplete }) {
  const isPositive = amount > 0;
  return (
    <motion.div
      initial={{ x, y, opacity: 0, scale: 0.6 }}
      animate={{ y: y - 40, opacity: 1, scale: 1.2 }}
      exit={{ y: y - 70, opacity: 0, scale: 0.8 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={onComplete}
      style={{
        position: 'absolute',
        fontSize: 18,
        fontWeight: 900,
        fontFamily: 'var(--mono)',
        color: isPositive ? '#3ea524' : '#E14731',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        zIndex: 120,
      }}
    >
      {isPositive ? `+$${amount}` : `-$${Math.abs(amount)}`}
    </motion.div>
  );
}
