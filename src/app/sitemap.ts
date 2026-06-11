import type { MetadataRoute } from 'next';
import { fetchGraphQL, isPublicCategory, type WPPosts, type WPCategories } from '@/lib/wp';
import { SITE_URL } from '@/lib/site';

type SitemapData = {
  posts: WPPosts;
  categories: WPCategories;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // lastmod는 실제 변경 시점만 적는다. 매 빌드 now()로 갱신하면 검색엔진이
  // lastmod 신호 자체를 불신하게 됨. 홈/블로그 목록은 최신 글 날짜를 쓰고,
  // about/contact·카테고리는 생략(없으면 검색엔진이 자체 판단).
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog/`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about/`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact/`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const data = await fetchGraphQL<SitemapData>(
      `
      query SitemapData {
        posts(first: 1000) {
          nodes {
            slug
            date
            modified
          }
        }
        categories {
          nodes {
            slug
            count
          }
        }
      }
    `,
      {},
      { tags: ['posts', 'categories'] }
    );

    const postRoutes: MetadataRoute.Sitemap = (data?.posts?.nodes || []).map((post) => ({
      url: `${SITE_URL}/${post.slug}/`,
      lastModified: new Date(post.modified || post.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const latestPostDate = postRoutes.reduce<Date | undefined>((latest, route) => {
      const d = route.lastModified as Date;
      return !latest || d > latest ? d : latest;
    }, undefined);
    if (latestPostDate) {
      staticRoutes[0].lastModified = latestPostDate;
      staticRoutes[1].lastModified = latestPostDate;
    }

    const categoryRoutes: MetadataRoute.Sitemap = (data?.categories?.nodes || [])
      .filter(isPublicCategory)
      .map((cat) => ({
        url: `${SITE_URL}/category/${cat.slug}/`,
        changeFrequency: 'weekly',
        priority: 0.6,
      }));

    return [...staticRoutes, ...categoryRoutes, ...postRoutes];
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return staticRoutes;
  }
}
