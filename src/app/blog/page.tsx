import {
  fetchGraphQL,
  getCategories,
  POST_CARD_FRAGMENT,
  type WPPost,
  type WPPosts,
  type WPCategory,
  type WPPageInfo,
  type BlogSearchParams,
} from '@/lib/wp';
import Link from 'next/link';
import BlogFilter from './BlogFilter';
import PostCard from '@/components/PostCard';
import { HomeSidebar } from '@/components/home/HomeCategoryNav';
import { Suspense } from 'react';
import type { Metadata } from 'next';

const BLOG_TITLE = 'Blog';
const BLOG_DESCRIPTION = '훈련소 준비물, 군 규정, 휴가·외출 규정까지 입영 예정자와 현역 장병에게 필요한 모든 군 생활 정보를 모았습니다.';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilter = Boolean(params?.search || params?.category);
  const hasPagination = Boolean(params?.after || params?.before);

  let canonical = '/blog/';
  if (hasPagination) {
    const sp = new URLSearchParams();
    if (params?.after) sp.set('after', params.after);
    if (params?.before) sp.set('before', params.before);
    canonical = `/blog/?${sp.toString()}`;
  }

  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: { canonical },
    ...(hasFilter ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      title: `${BLOG_TITLE} | ksoldiers`,
      description: BLOG_DESCRIPTION,
      url: canonical,
      locale: 'ko_KR',
      siteName: 'ksoldiers',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${BLOG_TITLE} | ksoldiers`,
      description: BLOG_DESCRIPTION,
    },
  };
}

type BlogPostsResponse = {
  posts: WPPosts;
};

const POSTS_PER_PAGE = 9;

function buildPageLink(params: BlogSearchParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.category) sp.set('category', params.category);
  if (params.after) sp.set('after', params.after);
  if (params.before) sp.set('before', params.before);
  const qs = sp.toString();
  return qs ? `/blog/?${qs}` : '/blog/';
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const params = await searchParams;
  const search = params?.search || '';
  const category = params?.category || '';
  const after = params?.after || '';
  const before = params?.before || '';

  let posts: WPPost[] = [];
  let categories: WPCategory[] = [];
  let pageInfo: WPPageInfo | null = null;
  let fetchFailed = false;

  const [postsResult, categoriesResult] = await Promise.allSettled([
    fetchGraphQL<BlogPostsResponse>(`
      ${POST_CARD_FRAGMENT}
      query GetAllPosts(
        $search: String,
        $categoryName: String,
        $first: Int,
        $last: Int,
        $after: String,
        $before: String
      ) {
        posts(
          first: $first,
          last: $last,
          after: $after,
          before: $before,
          where: { search: $search, categoryName: $categoryName }
        ) {
          nodes {
            ...PostCardFields
            seo { title metaDesc }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `, {
      search: search || null,
      categoryName: category || null,
      first: before ? null : POSTS_PER_PAGE,
      last: before ? POSTS_PER_PAGE : null,
      after: after || null,
      before: before || null,
    }, { tags: ['posts'] }),
    getCategories(),
  ]);

  if (postsResult.status === 'fulfilled') {
    posts = postsResult.value?.posts?.nodes || [];
    pageInfo = postsResult.value?.posts?.pageInfo ?? null;
  } else {
    console.error('Failed to fetch blog posts:', postsResult.reason);
    fetchFailed = true;
  }

  if (categoriesResult.status === 'fulfilled') {
    categories = categoriesResult.value;
  } else {
    console.error('Failed to fetch blog categories:', categoriesResult.reason);
  }

  const isFiltering = search !== '' || category !== '';

  const prevLink = pageInfo?.hasPreviousPage && pageInfo.startCursor
    ? buildPageLink({ search, category, before: pageInfo.startCursor })
    : null;
  const nextLink = pageInfo?.hasNextPage && pageInfo.endCursor
    ? buildPageLink({ search, category, after: pageInfo.endCursor })
    : null;

  return (
    <main className="m-home">
      <HomeSidebar categories={categories} />

      <div className="m-content m-content-pad">
        <header className="m-category-hero">
          <h1 className="m-category-title">{BLOG_TITLE}</h1>
          <p className="m-category-desc">{BLOG_DESCRIPTION}</p>
        </header>

        <Suspense fallback={<div style={{ height: '60px' }} />}>
          <BlogFilter categories={categories} />
        </Suspense>

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
            <p className="empty-card-text">
              {fetchFailed
                ? '글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
                : isFiltering
                ? '검색 결과가 없습니다.'
                : '아직 작성된 글이 없습니다.'}
            </p>
            {!fetchFailed && isFiltering && (
              <Link href="/blog/" className="btn btn-outline">
                전체 목록으로 돌아가기
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
