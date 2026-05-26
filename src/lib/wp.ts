import { cache } from 'react';
import { stripHtml } from './html';

const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';

export type WPCategory = {
  name: string;
  slug: string;
  count?: number | null;
};

export type WPCategories = {
  nodes: WPCategory[];
};

export type WPImageNode = {
  sourceUrl: string;
  altText: string | null;
};

export type WPFeaturedImage = {
  node: WPImageNode;
} | null;

export type WPSEO = {
  title: string | null;
  metaDesc: string | null;
} | null;

export type WPPost = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  date: string;
  modified?: string | null;
  featuredImage?: WPFeaturedImage;
  categories?: WPCategories;
  seo?: WPSEO;
};

export type WPPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

export type WPPosts = {
  nodes: WPPost[];
  pageInfo?: WPPageInfo;
};

export type BlogSearchParams = {
  search?: string;
  category?: string;
  after?: string;
  before?: string;
};

export type WPFetchOptions = {
  tags?: string[];
  revalidate?: number | false;
};

export const POST_CARD_FRAGMENT = `
  fragment PostCardFields on Post {
    title
    slug
    excerpt
    date
    featuredImage { node { sourceUrl altText } }
    categories { nodes { name slug } }
  }
`;

export async function fetchGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  options: WPFetchOptions = {}
): Promise<T> {
  if (!WP_GRAPHQL_URL) {
    throw new Error('WordPress API 주소가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
  }

  const tags = options.tags ? ['wp', ...options.tags] : ['wp'];
  const revalidate = options.revalidate ?? 3600;

  const res = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // cafe24 호스팅이 빈/기본 fetch UA를 종종 차단해서 명시
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    next: { revalidate, tags },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`GraphQL HTTP ${res.status} ${res.statusText}:`, text.slice(0, 500));
    throw new Error(`GraphQL API ${res.status} 오류`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`JSON 파싱 실패 (status ${res.status})! 서버 응답:`, text.slice(0, 500));
    throw new Error('GraphQL API 응답이 JSON 형식이 아닙니다.');
  }

  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    throw new Error('GraphQL API 호출에 실패했습니다.');
  }

  return json.data as T;
}

export function isPublicCategory(c: { slug: string; count?: number | null }): boolean {
  return c.slug !== 'uncategorized' && (c.count ?? 0) > 0;
}

export const getPostBySlug = cache(async (slug: string): Promise<WPPost | null> => {
  const data = await fetchGraphQL<{ post: WPPost | null }>(`
    ${POST_CARD_FRAGMENT}
    query GetPostBySlug($id: ID!) {
      post(id: $id, idType: SLUG) {
        ...PostCardFields
        content
        modified
        seo { title metaDesc }
      }
    }
  `, { id: slug }, { tags: ['posts', `post:${slug}`] });

  return data?.post ?? null;
});

export type WPSlug = { slug: string };

export async function getAllPostSlugs(): Promise<WPSlug[]> {
  try {
    const data = await fetchGraphQL<{ posts: { nodes: WPSlug[] } }>(
      `query AllPostSlugs { posts(first: 1000) { nodes { slug } } }`,
      {},
      { tags: ['posts'] }
    );
    return data?.posts?.nodes ?? [];
  } catch (error) {
    console.error('getAllPostSlugs failed:', error);
    return [];
  }
}

export async function getCategories(): Promise<WPCategory[]> {
  try {
    const data = await fetchGraphQL<{ categories: { nodes: WPCategory[] } }>(
      `query GetCategories { categories(first: 100) { nodes { name slug count } } }`,
      {},
      { tags: ['categories'] }
    );
    return (data?.categories?.nodes ?? [])
      .filter(isPublicCategory)
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  } catch (error) {
    console.error('getCategories failed:', error);
    return [];
  }
}

export type WPPostSummary = {
  title: string;
  slug: string;
  excerpt: string;
  categorySlug?: string;
};

export async function getRecentPostsForLinking(limit = 30): Promise<WPPostSummary[]> {
  try {
    const data = await fetchGraphQL<{
      posts: {
        nodes: Array<{
          title: string;
          slug: string;
          excerpt?: string | null;
          categories?: { nodes: Array<{ slug: string }> };
        }>;
      };
    }>(
      `query RecentPostsForLinking($first: Int) {
        posts(first: $first) {
          nodes {
            title
            slug
            excerpt
            categories(first: 1) { nodes { slug } }
          }
        }
      }`,
      { first: limit },
      { tags: ['posts', 'link-list'], revalidate: 600 },
    );
    return (data?.posts?.nodes ?? []).map((n) => ({
      title: n.title,
      slug: n.slug,
      excerpt: stripHtml(n.excerpt).slice(0, 140),
      categorySlug: n.categories?.nodes?.[0]?.slug,
    }));
  } catch (error) {
    console.error('getRecentPostsForLinking failed:', error);
    return [];
  }
}

export async function getAllCategorySlugs(): Promise<WPSlug[]> {
  try {
    const data = await fetchGraphQL<{ categories: { nodes: (WPSlug & { count: number | null })[] } }>(
      `query AllCategorySlugs { categories(first: 200) { nodes { slug count } } }`,
      {},
      { tags: ['categories'] }
    );
    return (data?.categories?.nodes ?? [])
      .filter(isPublicCategory)
      .map((c) => ({ slug: c.slug }));
  } catch (error) {
    console.error('getAllCategorySlugs failed:', error);
    return [];
  }
}
