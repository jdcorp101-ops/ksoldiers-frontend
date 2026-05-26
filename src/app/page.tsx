import type { Metadata } from 'next';
import { fetchGraphQL, getCategories, POST_CARD_FRAGMENT, type WPPost, type WPCategory } from '@/lib/wp';
import HomeSection from '@/components/home/HomeSection';
import { HomeSidebar, HomeTabs } from '@/components/home/HomeCategoryNav';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

type HomePostsData = {
  posts: { nodes: WPPost[] };
};

const POSTS_PER_SECTION = 5;

export default async function Home() {
  let posts: WPPost[] = [];
  let categories: WPCategory[] = [];
  let fetchFailed = false;

  const [postsResult, categoriesResult] = await Promise.allSettled([
    fetchGraphQL<HomePostsData>(
      `
      ${POST_CARD_FRAGMENT}
      query HomePosts {
        posts(first: 50) {
          nodes { ...PostCardFields }
        }
      }
    `,
      {},
      { tags: ['posts'] }
    ),
    getCategories(),
  ]);

  if (postsResult.status === 'fulfilled') {
    posts = postsResult.value?.posts?.nodes || [];
  } else {
    console.error('Failed to fetch home posts:', postsResult.reason);
    fetchFailed = true;
  }

  if (categoriesResult.status === 'fulfilled') {
    categories = categoriesResult.value;
  } else {
    console.error('Failed to fetch home categories:', categoriesResult.reason);
  }

  const topCategories = categories.slice(0, 3);

  const postsByCategory = new Map<string, WPPost[]>();
  for (const post of posts) {
    const slug = post.categories?.nodes?.[0]?.slug;
    if (!slug) continue;
    const bucket = postsByCategory.get(slug) ?? [];
    if (bucket.length < POSTS_PER_SECTION) {
      bucket.push(post);
      postsByCategory.set(slug, bucket);
    }
  }

  const hasAnyContent = topCategories.some(
    (c) => (postsByCategory.get(c.slug) ?? []).length > 0
  );

  return (
    <main className="m-home">
      <h1 className="sr-only">ksoldiers — 입영 준비, 훈련소 정보, 군 생활 가이드</h1>

      <HomeSidebar categories={categories} />

      <div className="m-content">
        <HomeTabs categories={categories} />

        {fetchFailed && (
          <div className="m-empty">글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>
        )}

        {!fetchFailed && !hasAnyContent && (
          <div className="m-empty">아직 작성된 글이 없습니다.</div>
        )}

        <HomeSection
          title="최신 글"
          moreHref="/blog"
          posts={posts.slice(0, POSTS_PER_SECTION)}
        />

        {topCategories.map((cat) => (
          <HomeSection
            key={cat.slug}
            title={cat.name}
            moreHref={`/blog/category/${cat.slug}`}
            posts={postsByCategory.get(cat.slug) ?? []}
          />
        ))}
      </div>
    </main>
  );
}
