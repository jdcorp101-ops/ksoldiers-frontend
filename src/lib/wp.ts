import { cache } from 'react';
import { stripHtml } from './html';

const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';

// 컷오버 직후 임시 픽스: 옛 글 본문 등 WP DB에 박힌 ksoldiers.com 자산 URL을
// 새 WP 백엔드 호스트로 다시 쓴다. ksoldiers.com은 이제 Vercel을 가리키고
// Vercel의 edge firewall이 /wp-content/* 경로를 자동 challenge하기 때문에
// 브라우저가 이 URL로 가면 이미지 대신 HTML 챌린지 페이지를 받는다.
// 영구 픽스는 WP DB 검색-치환(예: Better Search Replace 플러그인). 그 작업이
// 끝나면 이 함수와 호출부 둘 다 제거 가능.
const LEGACY_ASSET_PREFIX = 'https://ksoldiers.com/wp-';
const NEW_ASSET_PREFIX = 'https://gigun0.mycafe24.com/wp-';

function rewriteAssetHosts<T>(value: T): T {
  if (typeof value === 'string') {
    return (
      value.includes(LEGACY_ASSET_PREFIX)
        ? value.split(LEGACY_ASSET_PREFIX).join(NEW_ASSET_PREFIX)
        : value
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteAssetHosts(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = rewriteAssetHosts((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
}

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

  return rewriteAssetHosts(json.data as T);
}

export function isPublicCategory(c: { slug: string; count?: number | null }): boolean {
  return c.slug !== 'uncategorized' && (c.count ?? 0) > 0;
}

// Next.js 16에서 dynamic segment params가 호출 위치(generateMetadata vs page)별로
// percent-encoded인 채로 들어오기도 한다. WPGraphQL은 raw 한글 slug로 매칭하므로
// 항상 decode한 형태로 정규화한다.
export function normalizeSlug(raw: string): string {
  if (typeof raw !== 'string') return raw;
  if (!raw.includes('%')) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export const getPostBySlug = cache(async (rawSlug: string): Promise<WPPost | null> => {
  const slug = normalizeSlug(rawSlug);
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
  `,
    { id: slug },
    // 캐시 태그는 ASCII여야 한다: Vercel Data Cache가 태그를 헤더로 인코딩하는데
    // 한글 등 non-ASCII slug는 ByteString 변환에서 throw → on-demand 렌더 500.
    // percent-encode해서 ASCII로 만든다. 외부에서 이 태그로 revalidate할 땐
    // 동일하게 encodeURIComponent(slug)로 맞출 것.
    { tags: ['posts', `post:${encodeURIComponent(slug)}`] });

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
