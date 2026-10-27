import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SLUG, resolveSlug } from './routes.js';

/**
 * Hash routing (#/play) so it works on GitHub Pages without server rewrites:
 * deep links, reload and the browser back button all keep the current page.
 */
export function slugFromHash(hash) {
  const slug = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return resolveSlug(slug) || DEFAULT_SLUG;
}

export function useHashRoute() {
  const [slug, setSlug] = useState(() => slugFromHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setSlug(slugFromHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback(next => {
    const target = resolveSlug(next) || DEFAULT_SLUG;
    if (slugFromHash(window.location.hash) !== target) window.location.hash = `/${target}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return [slug, navigate];
}
