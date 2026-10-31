import { useCallback, useEffect, useState } from 'react';
import { getSessionRepository } from '../services/apiClient.js';
import { seedDemoRunsIfEmpty } from '../data/seedData.js';

// Seed demo history into localStorage on first load if no runs exist yet.
seedDemoRunsIfEmpty();

/** Saved runs from the session repository, newest first. */
async function loadRuns() {
  const repo = await getSessionRepository();
  const list = await repo.list();
  const rows = (Array.isArray(list) ? list : []).filter(r => r && typeof r === 'object');
  return rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

/**
 * Saved Breath Runner runs from the session repository (Express API or localStorage), newest first.
 * status: 'loading' | 'ready' | 'error'.
 */
export function useSavedRuns() {
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  // setState only runs in the promise callbacks, never synchronously in the effect.
  const showRuns = useCallback(promise => {
    promise.then(
      sorted => {
        setRuns(sorted);
        setStatus('ready');
      },
      err => {
        setError(err?.message || 'Unknown error');
        setStatus('error');
      }
    );
  }, []);

  // First load: status already starts as 'loading' with no error, so there is nothing to reset.
  useEffect(() => {
    showRuns(loadRuns());
  }, [showRuns]);

  const reload = useCallback(() => {
    setStatus('loading');
    setError('');
    showRuns(loadRuns());
  }, [showRuns]);

  return { runs, setRuns, status, error, reload };
}
