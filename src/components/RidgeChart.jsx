import { useLayoutEffect, useRef, useState } from 'react';
import { brand, chart } from '../styles/tokens.js';

const PINE = 'M0 -23 L5.2 -15.2 H2.6 L7.4 -8 H4.2 L9 0 H-9 L-4.2 -8 H-7.4 L-2.6 -15.2 H-5.2 Z';

/** A milestone pine, drawn at the origin; also used as a legend key. */
export function PineIcon({ className }) {
  return (
    <svg viewBox="-10 -24 20 30" className={className} aria-hidden="true">
      <path d={PINE} fill={chart.line} />
      <line x1="0" y1="0" x2="0" y2="5" stroke={chart.line} strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The angular "ridge" line chart from the design, shaped like the mountains in the game.
 * `values` holds one entry per x step; null entries are gaps the line skips over.
 * Width follows the container, so labels never stretch.
 */
export function RidgeChart({
  values,
  min,
  max,
  height = 240,
  ticks = [],
  tickFormat = String,
  xlabels = [],
  pines = [],
  target = null,
  dots = false,
  compact = false,
  label
}) {
  const hostRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    setWidth(Math.round(host.clientWidth));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const n = values.length;
  const pl = compact ? 6 : 44;
  const pr = compact ? 6 : 10;
  const pt = 16;
  const pb = compact ? 24 : 28;
  const x = i => pl + (width - pl - pr) * (n <= 1 ? 0.5 : i / (n - 1));
  const y = v => pt + (height - pt - pb) * (1 - (v - min) / (max - min || 1));
  const points = values.map((v, i) => (v === null || v === undefined ? null : [x(i), y(v)])).filter(Boolean);
  const lastIndex = values.reduce((last, v, i) => (v === null || v === undefined ? last : i), -1);

  let line = '';
  let area = '';
  if (points.length) {
    line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ');
    const base = height - pb;
    area = `${line} L${points[points.length - 1][0]} ${base} L${points[0][0]} ${base} Z`;
  }

  return (
    <div ref={hostRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
          className="block overflow-visible"
        >
          {ticks.map(t => (
            <g key={t}>
              <line x1={pl} x2={width - pr} y1={y(t)} y2={y(t)} stroke={chart.grid} strokeWidth="1" />
              {!compact && (
                <text x={pl - 10} y={y(t) + 4} textAnchor="end" className="fill-slate-600 text-[12px]">
                  {tickFormat(t)}
                </text>
              )}
            </g>
          ))}
          {area && <path d={area} fill={chart.ridge} opacity={compact ? 0.6 : 1} />}
          {target && (
            <>
              <line
                x1={pl}
                x2={width - pr}
                y1={y(target.value)}
                y2={y(target.value)}
                stroke={brand.teal.DEFAULT}
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <text
                x={width - pr}
                y={y(target.value) - 8}
                textAnchor="end"
                className="text-[12px] font-semibold"
                fill={brand.teal.ink}
              >
                {target.label}
              </text>
            </>
          )}
          {line && (
            <path
              d={line}
              fill="none"
              stroke={chart.line}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {(dots || points.length === 1) &&
            points
              .slice(0, -1)
              .map(([px, py]) => <circle key={`${px}-${py}`} cx={px} cy={py} r="3.2" fill={chart.line} />)}
          {pines
            .filter(i => i >= 0 && i < n && values[i] !== null && values[i] !== undefined)
            .map(i => (
              <g key={`pine-${i}`} transform={`translate(${x(i)} ${y(values[i]) - 7})`}>
                <path d={PINE} fill={chart.line} />
                <line x1="0" y1="0" x2="0" y2="5" stroke={chart.line} strokeWidth="1.5" />
              </g>
            ))}
          {lastIndex >= 0 && (
            <circle
              cx={x(lastIndex)}
              cy={y(values[lastIndex])}
              r="5"
              fill="#FFFFFF"
              stroke={chart.line}
              strokeWidth="2.5"
            />
          )}
          {xlabels.map(([i, text]) => (
            <text
              key={`${i}-${text}`}
              x={x(i)}
              y={height - 7}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-slate-600 text-[12px]"
            >
              {text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
