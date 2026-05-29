import { fetchGraphQL } from '@/lib/wp';
import { SITE_URL, SITE_DESCRIPTION } from '@/lib/site';

// 네이버 서치어드바이저에 등록된 RSS(/feed/) 대상. 옛 WordPress가 제공하던 주소를
// 헤드리스 Next에서 그대로 살린다. ASCII 경로라 캐시태그 버그와 무관 → ISR 캐싱 OK.
export const revalidate = 600;

type FeedPost = {
  title: string;
  slug: string;
  date: string;
  modified?: string | null;
  excerpt?: string | null;
  content?: string | null;
  categories?: { nodes: Array<{ name: string }> };
};

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// CDATA 안에 들어갈 HTML에서 `]]>`만 안전하게 분리.
const cdata = (s: string) => `<![CDATA[${(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

const rfc822 = (d: string) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? new Date().toUTCString() : t.toUTCString();
};

export async function GET() {
  let posts: FeedPost[] = [];
  try {
    const data = await fetchGraphQL<{ posts: { nodes: FeedPost[] } }>(
      `query FeedPosts {
        posts(first: 20) {
          nodes {
            title
            slug
            date
            modified
            excerpt
            content
            categories(first: 1) { nodes { name } }
          }
        }
      }`,
      {},
      { tags: ['posts'] }
    );
    posts = data?.posts?.nodes ?? [];
  } catch (error) {
    console.error('RSS feed fetch failed:', error);
  }

  const lastBuild = posts[0]?.modified || posts[0]?.date;
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}/`;
      const cat = p.categories?.nodes?.[0]?.name;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>${cat ? `\n      <category>${escapeXml(cat)}</category>` : ''}
      <description>${cdata(p.excerpt || '')}</description>
      <content:encoded>${cdata(p.content || '')}</content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ksoldiers - 군 생활 가이드</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/feed/" rel="self" type="application/rss+xml" />${lastBuild ? `\n    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>` : ''}
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
