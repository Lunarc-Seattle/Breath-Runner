/**
 * Every page in the app, keyed by the slug used in the URL hash (#/play, #/history, …).
 * Order and `group` drive the navigation drawer; `code` is the number shown in the UI
 * (01–12 are the original design pages; Run History was added later as 13).
 */
export const ROUTES = [
  {
    slug: 'home',
    code: '01',
    name: 'Welcome & Today',
    subtitle: 'Resume session, pick map & inline Bluetooth pair',
    badge: '#13A4A9',
    group: null
  },
  {
    slug: 'schedule',
    code: '02',
    name: "Today's Schedule",
    subtitle: 'Taskly-inspired daily rehab routine & weekly pins',
    badge: '#F0C754',
    group: 'Train'
  },
  {
    slug: 'maps',
    code: '03',
    name: 'Choose a Map',
    subtitle: 'Select Forest, Canyon, or Glacier resistance scenes',
    badge: '#96C7D2',
    group: 'Train'
  },
  {
    slug: 'play',
    code: '04',
    name: 'Training Game',
    subtitle: 'Forest Level 1 interactive breath runner game',
    badge: '#13A4A9',
    group: 'Train'
  },
  {
    slug: 'history',
    code: '13',
    name: 'Run History',
    subtitle: 'Your saved Breath Runner runs, coins & breath sync',
    badge: '#13A4A9',
    group: 'Train'
  },
  {
    slug: 'spirometry',
    code: '05',
    name: 'Spirometry Lab',
    subtitle: 'Real-time 1,000Hz lung capacity (FVC / FEV1) test',
    badge: '#8E90C6',
    group: 'Train'
  },
  {
    slug: 'coop',
    code: '06',
    name: 'Multiplayer Co-Op',
    subtitle: 'Live 2-player synchronized breathing arena',
    badge: '#F0A7AB',
    group: 'Together'
  },
  {
    slug: 'ranking',
    code: '07',
    name: 'Community Ranking',
    subtitle: 'Friends leaderboard (Ali, Bage, Ms. Bai) & trends',
    badge: '#F0C754',
    group: 'Together'
  },
  {
    slug: 'hygiene',
    code: '08',
    name: 'Hygiene & Booking',
    subtitle: '4-part disinfection ring & April sterilization calendar',
    badge: '#13A4A9',
    group: 'Care'
  },
  {
    slug: 'rental',
    code: '09',
    name: 'Device Rental',
    subtitle: 'Hospital shared trainer lease & cloud telemetry',
    badge: '#96C7D2',
    group: 'Care'
  },
  {
    slug: 'doctor',
    code: '10',
    name: 'Doctor & CI Pipeline',
    subtitle: 'Thoracic physician guidance & automated trace checks',
    badge: '#8E90C6',
    group: 'Care'
  },
  {
    slug: 'journey',
    code: '11',
    name: 'Recovery Journey',
    subtitle: 'Emotion curve & pulmonary behavior sliders',
    badge: '#F0A7AB',
    group: 'You'
  },
  {
    slug: 'profile',
    code: '12',
    name: 'My Profile',
    subtitle: 'User profile, training modules, rental card & badges',
    badge: '#8E90C6',
    group: 'You'
  }
];

export const NAV_GROUPS = ['Train', 'Together', 'Care', 'You'];

export const DEFAULT_SLUG = 'home';

export function findRoute(slug) {
  return ROUTES.find(r => r.slug === slug) || null;
}
