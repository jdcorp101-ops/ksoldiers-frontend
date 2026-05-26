import Image from 'next/image';
import type { WPPost } from '@/lib/wp';

type Props = {
  post: WPPost;
  sizes: string;
  priority?: boolean;
  fallbackClassName?: string;
};

export default function PostImage({ post, sizes, priority, fallbackClassName }: Props) {
  const src = post.featuredImage?.node?.sourceUrl;
  const alt = post.featuredImage?.node?.altText || post.title;

  if (!src) {
    return <div className={fallbackClassName ?? 'postcard-image-fallback'} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: 'cover' }}
    />
  );
}
