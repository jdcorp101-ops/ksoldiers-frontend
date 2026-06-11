'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent } from 'react';
import type { WPCategory } from '@/lib/wp';

export default function BlogFilter({ categories }: { categories: WPCategory[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    params.delete('after');
    params.delete('before');
    router.push(`/blog?${params.toString()}`);
  };

  const handleCategoryChange = (slug: string) => {
    router.push(slug ? `/category/${slug}` : '/blog');
  };

  return (
    <div className="filter-row">
      <div className="filter-pills animate-fade-in-up delay-100">
        <button
          type="button"
          onClick={() => handleCategoryChange('')}
          className={`filter-pill ${currentCategory === '' ? 'active' : ''}`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.slug}
            onClick={() => handleCategoryChange(cat.slug)}
            className={`filter-pill ${currentCategory === cat.slug ? 'active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="search-bar animate-fade-in-up delay-200">
        <input
          type="text"
          placeholder="블로그 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-submit" aria-label="검색">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>
    </div>
  );
}
