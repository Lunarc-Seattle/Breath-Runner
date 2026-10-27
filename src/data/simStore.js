import { brand, ink, onDeep } from '../styles/tokens.js';

/** Flat view of the brand palette (named after the design PDF); values come from styles/tokens.js. */
export const PDF_COLORS = {
  teal: brand.teal.DEFAULT,
  tealInk: brand.teal.ink, // teal dark enough for small text on light backgrounds (WCAG AA)
  tealDeep: brand.teal.deep, // filled teal that carries white text (WCAG AA)
  purpleDeep: brand.purple.deep, // filled purple that carries white text (WCAG AA)
  purple: brand.purple.DEFAULT,
  yellow: brand.yellow.DEFAULT,
  pink: brand.pink.DEFAULT,
  blue: brand.blue.DEFAULT
};

// Filled brand surfaces and the text color that stays readable on them (WCAG AA, 4.5:1):
// teal and purple swap to their deep variant under white text; yellow and pink keep ink text.
const SOLIDS = {
  [brand.teal.DEFAULT]: { bg: brand.teal.deep, fg: onDeep },
  [brand.purple.DEFAULT]: { bg: brand.purple.deep, fg: onDeep },
  [brand.yellow.DEFAULT]: { bg: brand.yellow.DEFAULT, fg: ink },
  [brand.pink.DEFAULT]: { bg: brand.pink.DEFAULT, fg: ink }
};
export const solid = color => SOLIDS[color] || { bg: color, fg: onDeep };
export const solidStyle = color => ({ backgroundColor: solid(color).bg, color: solid(color).fg });

export const INITIAL_SIM_STATE = {
  userName: 'Xiaoming',
  userRole: 'Post-Op Thoracic Recovery Patient',
  hospital: 'Peking University Hospital',
  enrolledDate: '15 April 2026',
  birthDate: '16/12/1992',
  email: 'xiaoming.rehab@pku-hospital.org',
  phone: '+86 138 0013 8000',
  // No trainer is paired until the user pairs one over Web Bluetooth.
  bleConnected: false,
  bleScanning: false,
  bleError: null,
  batteryPct: null,
  deviceName: null,
  lastMap: {
    id: 'MAP-FOREST-01',
    name: 'Forest · Level 1',
    progressPct: 68,
    lastPlayed: 'Yesterday, 8:30 PM',
    valveKpa: 1.5,
    targetL: 3.5,
    stars: 3
  },
  maps: [
    {
      id: 'MAP-FOREST-01',
      name: 'Forest · Level 1',
      kpa: 1.5,
      targetL: 3.5,
      color: PDF_COLORS.teal,
      unlocked: true,
      tag: 'Recommended Today',
      desc: 'Misty alpine pine forest. Gentle inspiratory flow to expand lower alveoli.'
    },
    {
      id: 'MAP-CANYON-02',
      name: 'Sunlit Canyon · Level 2',
      kpa: 2.5,
      targetL: 4.0,
      color: PDF_COLORS.yellow,
      unlocked: true,
      tag: 'Endurance Boost',
      desc: 'Moderate inhale & exhale resistance to strengthen diaphragm muscles.'
    },
    {
      id: 'MAP-GLACIER-03',
      name: 'Glacier Ridge · Level 3',
      kpa: 3.5,
      targetL: 4.5,
      color: PDF_COLORS.purple,
      unlocked: true,
      tag: 'Advanced Control',
      desc: 'High-pressure stability challenge for deep pulmonary recovery.'
    }
  ],
  scheduleTasks: [
    {
      id: 'TSK-1',
      time: '08:00 AM',
      title: 'Morning Warm-Up Breath',
      detail: '10 min • Forest Level 1 (1.5 kPa)',
      highlight: true,
      done: true
    },
    {
      id: 'TSK-2',
      time: '09:30 AM',
      title: 'Digital Spirometry Check',
      detail: '3 forced expiratory maneuvers (FVC & FEV1)',
      highlight: true,
      done: true
    },
    {
      id: 'TSK-3',
      time: '02:00 PM',
      title: 'Co-Op Session with Ali',
      detail: '15 min synchronized rhythm training',
      highlight: false,
      done: false
    },
    {
      id: 'TSK-4',
      time: '07:30 PM',
      title: 'Mouthpiece UV-C & Rinse',
      detail: 'Clean silicone mouthpiece after evening session',
      highlight: false,
      done: false
    }
  ],
  spirometryLogs: [
    { id: 'TEST-101', date: 'Oct 19', fvc: 3.18, fev1: 2.61, pef: 402, ratio: '82.1%' },
    { id: 'TEST-102', date: 'Oct 21', fvc: 3.42, fev1: 2.84, pef: 428, ratio: '83.0%' },
    { id: 'TEST-103', date: 'Oct 23', fvc: 3.66, fev1: 3.09, pef: 451, ratio: '84.4%' },
    { id: 'TEST-104', date: 'Oct 25', fvc: 3.89, fev1: 3.31, pef: 474, ratio: '85.1%' }
  ],
  disinfectionParts: [
    { part: 'Mouthpiece', pct: 85, color: PDF_COLORS.teal, status: 'Sterilize Soon' },
    { part: 'Filter', pct: 68, color: PDF_COLORS.purple, status: 'Good (68%)' },
    { part: 'Core Valve', pct: 46, color: PDF_COLORS.yellow, status: 'Optimal' },
    { part: 'Main Body', pct: 25, color: PDF_COLORS.pink, status: 'Clean' }
  ],
  bookedDays: [10, 19, 21, 24, 30],
  // Set by the Trainer & care booking form: { date: Date, slot: '9 to 11 AM' } (sample, never sent anywhere).
  disinfectionBooking: null,
  // Sample friends for the Home leaderboard; the patient's own row is computed from saved runs.
  friendsThisWeek: [
    { name: 'Ali', initials: 'A', tone: 'sun', coins: 1020 },
    { name: 'Bage', initials: 'B', tone: 'coral', coins: 640 },
    { name: 'Ms. Bai', initials: 'MB', tone: 'white', coins: 410 }
  ],
  leaseUsedDays: 18,
  leaseQuotaDays: 30,
  regressionRuns: [
    { id: 'REG-8841', target: 'Venturi_Flow_Sensor_Calibration', steps: '120,000', drift: '0.004L', status: 'PASS' },
    { id: 'REG-8842', target: 'Forest_Map_Physics_Sync_Engine', steps: '240,000', drift: '0.006L', status: 'PASS' },
    { id: 'REG-8843', target: 'BLE_5_GATT_Packet_Stream_Pipe', steps: '95,000', drift: '0.002L', status: 'PASS' }
  ]
};
