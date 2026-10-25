import { html } from '../lib/react.js';
import { phaseLabel } from '../core/patterns.js';

const SIZE = 320;
const CENTER = SIZE / 2;
const RING_R = 150;
const RING_LEN = 2 * Math.PI * RING_R;

/** Expanding/contracting guide circle with an outer session-progress ring. */
export function BreathCircle({ frame, color, idle }) {
  const level = idle ? 0.35 : frame.level;
  const radius = 62 + level * 70;
  const countdown = idle ? '' : Math.max(1, Math.ceil(frame.phaseRemaining));

  return html`
    <svg viewBox=${`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[360px] mx-auto select-none" role="img"
      aria-label=${idle ? 'Breathing guide' : `${phaseLabel(frame.phase)}, ${countdown} seconds`}>
      <circle cx=${CENTER} cy=${CENTER} r=${RING_R} fill="none" stroke="#11131512" strokeWidth="6" />
      <circle
        cx=${CENTER} cy=${CENTER} r=${RING_R} fill="none" stroke=${color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray=${RING_LEN} strokeDashoffset=${RING_LEN * (1 - (idle ? 0 : frame.sessionProgress))}
        transform=${`rotate(-90 ${CENTER} ${CENTER})`}
      />
      <circle cx=${CENTER} cy=${CENTER} r=${radius + 14} fill=${color} fillOpacity="0.08" />
      <circle cx=${CENTER} cy=${CENTER} r=${radius} fill=${color} fillOpacity="0.85" />
      <text x=${CENTER} y=${CENTER - 6} textAnchor="middle" fill="#FFFFFF" fontSize="22" fontFamily="Inter" fontWeight="500">
        ${idle ? 'Ready' : phaseLabel(frame.phase)}
      </text>
      <text x=${CENTER} y=${CENTER + 26} textAnchor="middle" fill="#FFFFFF" fontSize="26" fontFamily="JetBrains Mono">
        ${countdown}
      </text>
    </svg>
  `;
}
