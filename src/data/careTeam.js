/**
 * Sample patients for the care team view (from docs/design/web-ui.html). None of this is real:
 * the page labels it as sample data. Vital capacity series are generated from a fixed seed so
 * they look the same on every visit.
 */

// Luna's best breath each day since discharge (mL), starting the day after discharge.
const LUNA_SERIES = [
  2380, 2390, 2430, 2500, 2480, 2580, 2610, 2570, 2660, 2670, 2710, 2760, 2790, 2760, 2820, 2840, 2870, 2810, 2910,
  2860, 2870, 2930, 2970, 2990, 2950, 3010, 2950, 3050, 3000, 3030, 3010, 3010, 3020, 3080, 3090, 3120, 3130, 3100,
  3150, 3070, 3090, 3140
];

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A recovery curve that rises quickly then levels off; with `peakAt`, it falls back after the peak. */
function curve({ seed, days, start, end, peakAt, peak }) {
  const r = seeded(seed);
  const out = [];
  for (let i = 0; i < days; i++) {
    let v;
    if (peakAt && i > peakAt) v = peak + ((end - peak) * (i - peakAt)) / (days - 1 - peakAt);
    else {
      const top = peakAt ? peak : end;
      const len = peakAt || days - 1;
      v = start + ((top - start) * (1 - Math.exp(-i / (len * 0.55)))) / (1 - Math.exp(-1 / 0.55));
    }
    out.push(Math.round((v + (i && i < days - 1 ? (r() - 0.5) * 70 : 0)) / 10) * 10);
  }
  return out;
}

const daysAgo = n => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

/** Sessions done on each of the last 7 days (prescription: 3 a day), oldest first. */
export const CARE_PATIENTS = [
  {
    id: 'luna',
    name: 'Luna',
    initials: 'L',
    tone: 'sun',
    condition: 'Lobectomy',
    discharged: daysAgo(42),
    week: [3, 3, 2, 3, 3, 3, 1],
    series: LUNA_SERIES,
    last: ['Today', '8:10 AM'],
    status: ['sun', 'Disinfection due'],
    rx: { sessions: 3, minutes: 10, resistance: 4, target: 3600 }
  },
  {
    id: 'wj',
    name: 'Wang Jun',
    initials: 'WJ',
    tone: 'coral',
    condition: 'Pneumonia',
    discharged: daysAgo(24),
    week: [3, 2, 2, 0, 0, 0, 0],
    series: curve({ seed: 11, days: 20, start: 1900, end: 2050 }),
    last: ['Thursday', '8:02 PM'],
    status: ['coral', 'Inactive 4 days'],
    attention: true,
    rx: { sessions: 3, minutes: 8, resistance: 2, target: 2600 }
  },
  {
    id: 'sh',
    name: 'Sun Hao',
    initials: 'SH',
    tone: 'lavender',
    condition: 'Lobectomy',
    discharged: daysAgo(28),
    week: [3, 3, 3, 3, 2, 2, 1],
    series: curve({ seed: 5, days: 28, start: 2170, end: 2280, peakAt: 21, peak: 2590 }),
    last: ['Today', '7:40 AM'],
    status: ['coral', 'Capacity down 12%'],
    attention: true,
    rx: { sessions: 3, minutes: 10, resistance: 3, target: 2900 }
  },
  {
    id: 'zl',
    name: 'Zhou Lan',
    initials: 'ZL',
    tone: 'teal',
    condition: 'Lobectomy',
    discharged: daysAgo(20),
    week: [1, 2, 1, 2, 1, 2, 0],
    series: curve({ seed: 23, days: 19, start: 2270, end: 2410 }),
    last: ['Yesterday', '7:55 PM'],
    status: ['coral', '9 of 21 sessions'],
    attention: true,
    rx: { sessions: 3, minutes: 10, resistance: 3, target: 2900 }
  },
  {
    id: 'ln',
    name: 'Li Na',
    initials: 'LN',
    tone: 'teal',
    condition: 'Post COVID',
    discharged: daysAgo(48),
    week: [3, 3, 3, 3, 3, 3, 1],
    series: curve({ seed: 7, days: 48, start: 2470, end: 2910 }),
    last: ['Today', '9:02 AM'],
    status: ['teal', 'On track'],
    rx: { sessions: 3, minutes: 12, resistance: 4, target: 3300 }
  },
  {
    id: 'zm',
    name: 'Zhao Min',
    initials: 'ZM',
    tone: 'sun',
    condition: 'Pneumonia',
    discharged: daysAgo(31),
    week: [3, 3, 3, 3, 3, 2, 1],
    series: curve({ seed: 13, days: 31, start: 3190, end: 3480 }),
    last: ['Today', '8:30 AM'],
    status: ['teal', 'On track'],
    rx: { sessions: 3, minutes: 10, resistance: 5, target: 3800 }
  },
  {
    id: 'cy',
    name: 'Chen Yu',
    initials: 'CY',
    tone: 'lavender',
    condition: 'Post COVID',
    discharged: daysAgo(36),
    week: [3, 3, 3, 3, 2, 3, 0],
    series: curve({ seed: 17, days: 35, start: 2180, end: 2640 }),
    last: ['Yesterday', '8:40 PM'],
    status: ['sun', 'Battery 12%'],
    rx: { sessions: 3, minutes: 10, resistance: 3, target: 3100 }
  }
];

export const CONDITIONS = ['Lobectomy', 'Post COVID', 'Pneumonia'];

/** Prescription limits for the steppers: [min, max, step]. */
export const RX_LIMITS = {
  sessions: [1, 5, 1],
  minutes: [5, 20, 1],
  resistance: [1, 8, 1],
  target: [1500, 5000, 100]
};
