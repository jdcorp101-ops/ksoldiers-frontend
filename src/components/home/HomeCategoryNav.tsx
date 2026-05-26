import Link from 'next/link';
import type { WPCategory } from '@/lib/wp';

export function HomeSidebar({
  categories,
  currentSlug,
}: {
  categories: WPCategory[];
  currentSlug?: string;
}) {
  return (
    <aside className="m-sidebar" aria-label="카테고리">
      <h2 className="m-sidebar-title">카테고리</h2>
      <ul className="m-sidebar-list">
        <li>
          <Link
            href="/"
            className={`m-sidebar-item${!currentSlug ? ' active' : ''}`}
          >
            블로그 홈
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.slug}>
            <Link
              href={`/blog/category/${cat.slug}`}
              className={`m-sidebar-item${currentSlug === cat.slug ? ' active' : ''}`}
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function HomeTabs({ categories }: { categories: WPCategory[] }) {
  return (
    <nav className="m-tabs" aria-label="카테고리">
      <Link href="/" className="m-tab active">
        전체
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/blog/category/${cat.slug}`}
          className="m-tab"
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
