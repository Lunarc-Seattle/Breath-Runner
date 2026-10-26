/** Route slug -> page component. Slugs and nav metadata live in src/app/routes.js. */
import HomePage from './HomePage.jsx';
import SchedulePage from './SchedulePage.jsx';
import MapsPage from './MapsPage.jsx';
import PlayPage from './PlayPage.jsx';
import HistoryPage from './HistoryPage.jsx';
import SpirometryPage from './SpirometryPage.jsx';
import CoopPage from './CoopPage.jsx';
import RankingPage from './RankingPage.jsx';
import HygienePage from './HygienePage.jsx';
import RentalPage from './RentalPage.jsx';
import DoctorPage from './DoctorPage.jsx';
import JourneyPage from './JourneyPage.jsx';
import ProfilePage from './ProfilePage.jsx';

export const PAGES = {
  home: HomePage,
  schedule: SchedulePage,
  maps: MapsPage,
  play: PlayPage,
  history: HistoryPage,
  spirometry: SpirometryPage,
  coop: CoopPage,
  ranking: RankingPage,
  hygiene: HygienePage,
  rental: RentalPage,
  doctor: DoctorPage,
  journey: JourneyPage,
  profile: ProfilePage
};
