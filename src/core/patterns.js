/**
 * Breathing pattern definitions.
 * Shared by the browser app and the Express server (pure ES module, no DOM access).
 *
 * A phase is { type: 'inhale' | 'hold' | 'exhale', seconds, label?, to? }.
 * `to` is the target lung level (0..1) at the end of the phase; inhale defaults to 1, exhale to 0.
 */

export const PHASE_LABELS = {
  inhale: 'Inhale',
  hold: 'Hold',
  exhale: 'Exhale'
};

export const PATTERNS = [
  {
    id: 'box',
    name: 'Box Breathing',
    tagline: 'Steady focus',
    description: 'Equal four-count inhale, hold, exhale and hold. A simple way to settle attention.',
    color: '#13A4A9',
    defaultRounds: 6,
    phases: [
      { type: 'inhale', seconds: 4 },
      { type: 'hold', seconds: 4 },
      { type: 'exhale', seconds: 4 },
      { type: 'hold', seconds: 4 }
    ]
  },
  {
    id: '478',
    name: '4-7-8 Relax',
    tagline: 'Wind down',
    description: 'Short inhale, long hold, longer exhale. Often used before sleep.',
    color: '#8E90C6',
    defaultRounds: 4,
    phases: [
      { type: 'inhale', seconds: 4 },
      { type: 'hold', seconds: 7 },
      { type: 'exhale', seconds: 8 }
    ]
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    tagline: 'Balanced rhythm',
    description: 'About 5.5 breaths per minute, with equal inhale and exhale and no holds.',
    color: '#5B7042',
    defaultRounds: 10,
    phases: [
      { type: 'inhale', seconds: 5.5 },
      { type: 'exhale', seconds: 5.5 }
    ]
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    tagline: 'Quick reset',
    description: 'A double inhale through the nose, then a long, slow exhale.',
    color: '#D94E34',
    defaultRounds: 5,
    phases: [
      { type: 'inhale', seconds: 2, to: 0.75 },
      { type: 'inhale', seconds: 1, label: 'Top-up inhale' },
      { type: 'exhale', seconds: 6 }
    ]
  }
];

export const CUSTOM_LIMITS = { min: 0, max: 20 };

export function getPattern(id) {
  return PATTERNS.find(p => p.id === id) || null;
}

export function cycleSeconds(pattern) {
  return pattern.phases.reduce((sum, ph) => sum + ph.seconds, 0);
}

export function phaseLabel(phase) {
  return phase.label || PHASE_LABELS[phase.type];
}

/**
 * Build a pattern from four user-chosen durations. Zero-length phases are dropped.
 * Throws if the result has no inhale or no exhale.
 */
export function createCustomPattern({ inhale = 4, holdIn = 0, exhale = 4, holdOut = 0 } = {}) {
  const clamp = v => Math.min(CUSTOM_LIMITS.max, Math.max(CUSTOM_LIMITS.min, Number(v) || 0));
  const phases = [
    { type: 'inhale', seconds: clamp(inhale) },
    { type: 'hold', seconds: clamp(holdIn) },
    { type: 'exhale', seconds: clamp(exhale) },
    { type: 'hold', seconds: clamp(holdOut) }
  ].filter(ph => ph.seconds > 0);

  const pattern = {
    id: 'custom',
    name: 'Custom',
    tagline: 'Your rhythm',
    description: phases.map(ph => `${phaseLabel(ph)} ${ph.seconds}s`).join(' · '),
    color: '#E39D44',
    defaultRounds: 6,
    phases
  };
  validatePattern(pattern);
  return pattern;
}

export function validatePattern(pattern) {
  if (!pattern || !Array.isArray(pattern.phases) || pattern.phases.length === 0) {
    throw new Error('Pattern must have at least one phase');
  }
  for (const ph of pattern.phases) {
    if (!PHASE_LABELS[ph.type]) throw new Error(`Unknown phase type: ${ph.type}`);
    if (!(ph.seconds > 0)) throw new Error('Phase duration must be positive');
  }
  if (!pattern.phases.some(ph => ph.type === 'inhale')) throw new Error('Pattern needs an inhale phase');
  if (!pattern.phases.some(ph => ph.type === 'exhale')) throw new Error('Pattern needs an exhale phase');
  return true;
}
