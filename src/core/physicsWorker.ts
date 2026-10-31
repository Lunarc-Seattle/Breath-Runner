/**
 * Off-main-thread physics step for the Forest Runner.
 *
 * The Worker caches the active level so only tiny per-frame state (RunnerState,
 * dt, holding, speed) crosses the message boundary instead of the full map geometry.
 *
 * Message protocol (main → worker):
 *   { type: 'setMap', mapId: string }              – call once when the level changes
 *   { type: 'step', state, dt, holding, speed, gen } – at most one in flight; dt may cover several frames
 *
 * Message protocol (worker → main):
 *   { type: 'stepped', state: RunnerState, gen }    – result of stepRunnerFor(); `gen` is echoed so
 *                                                    the engine can drop a step it has since overridden
 */
import { stepRunnerFor } from './forestRunner.ts';
import { getLevel } from './forestLevels.ts';
import type { RunnerState } from './forestRunner.ts';
import type { Level, LevelId } from './forestLevels.ts';

let cachedLevel: Level = getLevel('MAP-FOREST-01');

type WorkerInMessage =
  | { type: 'setMap'; mapId: string }
  | { type: 'step'; state: RunnerState; dt: number; holding: boolean; speed: number; gen: number };

type WorkerOutMessage = { type: 'stepped'; state: RunnerState; gen: number };

self.onmessage = ({ data }: MessageEvent<WorkerInMessage>) => {
  if (data.type === 'setMap') {
    cachedLevel = getLevel(data.mapId as LevelId);
    return;
  }
  if (data.type === 'step') {
    const next = stepRunnerFor(
      data.state,
      data.dt,
      data.holding,
      cachedLevel.map,
      cachedLevel.config,
      data.speed * cachedLevel.speed
    );
    (self as unknown as { postMessage: (msg: WorkerOutMessage) => void }).postMessage({
      type: 'stepped',
      state: next,
      gen: data.gen
    });
  }
};
