import type { NextConfig } from "next";

// TODO(ksoldiers): WP 이미지 호스트 확정 후 hostname 정확히 지정.
// ksoldiers.com이 cafe24 별칭이면 실제 cafe24 호스트(예: ksoldiers.mycafe24.com)도 추가.
const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ksoldiers.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
    qualities: [75, 90],
  },
  async headers() {
    return [
      // staging/vercel.app 도메인에서만 noindex — ksoldiers.com 본도메인은 영향 없음.
      // 컷오버 후 ksoldiers.com이 이 배포로 와도 host 매칭 안 되니 그대로 안전.
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(.+\\.)?vercel\\.app' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // WP /category/<en>/ → 새 구조 /blog/category/<en>/
      {
        source: '/category/:slug',
        destination: '/blog/category/:slug/',
        permanent: true,
      },
      // WP /author/<name>/ → /about/ (운영자 1인이라 동일 의미)
      {
        source: '/author/:slug',
        destination: '/about/',
        permanent: true,
      },
      // WP 플랫 글 URL /<한글슬러그>/ → /blog/<한글슬러그>/
      // 알려진 정적 경로·시스템 경로·정적 파일은 제외 (negative lookahead).
      {
        source: '/:slug((?!about|blog|contact|category|author|admin|api|_next|favicon|robots|sitemap)[^/]+)',
        destination: '/blog/:slug/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
