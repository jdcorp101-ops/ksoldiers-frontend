import type { MetadataRoute } from 'next';
import { fetchGraphQL, isPublicCategory, type WPPosts, type WPCategories } from '@/lib/wp';
import { SITE_URL } from '@/lib/site';

type SitemapData = {
  posts: WPPosts;
  categories: WPCategories;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
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
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.modified || post.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = (data?.categories?.nodes || [])
      .filter(isPublicCategory)
      .map((cat) => ({
        url: `${SITE_URL}/blog/category/${cat.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }));

    return [...staticRoutes, ...categoryRoutes, ...postRoutes];
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return staticRoutes;
  }
}
