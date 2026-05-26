export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}주 전`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}개월 전`;
  return `${Math.floor(diffDay / 365)}년 전`;
}

export function formatDateKR(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\.\s*$/, '');
}

export function isRecent(iso: string, days = 7): boolean {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const diffDays = (Date.now() - then) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function readingMinutes(html: string, charsPerMin = 500): number {
  const plain = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!plain) return 1;
  return Math.max(1, Math.ceil(plain.length / charsPerMin));
}
