import { useCallback, useEffect, useState } from 'react';
import { getSessionRepository } from '../services/apiClient.js';
import { seedDemoRunsIfEmpty } from '../data/seedData.js';

// Seed demo history into localStorage on first load if no runs exist yet.
seedDemoRunsIfEmpty();

/**
 * Saved Breath Runner runs from the session repository (Express API or localStorage), newest first.
 * status: 'loading' | 'ready' | 'error'.
 */
export function useSavedRuns() {
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const repo = await getSessionRepository();
      const list = await repo.list();
      const rows = (Array.isArray(list) ? list : []).filter(r => r && typeof r === 'object');
      rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setRuns(rows);
      setStatus('ready');
    } catch (err) {
      setError(err?.message || 'Unknown error');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { runs, setRuns, status, error, reload: load };
}
