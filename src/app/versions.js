/**
 * Released web versions, newest first. Each one is a git tag (web-v1, web-v2, …) that the deploy
 * rebuilds at /v1/, /v2/, … (scripts/ci/build-versions.sh), so earlier designs stay playable.
 * To release a new version: add it here and to the README table, then tag the merge commit.
 */
export const SITE_URL = 'https://lunarc-seattle.github.io/breath-runner/';
export const REPO_URL = 'https://github.com/Lunarc-Seattle/breath-runner';

export const VERSIONS = [
  {
    id: 'v2',
    date: '2026-10-27',
    summary: 'Web UI design: new Home, Progress, Trainer & care and Care team'
  },
  {
    id: 'v1',
    date: '2026-10-26',
    summary: 'First release of the app and the Breath Runner game'
  }
];

export const CURRENT_VERSION = VERSIONS[0];
