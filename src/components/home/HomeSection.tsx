import Link from 'next/link';
import type { WPPost } from '@/lib/wp';
import { GridCard, HeroCard, ListCard, PcHeroLarge } from './HomeCards';

type Props = {
  title: string;
  moreHref: string;
  posts: WPPost[];
};

export default function HomeSection({ title, moreHref, posts }: Props) {
  if (posts.length === 0) return null;

  const mobileHero = posts[0];
  const mobileList = posts.slice(1);

  const pcLarge = posts[0];
  const pcGrid = posts.slice(1, 4);

  return (
    <section className="m-section">
      <header className="m-section-header">
        <h2 className="m-section-title">{title}</h2>
        <Link href={moreHref} className="m-section-more">
          더보기
        </Link>
      </header>

      <HeroCard post={mobileHero} />

      <div className="m-pc-hero">
        <PcHeroLarge post={pcLarge} />
      </div>

      {mobileList.length > 0 && (
        <div className="m-list">
          {mobileList.map((p) => (
            <ListCard key={p.slug} post={p} />
          ))}
        </div>
      )}

      {pcGrid.length > 0 && (
        <div className="m-grid">
          {pcGrid.map((p) => (
            <GridCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </section>
  );
}
