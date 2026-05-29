import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  fetchGraphQL,
  getAllCategorySlugs,
  getCategories,
  normalizeSlug,
  POST_CARD_FRAGMENT,
  type WPPost,
  type WPPosts,
  type WPPageInfo,
} from '@/lib/wp';
import PostCard from '@/components/PostCard';
import JsonLd from '@/components/JsonLd';
import { HomeSidebar } from '@/components/home/HomeCategoryNav';
import { stripHtml } from '@/lib/html';
import { buildBreadcrumb } from '@/lib/breadcrumb';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return await getAllCategorySlugs();
}

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ after?: string; before?: string }>;

type Category = {
  name: string;
  description: string | null;
  count: number | null;
};

type CategoryPageResponse = {
  category: Category | null;
  posts: WPPosts;
};

const POSTS_PER_PAGE = 12;

const getCategoryData = cache(async (
  rawSlug: string,
  after: string | null,
  before: string | null
): Promise<CategoryPageResponse | null> => {
  const slug = normalizeSlug(rawSlug);
  try {
    return await fetchGraphQL<CategoryPageResponse>(
      `
      ${POST_CARD_FRAGMENT}
      query GetCategoryPosts(
        $id: ID!,
        $categoryName: String,
        $first: Int,
        $last: Int,
        $after: String,
        $before: String
      ) {
        category(id: $id, idType: SLUG) {
          name
          description
          count
        }
        posts(
          first: $first,
          last: $last,
          after: $after,
          before: $before,
          where: { categoryName: $categoryName }
        ) {
          nodes { ...PostCardFields }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `,
      {
        id: slug,
        categoryName: slug,
        first: before ? null : POSTS_PER_PAGE,
        last: before ? POSTS_PER_PAGE : null,
        after: after || null,
        before: before || null,
      },
      { tags: ['posts', 'categories', `category:${slug}`] }
    );
  } catch (error) {
    console.error('Category fetch failed:', error);
    return null;
  }
});

function buildCanonical(slug: string, after: string, before: string): string {
  const base = `/blog/category/${slug}/`;
  if (!after && !before) return base;
  const sp = new URLSearchParams();
  if (after) sp.set('after', after);
  if (before) sp.set('before', before);
  return `${base}?${sp.toString()}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const after = sp?.after || '';
  const before = sp?.before || '';

  const data = await getCategoryData(slug, after || null, before || null);
  const name = data?.category?.name || slug;
  const cleanDesc = stripHtml(data?.category?.description);
  const canonical = buildCanonical(slug, after, before);

  return {
    title: name,
    description: cleanDesc || `ksoldiers의 ${name} 카테고리에 속한 모든 군 생활 정보와 가이드를 만나보세요.`,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `${name} | ksoldiers`,
      description: cleanDesc || `${name} 카테고리의 모든 군 생활 정보.`,
      url: canonical,
      locale: 'ko_KR',
      siteName: 'ksoldiers',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ksoldiers`,
      description: cleanDesc || `${name} 카테고리의 모든 군 생활 정보.`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const after = sp?.after || '';
  const before = sp?.before || '';

  const [data, allCategories] = await Promise.all([
    getCategoryData(slug, after || null, before || null),
    getCategories(),
  ]);

  if (!data?.category) {
    notFound();
  }

  const category = data.category;
  const posts: WPPost[] = data.posts?.nodes || [];
  const pageInfo: WPPageInfo | null = data.posts?.pageInfo ?? null;
  const cleanDesc = stripHtml(category.description);

  const prevLink = pageInfo?.hasPreviousPage && pageInfo.startCursor
    ? `/blog/category/${slug}/?before=${pageInfo.startCursor}`
    : null;
  const nextLink = pageInfo?.hasNextPage && pageInfo.endCursor
    ? `/blog/category/${slug}/?after=${pageInfo.endCursor}`
    : null;

  const { items: breadcrumbItems, schema: breadcrumbSchema } = buildBreadcrumb([
    { name: '홈', path: '/' },
    { name: '블로그', path: '/blog/' },
    { name: category.name, path: `/blog/category/${slug}/` },
  ]);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} | ksoldiers`,
    description:
      cleanDesc || `ksoldiers의 ${category.name} 카테고리에 속한 모든 군 생활 정보.`,
    url: `${SITE_URL}/blog/category/${slug}/`,
    inLanguage: 'ko-KR',
    isPartOf: { '@type': 'WebSite', name: 'ksoldiers', url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <main className="m-home">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={collectionSchema} />
      <HomeSidebar categories={allCategories} currentSlug={slug} />

      <div className="m-content m-content-pad">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            {breadcrumbItems.slice(0, -1).map((item, idx) => (
              <li key={idx}>
                <Link href={item.path} className="hover-text-accent">{item.name}</Link>
                <span className="breadcrumb-sep">›</span>
              </li>
            ))}
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>

        <header className="m-category-hero">
          <h1 className="m-category-title">{category.name}</h1>
          {cleanDesc && (
            <p className="m-category-desc">{cleanDesc}</p>
          )}
        </header>

        {posts.length > 0 ? (
          <>
            <div className="m-category-grid">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>

            {(prevLink || nextLink) && (
              <nav aria-label="페이지 네비게이션" className="blog-pagination">
                {prevLink ? (
                  <Link href={prevLink} className="btn btn-outline">
                    &larr; 이전 페이지
                  </Link>
                ) : (
                  <span />
                )}
                {nextLink ? (
                  <Link href={nextLink} className="btn btn-outline">
                    다음 페이지 &rarr;
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="empty-card">
            <p className="empty-card-text">이 카테고리에는 아직 글이 없습니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
