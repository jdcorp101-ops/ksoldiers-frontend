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
      // 글/카테고리 URL을 옛 WP 구조(/<슬러그>/, /category/<slug>/)로 복원했다.
      // 네이버가 수개월간 색인·평가한 주소가 플랫 구조라, 301 승계에 기대지 않고
      // 색인된 URL 자체를 다시 200으로 살리는 것이 가장 빠른 회복 경로.
      // 네이버 Yeti는 308보다 301을 안정적으로 처리하므로 statusCode: 301 사용.
      //
      // 컷오버기(5/29~6/11)에 수집됐을 수 있는 /blog/category/<slug>/ 회수.
      {
        source: '/blog/category/:slug',
        destination: '/category/:slug/',
        statusCode: 301,
      },
      // 컷오버기에 수집됐을 수 있는 /blog/<슬러그>/ 회수. /blog(목록)는 제외.
      {
        source: '/blog/:slug((?!category$)[^/]+)',
        destination: '/:slug/',
        statusCode: 301,
      },
      // WP /author/<name>/ → /about/ (운영자 1인이라 동일 의미)
      {
        source: '/author/:slug',
        destination: '/about/',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
