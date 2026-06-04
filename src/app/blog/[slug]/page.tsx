import { cache } from 'react';
import {
  fetchGraphQL,
  getAllPostSlugs,
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
import { stripHtml, truncateAtBoundary, optimizeContentImages } from '@/lib/html';
import { buildBreadcrumb } from '@/lib/breadcrumb';
import { isRecent, readingMinutes } from '@/lib/date';
import { extractToc } from '@/lib/toc';

type Params = Promise<{ slug: string }>;

// 글 상세는 빌드 타임에 전부 정적 생성(SSG)한다 — 각 글이 안정적 정적 페이지로
// 남아야 네이버가 글 단위로 색인을 누적·유지한다(허브/신규글만 노출되던 문제 해결).
//
// 한글 슬러그 주의: Next 16은 페이지를 캐시할 때 요청 경로(pathname)를 암시적 캐시
// 태그로 추가하고, 이 태그가 x-next-cache-tags 헤더로 나간다(server/lib/implicit-tags.ts).
// non-ASCII 경로는 헤더에서 ERR_INVALID_CHAR로 throw → "on-demand 렌더"가 500이 된다.
// 따라서 on-demand 렌더 경로를 아예 막는다:
//   - dynamicParams = false → 빌드 목록에 없는 슬러그는 404(런타임 렌더 안 함)
//   - revalidate = false   → 시간 기반 ISR 재생성도 끔(런타임 렌더 안 함)
// 즉 글 페이지는 오직 빌드 시점에만 렌더된다. 신규글/수정은 WP 발행 웹훅이 Vercel
// Deploy Hook(재빌드)을 트리거해 반영한다(발행→노출 수 분 지연 허용).
// (데이터 캐시 태그 post:<slug>는 wp.ts에서 이미 encodeURIComponent로 ASCII화함.)
export const dynamicParams = false;
export const revalidate = false;

export async function generateStaticParams() {
  return await getAllPostSlugs();
}

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

  const { html: tocHtml, toc } = extractToc(post.content ?? '');
  const bodyHtml = optimizeContentImages(tocHtml);
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
