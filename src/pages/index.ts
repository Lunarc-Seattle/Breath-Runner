/**
 * Route slug -> page component, loaded lazily so each page becomes its own code-split chunk.
 * Slugs and nav metadata live in src/app/routes.js.
 * The lazy() call + Suspense in App.jsx means only the current page's JS is downloaded.
 */
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

type PageMap = Record<string, LazyExoticComponent<ComponentType>>;

export const PAGES: PageMap = {
  home: lazy(() => import('./HomePage.jsx')),
  schedule: lazy(() => import('./SchedulePage.jsx')),
  maps: lazy(() => import('./MapsPage.jsx')),
  play: lazy(() => import('./PlayPage.jsx')),
  history: lazy(() => import('./HistoryPage.jsx')),
  spirometry: lazy(() => import('./SpirometryPage.jsx')),
  coop: lazy(() => import('./CoopPage.jsx')),
  ranking: lazy(() => import('./RankingPage.jsx')),
  trainer: lazy(() => import('./TrainerPage.jsx')),
  'care-team': lazy(() => import('./CareTeamPage.jsx')),
  doctor: lazy(() => import('./DoctorPage.jsx')),
  journey: lazy(() => import('./JourneyPage.jsx')),
  profile: lazy(() => import('./ProfilePage.jsx'))
};
