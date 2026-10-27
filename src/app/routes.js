import { brand } from '../styles/tokens.js';

/**
 * Every page in the app, keyed by the slug used in the URL hash (#/play, #/history, …).
 * Order and `group` drive the navigation drawer; `code` is the number shown in the UI
 * (01–12 are the original design pages; Progress, the saved-run history, was added later as 13).
 */
export const ROUTES = [
  {
    slug: 'home',
    code: '01',
    name: 'Home',
    subtitle: "Today's run, breath sync, trainer & friends",
    badge: brand.teal.DEFAULT,
    group: null
  },
  {
    slug: 'schedule',
    code: '02',
    name: "Today's Schedule",
    subtitle: 'Taskly-inspired daily rehab routine & weekly pins',
    badge: brand.yellow.DEFAULT,
    group: 'Train'
  },
  {
    slug: 'maps',
    code: '03',
    name: 'Choose a Map',
    subtitle: 'Select Forest, Canyon, or Glacier resistance scenes',
    badge: brand.blue.DEFAULT,
    group: 'Train'
  },
  {
    slug: 'play',
    code: '04',
    name: 'Training Game',
    subtitle: 'Forest Level 1 interactive breath runner game',
    badge: brand.teal.DEFAULT,
    group: 'Train'
  },
  {
    slug: 'history',
    code: '13',
    name: 'Progress',
    subtitle: 'Breath sync, runs & coins from your saved runs',
    badge: brand.teal.DEFAULT,
    group: 'Train'
  },
  {
    slug: 'spirometry',
    code: '05',
    name: 'Spirometry Lab',
    subtitle: 'Real-time 1,000Hz lung capacity (FVC / FEV1) test',
    badge: brand.purple.DEFAULT,
    group: 'Train'
  },
  {
    slug: 'coop',
    code: '06',
    name: 'Multiplayer Co-Op',
    subtitle: 'Live 2-player synchronized breathing arena',
    badge: brand.pink.DEFAULT,
    group: 'Together'
  },
  {
    slug: 'ranking',
    code: '07',
    name: 'Community Ranking',
    subtitle: 'Friends leaderboard (Ali, Bage, Ms. Bai) & trends',
    badge: brand.yellow.DEFAULT,
    group: 'Together'
  },
  {
    slug: 'hygiene',
    code: '08',
    name: 'Hygiene & Booking',
    subtitle: '4-part disinfection ring & April sterilization calendar',
    badge: brand.teal.DEFAULT,
    group: 'Care'
  },
  {
    slug: 'rental',
    code: '09',
    name: 'Device Rental',
    subtitle: 'Hospital shared trainer lease & cloud telemetry',
    badge: brand.blue.DEFAULT,
    group: 'Care'
  },
  {
    slug: 'doctor',
    code: '10',
    name: 'Doctor & CI Pipeline',
    subtitle: 'Thoracic physician guidance & automated trace checks',
    badge: brand.purple.DEFAULT,
    group: 'Care'
  },
  {
    slug: 'journey',
    code: '11',
    name: 'Recovery Journey',
    subtitle: 'Emotion curve & pulmonary behavior sliders',
    badge: brand.pink.DEFAULT,
    group: 'You'
  },
  {
    slug: 'profile',
    code: '12',
    name: 'My Profile',
    subtitle: 'User profile, training modules, rental card & badges',
    badge: brand.purple.DEFAULT,
    group: 'You'
  }
];

export const NAV_GROUPS = ['Train', 'Together', 'Care', 'You'];

export const DEFAULT_SLUG = 'home';

export function findRoute(slug) {
  return ROUTES.find(r => r.slug === slug) || null;
}
