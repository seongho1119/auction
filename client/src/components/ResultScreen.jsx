// ============================================================
// ResultScreen.jsx — 게임 결과 화면 (Zero Emoji)
// ============================================================

import { CARD_SVG_MAP, IconCrown, IconVase } from './SvgIcons';

const RANK_LABELS = ['1st', '2nd', '3rd', '4th'];
const RANK_CLASSES = ['rank-1', 'rank-2', 'rank-3', 'rank-other'];

export function ResultScreen({ results, myId, onPlayAgain }) {
  const winner = results?.[0];

  return (
    <div className="result-screen">
      <div className="result-card">
        <div className="bezel-outer">
          <div className="bezel-inner">
            <div className="result-header">
              <div className="result-trophy" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <IconCrown className="w-12 h-12" color="var(--primary-dark)" />
              </div>
              <h1 className="result-title">게임 종료!</h1>
              <p className="result-subtitle">
                {winner ? `${winner.name}이(가) 승리했습니다!` : '결과를 확인하세요'}
              </p>
            </div>

            <div className="result-rankings">
              {results?.map((p, i) => (
                <div key={p.id} className="result-rank-item">
                  <div className={`result-rank-badge ${RANK_CLASSES[Math.min(i, 3)]}`}>
                    {RANK_LABELS[Math.min(i, 3)]}
                  </div>
                  <div className="result-player-name">
                    {p.name}
                    {p.id === myId && (
                      <span className="result-player-me" style={{ marginLeft: 8 }}>나</span>
                    )}
                  </div>
                  <div>
                    <div className="result-asset">${p.totalAsset}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                      현금 ${p.money} + 카드 ${p.totalAsset - p.money}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 최종 보유 카드 목록 */}
            {results?.map(p => (
              p.inventory?.length > 0 && (
                <div key={`inv-${p.id}`} style={{ padding: '0 24px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    {p.name}의 카드 ({p.inventory.length}장)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.inventory.map(c => {
                      const SvgComp = CARD_SVG_MAP[c.id] || IconVase;
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            background: 'var(--bg-void)',
                            border: `1px solid ${c.isReal ? 'rgba(68,163,42,0.3)' : 'rgba(225,71,49,0.3)'}`,
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          <SvgComp className="w-4 h-4" color="var(--text-primary)" />
                          <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                          <span style={{ color: c.isReal ? 'var(--secondary)' : 'var(--accent)', fontSize: 9, fontWeight: 700 }}>
                            {c.isReal ? '진' : '가'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}

            <div style={{ padding: '0 24px 24px' }}>
              <button className="btn btn-primary btn-lg w-full" onClick={onPlayAgain}>
                새 게임 시작 (로비로)
                <span className="btn-icon" style={{ marginLeft: 6 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
