export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Next 이미지 최적화기 w 파라미터 허용값(images.deviceSizes ∪ imageSizes 기본값).
const NEXT_IMAGE_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
// remotePatterns에 등록돼 최적화기로 통과시킬 수 있는 WP 백엔드 호스트.
// (본문 내 ksoldiers.com/wp- 자산은 rewriteAssetHosts가 이미 이 호스트로 치환함)
const OPTIMIZABLE_IMG_HOST = 'gigun0.mycafe24.com';

function pickImageWidth(attrWidth: number | null): number {
  // 원본 폭 이상인 가장 작은 허용 사이즈(업스케일 방지). 없으면 본문 컬럼 기준 1080.
  if (!attrWidth) return 1080;
  return NEXT_IMAGE_WIDTHS.find((w) => w >= attrWidth) ?? 1200;
}

// 본문(dangerouslySetInnerHTML) 안의 <img>를 Next 이미지 최적화기로 라우팅한다.
// cafe24 원본을 한 번만 받아 Vercel CDN이 WebP/리사이즈해 캐싱 → cafe24 대역폭↓, LCP↑.
// width/height/alt/loading 등 기존 속성은 그대로 둔다(CLS 이미 방지됨).
export function optimizeContentImages(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch || srcMatch[1].startsWith('/_next/image')) return tag;
    const src = srcMatch[1];
    let host: string;
    try {
      host = new URL(src).host;
    } catch {
      return tag;
    }
    if (host !== OPTIMIZABLE_IMG_HOST) return tag;
    const widthMatch = tag.match(/\swidth=["']?(\d+)/i);
    const w = pickImageWidth(widthMatch ? parseInt(widthMatch[1], 10) : null);
    const optimized = `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
    return tag.replace(srcMatch[0], ` src="${optimized}"`);
  });
}

// 컷오버기(5/29~6/11)에 작성된 글 본문엔 내부링크가 /blog/<슬러그>/ 형식으로 남아 있다.
// URL이 플랫 구조로 복원됐으므로 렌더 시점에 플랫으로 치환해 크롤러가 301 없이
// 한 번에 따라가게 한다. /blog/(목록 자체)와 /blog/category/는 건드리지 않는다.
export function rewriteLegacyBlogLinks(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/href=(["'])\/blog\/(?!category\/)([^"']+)\1/gi, 'href=$1/$2$1');
}

// 문장부호·공백 경계에서 자르고, 잘렸으면 ellipsis. 메타 description 등 SEO 노출용.
export function truncateAtBoundary(text: string, max: number): string {
  if (!text || text.length <= max) return text ?? '';
  const slice = text.slice(0, max);
  const lastBoundary = Math.max(
    slice.lastIndexOf(' '),
    slice.lastIndexOf('。'),
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf(','),
  );
  const cut = lastBoundary > max * 0.6 ? slice.slice(0, lastBoundary) : slice;
  return `${cut.trimEnd()}…`;
}
