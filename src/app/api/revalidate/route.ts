import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RevalidateBody = {
  tag?: string;
  tags?: string[];
};

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'REVALIDATE_SECRET not configured' }, { status: 500 });
  }

  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.nextUrl.searchParams.get('secret');
  if (token !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: RevalidateBody = {};
  try {
    body = (await req.json()) as RevalidateBody;
  } catch {
    // body is optional; fall back to query params
  }

  const queryTag = req.nextUrl.searchParams.get('tag');
  const tags = [
    ...(body.tags ?? []),
    ...(body.tag ? [body.tag] : []),
    ...(queryTag ? [queryTag] : []),
  ].filter(Boolean);

  if (tags.length === 0) {
    return NextResponse.json({ ok: false, error: 'no tag(s) provided' }, { status: 400 });
  }

  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }

  return NextResponse.json({ ok: true, revalidated: tags, now: Date.now() });
}
