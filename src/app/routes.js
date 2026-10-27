import { brand } from '../styles/tokens.js';

/**
 * Every page in the app, keyed by the slug used in the URL hash (#/play, #/history, …).
 * Order and `group` drive the navigation drawer; `code` is the number shown in the UI
 * (01–12 are the original design pages; Progress, the saved-run history, was added later as 13).
 * Trainer & Care (08) took over the old Hygiene (08) and Device Rental (09) pages; Care Team (14) is new.
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
    slug: 'trainer',
    code: '08',
    name: 'Trainer & Care',
    subtitle: 'Paired trainer, hospital loan, hygiene & disinfection booking',
    badge: brand.teal.DEFAULT,
    group: 'Care'
  },
  {
    slug: 'care-team',
    code: '14',
    name: 'Care Team',
    subtitle: 'Clinician view: sample patients, adherence & prescriptions',
    badge: brand.purple.DEFAULT,
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

/** Old slugs that now live on another page, so saved links and bookmarks still land somewhere useful. */
export const REDIRECTS = { hygiene: 'trainer', rental: 'trainer' };

/** The page a slug opens: itself, its redirect target, or null when unknown. */
export function resolveSlug(slug) {
  const target = REDIRECTS[slug] || slug;
  return findRoute(target) ? target : null;
}

export function findRoute(slug) {
  return ROUTES.find(r => r.slug === slug) || null;
}
