import Link from 'next/link';
import type { WPPost } from '@/lib/wp';
import PostImage from './PostImage';
import { formatDateKR } from '@/lib/date';

type Variant = 'featured' | 'default' | 'list';

type Props = {
  post: WPPost;
  variant?: Variant;
  priority?: boolean;
  sizes?: string;
};

function PostMeta({ date, size = 'md' }: { date: string; size?: 'md' | 'lg' }) {
  return (
    <div className={size === 'lg' ? 'postcard-meta postcard-meta-lg' : 'postcard-meta'}>
      <span>{formatDateKR(date)}</span>
    </div>
  );
}

export default function PostCard({ post, variant = 'default', priority = false, sizes }: Props) {
  const category = post.categories?.nodes?.[0];
  const href = `/blog/${post.slug}/`;

  if (variant === 'list') {
    return (
      <article className="postcard-list">
        <Link href={href} className="postcard-list-image img-zoom-container" aria-label={post.title}>
          <PostImage
            post={post}
            sizes={sizes ?? '(max-width: 640px) 110px, 200px'}
          />
        </Link>
        <div className="postcard-list-body">
          {category && <div className="postcard-category">{category.name}</div>}
          <h3 className="postcard-list-title">
            <Link href={href} className="hover-text-accent">
              {post.title}
            </Link>
          </h3>
          <PostMeta date={post.date} />
        </div>
      </article>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="postcard-featured">
        <Link href={href} className="img-zoom-container postcard-featured-image">
          <PostImage
            post={post}
            sizes={sizes ?? '(max-width: 768px) 100vw, 66vw'}
            priority={priority}
          />
        </Link>
        <div>
          {category && <div className="postcard-category postcard-category-lg">{category.name}</div>}
          <h3 className="postcard-featured-title">
            <Link href={href} className="hover-text-accent">
              {post.title}
            </Link>
          </h3>
          <PostMeta date={post.date} size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="saas-card">
      <Link href={href} className="img-zoom-container postcard-default-image">
        <PostImage post={post} sizes={sizes ?? '(max-width: 768px) 100vw, 33vw'} />
      </Link>
      {category && <div className="postcard-category">{category.name}</div>}
      <h3 className="postcard-default-title">
        <Link href={href} className="hover-text-accent">
          {post.title}
        </Link>
      </h3>
      <PostMeta date={post.date} />
    </div>
  );
}
