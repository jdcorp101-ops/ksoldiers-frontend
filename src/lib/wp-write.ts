// WordPress REST API write client (전용). 읽기는 src/lib/wp.ts의 GraphQL 사용.

type CreateDraftInput = {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  categorySlug?: string;
  seoTitle?: string;
  seoDesc?: string;
};

type CreateDraftResult = {
  postId: number;
  editUrl: string;
  previewUrl: string;
  categoryAttached: number | null;
};

function getConfig() {
  const base = process.env.WP_REST_URL;
  const user = process.env.WP_REST_USERNAME;
  const pass = process.env.WP_REST_APP_PASSWORD;
  if (!base) throw new Error('WP_REST_URL is not configured');
  if (!user || !pass) throw new Error('WP_REST_USERNAME / WP_REST_APP_PASSWORD is not configured');
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  return { base: base.replace(/\/$/, ''), auth };
}

async function wpFetch(path: string, init: RequestInit, base: string, auth: string) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const msg = (json as { message?: string } | null)?.message || text.slice(0, 200);
    throw new Error(`WP ${res.status} ${res.statusText}: ${msg}`);
  }
  return json;
}

async function findCategoryIdBySlug(slug: string, base: string, auth: string): Promise<number | null> {
  if (!slug) return null;
  const data = await wpFetch(
    `/categories?slug=${encodeURIComponent(slug)}`,
    { method: 'GET' },
    base,
    auth,
  ) as Array<{ id: number; slug: string }> | null;
  if (!data || data.length === 0) return null;
  return data[0].id;
}

function deriveEditUrl(base: string, postId: number): string {
  // base: https://ksoldiers.com/wp-json/wp/v2
  // → host: https://ksoldiers.com
  const m = base.match(/^(https?:\/\/[^/]+)/);
  const host = m ? m[1] : '';
  return `${host}/wp-admin/post.php?post=${postId}&action=edit`;
}

export async function createDraftPost(input: CreateDraftInput): Promise<CreateDraftResult> {
  const { base, auth } = getConfig();

  let categoryAttached: number | null = null;
  if (input.categorySlug) {
    categoryAttached = await findCategoryIdBySlug(input.categorySlug, base, auth);
  }

  const body: Record<string, unknown> = {
    title: input.title,
    content: input.content,
    status: 'draft',
  };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.slug) body.slug = input.slug;
  if (categoryAttached) body.categories = [categoryAttached];

  // Yoast SEO 메타 — REST에 노출되어 있을 때만 저장됨.
  // 노출 안 돼 있으면 WP는 meta 키를 조용히 무시하므로 본문 저장은 항상 성공.
  if (input.seoTitle || input.seoDesc) {
    body.meta = {
      ...(input.seoTitle ? { _yoast_wpseo_title: input.seoTitle } : {}),
      ...(input.seoDesc ? { _yoast_wpseo_metadesc: input.seoDesc } : {}),
    };
  }

  const created = await wpFetch(
    '/posts',
    { method: 'POST', body: JSON.stringify(body) },
    base,
    auth,
  ) as { id: number; link: string } | null;

  if (!created?.id) throw new Error('WP 응답에 post ID가 없습니다');

  return {
    postId: created.id,
    editUrl: deriveEditUrl(base, created.id),
    previewUrl: created.link,
    categoryAttached,
  };
}
