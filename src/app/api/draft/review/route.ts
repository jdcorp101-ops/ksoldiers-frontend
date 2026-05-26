import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifySessionToken, verifyAdminPassword } from '@/lib/admin-auth';
import { reviewWeddingDraft } from '@/lib/ai-review';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ReviewRequestBody = {
  keyword?: unknown;
  title?: unknown;
  seoTitle?: unknown;
  seoDesc?: unknown;
  contentHtml?: unknown;
};

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) return true;
  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    return verifyAdminPassword(header.slice(7));
  }
  return false;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: ReviewRequestBody = {};
  try {
    body = (await req.json()) as ReviewRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  const keyword = str(body.keyword);
  const title = str(body.title);
  const seoTitle = str(body.seoTitle);
  const seoDesc = str(body.seoDesc);
  const contentHtml = str(body.contentHtml);

  if (!keyword || !title || !contentHtml) {
    return NextResponse.json(
      { ok: false, error: 'keyword, title, contentHtml are required' },
      { status: 400 },
    );
  }

  try {
    const review = await reviewWeddingDraft({ keyword, title, seoTitle, seoDesc, contentHtml });
    return NextResponse.json({ ok: true, review });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[draft/review] AI 평가 실패:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
