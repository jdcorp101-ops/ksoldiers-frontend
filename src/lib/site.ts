export const SITE_URL = 'https://ksoldiers.com';

export const SITE_DESCRIPTION =
  '입영 예정자와 현역 장병을 위한 군 생활 가이드. 훈련소 준비물·휴대폰 규정·월급 정보 등 실질적인 군 정보를 정리합니다.';

// WordPress(ksoldiers.com 직호스팅) → Vercel 헤드리스 컷오버 시점.
// 이때 전 글의 공개 URL(`/한글/` → `/blog/한글/`)과 렌더링(Next SSR)이 바뀌었다.
// 컷오버 직후 한글 슬러그 글이 일시적으로 500을 내던 구간에 네이버 Yeti가 크롤해
// 개별 글이 색인에서 대거 탈락했다(현재는 200으로 정상). 사이트맵 lastmod를 이
// 시점으로 바닥 처리(floor)해, 글의 표현이 컷오버 때 실제로 바뀌었음을 한 번
// 신호로 보내 재수집을 유도한다. 실제 modified가 더 최신이면 그 값을 그대로 쓴다.
export const MIGRATION_DATE = new Date('2026-05-29T00:00:00Z');
