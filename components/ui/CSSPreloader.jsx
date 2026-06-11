'use client';

import { useEffect } from 'react';

/**
 * Dynamically preloads the critical CSS file to reduce render-blocking impact.
 * The CSS will still load, but the browser knows about it earlier and loads it non-blocking.
 */
export default function CSSPreloader({ href = '/_next/static/css/main.css' }) {
  useEffect(() => {
    // Check if preload already exists to avoid duplicates
    const existingPreload = document.querySelector(`link[href="${href}"][rel="preload"]`);
    if (existingPreload) return;

    // Create and inject CSS preload link
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.fetchPriority = 'high';

    document.head.appendChild(link);
  }, [href]);

  return null; // This component only injects a link tag, it doesn't render anything
}
