/** Route slug -> page component. Slugs and nav metadata live in src/app/routes.js. */
import HomePage from './HomePage.jsx';
import SchedulePage from './SchedulePage.jsx';
import MapsPage from './MapsPage.jsx';
import PlayPage from './PlayPage.jsx';
import HistoryPage from './HistoryPage.jsx';
import SpirometryPage from './SpirometryPage.jsx';
import CoopPage from './CoopPage.jsx';
import RankingPage from './RankingPage.jsx';
import TrainerPage from './TrainerPage.jsx';
import CareTeamPage from './CareTeamPage.jsx';
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
  trainer: TrainerPage,
  'care-team': CareTeamPage,
  doctor: DoctorPage,
  journey: JourneyPage,
  profile: ProfilePage
};
