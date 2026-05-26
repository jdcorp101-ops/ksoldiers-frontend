export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
