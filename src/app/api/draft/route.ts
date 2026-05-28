import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifySessionToken, verifyAdminPassword } from '@/lib/admin-auth';
import { generateKsoldiersPost, appendFaqSchemaToHtml, type DraftIntent } from '@/lib/ai-draft';
import { createDraftPost } from '@/lib/wp-write';
import { getRecentPostsForLinking } from '@/lib/wp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_INTENTS: DraftIntent[] = ['auto', 'informational', 'comparative', 'transactional'];
const SERP_MAX_LEN = 3000;

type DraftRequestBody = {
  keyword?: unknown;
  categorySlug?: unknown;
  intent?: unknown;
  serpContext?: unknown;
};

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // 1) 세션 쿠키
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) return true;

  // 2) CLI 백업: Authorization: Bearer <ADMIN_PASSWORD>
  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    return verifyAdminPassword(header.slice(7));
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: DraftRequestBody = {};
  try {
    body = (await req.json()) as DraftRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const categorySlug = typeof body.categorySlug === 'string' ? body.categorySlug.trim() : undefined;
  if (!keyword) {
    return NextResponse.json({ ok: false, error: 'keyword is required' }, { status: 400 });
  }
  if (keyword.length > 100) {
    return NextResponse.json({ ok: false, error: 'keyword too long' }, { status: 400 });
  }

  const intent: DraftIntent =
    typeof body.intent === 'string' && (ALLOWED_INTENTS as string[]).includes(body.intent)
      ? (body.intent as DraftIntent)
      : 'auto';

  let serpContext: string | undefined;
  if (typeof body.serpContext === 'string') {
    const trimmed = body.serpContext.trim();
    if (trimmed.length > SERP_MAX_LEN) {
      return NextResponse.json(
        { ok: false, error: `serpContext too long (max ${SERP_MAX_LEN} chars)` },
        { status: 400 },
      );
    }
    if (trimmed) serpContext = trimmed;
  }

  // 내부 링킹 후보 — 실패해도 본 작업은 계속 진행
  const existingPosts = await getRecentPostsForLinking(30).catch(() => []);

  let draft;
  try {
    draft = await generateKsoldiersPost({
      keyword,
      categoryHint: categorySlug,
      intent,
      serpContext,
      existingPosts,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[draft] AI 생성 실패:', message);
    return NextResponse.json({ ok: false, stage: 'ai', error: message }, { status: 502 });
  }

  // 본문 contentHtml에 FAQPage JSON-LD 추가 (크롤러 PAA·리치 결과용)
  const finalContentHtml = appendFaqSchemaToHtml(draft.contentHtml, draft.faqItems);

  let wp;
  try {
    wp = await createDraftPost({
      title: draft.title,
      content: finalContentHtml,
      excerpt: draft.excerpt,
      slug: draft.slug,
      categorySlug: categorySlug || draft.suggestedCategorySlug,
      seoTitle: draft.seoTitle,
      seoDesc: draft.seoDesc,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[draft] WP 저장 실패:', message);
    return NextResponse.json({
      ok: false,
      stage: 'wp',
      error: message,
      // AI 결과는 유실하지 않게 같이 돌려줌 (수동 복구용)
      draftPreview: { ...draft, contentHtml: finalContentHtml },
    }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    postId: wp.postId,
    editUrl: wp.editUrl,
    previewUrl: wp.previewUrl,
    categoryAttached: wp.categoryAttached,
    preview: {
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      contentHtml: draft.contentHtml,
      seoTitle: draft.seoTitle,
      seoDesc: draft.seoDesc,
      suggestedCategorySlug: draft.suggestedCategorySlug,
      imageSuggestions: draft.imageSuggestions,
      internalLinks: draft.internalLinks,
      faqItems: draft.faqItems,
    },
  });
}
