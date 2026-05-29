import { cache } from 'react';
import {
  fetchGraphQL,
  getCategories,
  getPostBySlug,
  POST_CARD_FRAGMENT,
  type WPPost,
  type WPPosts,
} from '@/lib/wp';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import PostCard from '@/components/PostCard';
import JsonLd from '@/components/JsonLd';
import PostAuthor from '@/components/PostAuthor';
import TableOfContents from '@/components/TableOfContents';
import ReadingProgress from '@/components/ReadingProgress';
import { HomeSidebar } from '@/components/home/HomeCategoryNav';
import { SITE_URL } from '@/lib/site';
import { stripHtml, truncateAtBoundary } from '@/lib/html';
import { buildBreadcrumb } from '@/lib/breadcrumb';
import { isRecent, readingMinutes } from '@/lib/date';
import { extractToc } from '@/lib/toc';

type Params = Promise<{ slug: string }>;

// 한글 슬러그 글은 동적 렌더로 처리한다.
// Next 16은 페이지를 캐시할 때 요청 경로(pathname)를 그대로 캐시 태그로 추가하는데
// (server/lib/implicit-tags.ts), 이 태그가 x-next-cache-tags HTTP 헤더로 나간다.
// 한글 등 non-ASCII 경로는 헤더에서 ERR_INVALID_CHAR로 throw → on-demand 렌더 500.
// force-dynamic + force-no-store로 이 라우트의 풀라우트/데이터 캐시를 끄면
// 캐시 태그 헤더 자체가 생성되지 않아 문제를 우회한다. (홈/목록/카테고리는 경로가
// 영문이라 영향 없음.) 매 요청 SSR이므로 함수 리전을 백엔드와 같은 icn1로 고정해
// 지연을 줄인다(vercel.json).
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const getRelatedPosts = cache(async (categorySlug: string, excludeSlug: string): Promise<WPPost[]> => {
  try {
    const data = await fetchGraphQL<{ posts: WPPosts }>(
      `
      ${POST_CARD_FRAGMENT}
      query RelatedPosts($categoryName: String, $first: Int) {
        posts(first: $first, where: { categoryName: $categoryName }) {
          nodes { ...PostCardFields }
        }
      }
    `,
      { categoryName: categorySlug, first: 4 },
      { tags: ['posts', `category:${categorySlug}`] }
    );
    return (data?.posts?.nodes || []).filter((p) => p.slug !== excludeSlug).slice(0, 3);
  } catch (error) {
    console.error('Related posts fetch failed:', error);
    return [];
  }
});

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: '글을 찾을 수 없습니다' };
  }

  const title = post.seo?.title || post.title;
  const cleanExcerpt = stripHtml(post.excerpt);
  const description =
    post.seo?.metaDesc ||
    (cleanExcerpt ? truncateAtBoundary(cleanExcerpt, 160) : `${post.title} - ksoldiers 군 생활 블로그`);
  const imageUrl = post.featuredImage?.node?.sourceUrl;
  const url = `/blog/${slug}/`;
  const modifiedTime = post.modified || post.date;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: post.date,
      modifiedTime,
      locale: 'ko_KR',
      siteName: 'ksoldiers',
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: post.featuredImage?.node?.altText || post.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

const truncate = (s: string, len = 40) => (s.length > len ? `${s.slice(0, len)}…` : s);

export default async function SinglePostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const category = post.categories?.nodes?.[0];
  const [categories, relatedPosts] = await Promise.all([
    getCategories(),
    category ? getRelatedPosts(category.slug, slug) : Promise.resolve<WPPost[]>([]),
  ]);

  const { html: bodyHtml, toc } = extractToc(post.content ?? '');
  const readMinutes = readingMinutes(post.content ?? '');

  const articleExcerpt = stripHtml(post.excerpt);
  const articleDescription =
    post.seo?.metaDesc ||
    (articleExcerpt ? truncateAtBoundary(articleExcerpt, 160) : `${post.title} - ksoldiers 군 생활 블로그`);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: articleDescription,
    inLanguage: 'ko-KR',
    datePublished: post.date,
    dateModified: post.modified || post.date,
    author: { '@type': 'Organization', name: 'ksoldiers', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'ksoldiers', url: SITE_URL },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${slug}/`,
    },
    ...(post.featuredImage?.node?.sourceUrl
      ? { image: [post.featuredImage.node.sourceUrl] }
      : {}),
    ...(category ? { articleSection: category.name } : {}),
  };

  const { items: breadcrumbItems, schema: breadcrumbSchema } = buildBreadcrumb([
    { name: '홈', path: '/' },
    { name: '블로그', path: '/blog/' },
    ...(category
      ? [{ name: category.name, path: `/blog/category/${category.slug}/` }]
      : []),
    { name: post.title, path: `/blog/${slug}/` },
  ]);

  return (
    <main className="single-post-page">
      <ReadingProgress />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <div className="single-post-layout">
        <aside className="single-post-sidebar">
          <div className="single-post-sidebar-inner">
            <HomeSidebar categories={categories} currentSlug={category?.slug} />
            <TableOfContents toc={toc} />
          </div>
        </aside>

        <article className="single-post-main">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              {breadcrumbItems.slice(0, -1).map((item, idx) => (
                <li key={idx}>
                  <Link href={item.path} className="hover-text-accent">{item.name}</Link>
                  <span className="breadcrumb-sep">›</span>
                </li>
              ))}
              <li aria-current="page">{truncate(breadcrumbItems[breadcrumbItems.length - 1].name)}</li>
            </ol>
          </nav>

          {post.featuredImage?.node?.sourceUrl ? (
            <div className="single-post-hero">
              {isRecent(post.date) && <span className="m-badge-new">NEW</span>}
              <Image
                src={post.featuredImage.node.sourceUrl}
                alt={post.featuredImage.node.altText || post.title}
                fill
                sizes="(max-width: 1024px) 100vw, 920px"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          ) : (
            <div className="single-post-hero-placeholder" />
          )}

          <header className="single-post-header">
            {category && (
              <Link href={`/blog/category/${category.slug}/`} className="single-post-badge">
                {category.name}
              </Link>
            )}
            <h1 className="single-post-title">{post.title}</h1>
            <PostAuthor date={post.date} readMinutes={readMinutes} />
          </header>

          <div
            className="post-content single-post-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {relatedPosts.length > 0 && (
            <section className="single-related">
              <h2 className="single-related-title">관련 글</h2>
              <div className="single-related-grid">
                {relatedPosts.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
