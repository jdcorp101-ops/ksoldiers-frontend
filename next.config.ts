import type { NextConfig } from "next";

// TODO(ksoldiers): WP 이미지 호스트 확정 후 hostname 정확히 지정.
// ksoldiers.com이 cafe24 별칭이면 실제 cafe24 호스트(예: ksoldiers.mycafe24.com)도 추가.
const nextConfig: NextConfig = {
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
};

export default nextConfig;
