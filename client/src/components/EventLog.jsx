// ============================================================
// EventLog.jsx — Scrolling event history
// ============================================================

import { useRef, useEffect } from 'react';

const LOG_COLOR = {
  '경매': 'var(--gold)',
  '거래': 'var(--sky)',
  '능력': 'var(--violet)',
  '은행': 'var(--emerald)',
  '라운드': 'var(--violet)',
  '게임': 'var(--rose)',
  '턴': 'var(--text-muted)',
};

function getLogAccent(line) {
  for (const [key, color] of Object.entries(LOG_COLOR)) {
    if (line.includes(key)) return color;
  }
  return 'var(--text-secondary)';
}

export function EventLog({ logs = [] }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    // scroll to top (newest, since column-reverse)
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [logs.length]);

  return (
    <div className="event-log">
      <div className="event-log-head">이벤트 로그</div>
      <div className="event-log-body" ref={bodyRef}>
        {[...logs].reverse().map((line, i) => (
          <div
            key={i}
            className="log-line"
            style={{ color: i === 0 ? getLogAccent(line) : undefined }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
