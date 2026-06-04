import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // 컷오버 전: WP 백엔드가 ksoldiers.com에서 이미지 서빙
      {
        protocol: 'https',
        hostname: 'ksoldiers.com',
        pathname: '/**',
      },
      // 컷오버 후: WP 백엔드 새 호스트 (Cafe24 기본 서브도메인)
      {
        protocol: 'https',
        hostname: 'gigun0.mycafe24.com',
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
      // 네이버 Yeti는 308보다 301을 안정적으로 처리하므로 statusCode: 301 사용.
      {
        source: '/category/:slug',
        destination: '/blog/category/:slug/',
        statusCode: 301,
      },
      // WP /author/<name>/ → /about/ (운영자 1인이라 동일 의미)
      {
        source: '/author/:slug',
        destination: '/about/',
        statusCode: 301,
      },
      // WP 플랫 글 URL /<한글슬러그>/ → /blog/<한글슬러그>/
      // 알려진 정적 경로·시스템 경로·정적 파일은 제외 (negative lookahead).
      // naver = 네이버 사이트 소유확인 파일(/naver….html)을 public에서 그대로
      // 서빙해야 하므로 리다이렉트 대상에서 제외.
      {
        source: '/:slug((?!about|blog|contact|category|author|admin|api|_next|favicon|icon|apple-icon|opengraph-image|twitter-image|manifest|robots|sitemap|feed|naver)[^/]+)',
        destination: '/blog/:slug/',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
