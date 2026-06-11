'use client';

import { useEffect } from 'react';

/**
 * Injects a preload link with fetchpriority="high" for the LCP image.
 * This ensures Lighthouse detects the image as discoverable and prioritized.
 * Works with dynamic/data-dependent image URLs that Next.js Image priority prop can't handle.
 */
export default function LCPPreloader({ imageUrl, sizes }) {
  useEffect(() => {
    if (!imageUrl) return;

    // Check if preload already exists to avoid duplicates
    const existingPreload = document.querySelector(`link[href="${imageUrl}"]`);
    if (existingPreload) return;

    // Create and inject preload link
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageUrl;
    link.fetchPriority = 'high';
    if (sizes) link.sizes = sizes;

    document.head.appendChild(link);
  }, [imageUrl, sizes]);

  return null; // This component only injects a link tag, it doesn't render anything
}
