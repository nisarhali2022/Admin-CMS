'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchWidget() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <h3 className="font-merriweather font-bold text-base text-text-primary mb-3 pb-2 border-b border-border">
        Search
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts…"
          className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white text-text-primary placeholder:text-text-secondary"
          aria-label="Search"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-accent text-white rounded hover:bg-orange-600 transition-colors text-sm font-medium"
          aria-label="Submit search"
        >
          🔍
        </button>
      </form>
    </div>
  );
}