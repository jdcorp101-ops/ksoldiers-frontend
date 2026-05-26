import Link from 'next/link';
import type { WPPost } from '@/lib/wp';
import { isRecent, timeAgo } from '@/lib/date';
import PostImage from '@/components/PostImage';

const SOURCE_FALLBACK = 'ksoldiers';

export function HeroCard({ post }: { post: WPPost }) {
  const source = post.categories?.nodes?.[0]?.name || SOURCE_FALLBACK;
  return (
    <Link href={`/blog/${post.slug}`} className="m-hero-card">
      <div className="m-hero-card-image">
        {isRecent(post.date) && <span className="m-badge-new">NEW</span>}
        <PostImage post={post} sizes="(max-width: 480px) 100vw, 480px" />
      </div>
      <div className="m-hero-card-body">
        <span className="m-badge">{source}</span>
        <h3 className="m-hero-card-title">{post.title}</h3>
        <div className="m-card-meta">{timeAgo(post.date)}</div>
      </div>
    </Link>
  );
}

export function ListCard({ post }: { post: WPPost }) {
  const source = post.categories?.nodes?.[0]?.name || SOURCE_FALLBACK;
  return (
    <Link href={`/blog/${post.slug}`} className="m-list-card">
      <div className="m-list-card-thumb">
        <PostImage post={post} sizes="88px" />
      </div>
      <div className="m-list-card-body">
        <div className="m-list-card-source">{source}</div>
        <h4 className="m-list-card-title">{post.title}</h4>
        <div className="m-list-card-meta">{timeAgo(post.date)}</div>
      </div>
    </Link>
  );
}

export function PcHeroLarge({ post }: { post: WPPost }) {
  const source = post.categories?.nodes?.[0]?.name || SOURCE_FALLBACK;
  return (
    <Link href={`/blog/${post.slug}`} className="m-pc-hero-large">
      <div className="m-pc-hero-large-image">
        {isRecent(post.date) && <span className="m-badge-new">NEW</span>}
        <PostImage post={post} sizes="(min-width: 1024px) 720px, 100vw" />
      </div>
      <div className="m-pc-hero-large-body">
        <div className="m-pc-hero-large-source">{source}</div>
        <h3 className="m-pc-hero-large-title">{post.title}</h3>
        <div className="m-pc-hero-large-meta">{timeAgo(post.date)}</div>
      </div>
    </Link>
  );
}

export function GridCard({ post }: { post: WPPost }) {
  const source = post.categories?.nodes?.[0]?.name || SOURCE_FALLBACK;
  return (
    <Link href={`/blog/${post.slug}`} className="m-grid-card">
      <div className="m-grid-card-image">
        <PostImage
          post={post}
          sizes="(min-width: 1024px) 280px, (min-width: 768px) 380px, 100vw"
        />
      </div>
      <div className="m-grid-card-body">
        <div className="m-grid-card-source">{source}</div>
        <h4 className="m-grid-card-title">{post.title}</h4>
        <div className="m-grid-card-meta">{timeAgo(post.date)}</div>
      </div>
    </Link>
  );
}
