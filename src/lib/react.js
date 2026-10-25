/**
 * Single import point for React + htm, so the app runs as native ES modules
 * with no build step (works directly on GitHub Pages).
 */
import React from 'https://esm.sh/react@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';

export const html = htm.bind(React.createElement);
export const { useState, useEffect, useRef, useMemo, useCallback } = React;
export default React;
