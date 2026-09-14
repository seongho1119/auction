// ============================================================
// CardTooltip.jsx — 카드 호버 시 상세 정보 툴팁
// /* Hallmark · component: tooltip · genre: editorial */
// ============================================================

import { useState, useRef } from 'react';

export function CardTooltip({ card, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  if (!card) return children;

  const isAbility = card.type === 'ability';

  const handleMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            left: pos.x + 14,
            top: pos.y - 10,
            zIndex: 9999,
            pointerEvents: 'none',
            width: 200,
          }}
        >
          <div style={{
            background: '#141414',
            color: '#ffffff',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            lineHeight: 1.5,
          }}>
            {/* 카드 이름 */}
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6, color: isAbility ? 'var(--accent, #E14731)' : '#ffffff' }}>
              {card.name}
            </div>

            {/* 타입 뱃지 */}
            <div style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 99,
              marginBottom: 8,
              background: isAbility ? 'rgba(225,71,49,0.2)' : 'rgba(255,255,255,0.12)',
              color: isAbility ? '#E14731' : '#aaaaaa',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {isAbility ? '능력 카드' : '물건 카드'}
            </div>

            {/* 진/가품 여부 */}
            {card.isReal !== undefined && (
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 6,
                color: card.isReal ? '#44A32A' : '#E14731',
              }}>
                {card.isReal ? '진품 (REAL)' : '가품 (FAKE)'}
              </div>
            )}

            {/* 가격 정보 */}
            {!isAbility && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                {card.isReal !== undefined ? (
                  <>
                    <div>가치: <span style={{ color: '#ffffff', fontWeight: 700 }}>${card.isReal ? card.realPrice : card.fakePrice}</span></div>
                  </>
                ) : (
                  <>
                    <div>진품가: <span style={{ color: '#44A32A', fontWeight: 700 }}>${card.realPrice}</span></div>
                    <div>가품가: <span style={{ color: '#E14731', fontWeight: 700 }}>${card.fakePrice}</span></div>
                  </>
                )}
              </div>
            )}

            {/* 능력 카드 효과 설명 */}
            {isAbility && card.effectDesc && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                {card.effectDesc}
              </div>
            )}

            {/* 세트 카드 표시 */}
            {card.isSet && (
              <div style={{ fontSize: 10, color: 'var(--gold, #C5A35A)', marginTop: 4, fontWeight: 700 }}>
                세트 카드 (3장 완성 시 보너스)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
