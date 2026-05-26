'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/toc';

export default function TableOfContents({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <nav className="post-toc" aria-label="콘텐츠 순서">
      <h3 className="post-toc-title">콘텐츠 순서</h3>
      <ul className="post-toc-list">
        {toc.map(({ id, text, depth }) => (
          <li key={id} style={depth === 3 ? { paddingLeft: '12px' } : undefined}>
            <a
              href={`#${id}`}
              onClick={() => setActiveId(id)}
              className={`post-toc-item${activeId === id ? ' active' : ''}`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
