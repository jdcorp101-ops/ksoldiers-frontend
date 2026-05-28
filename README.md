# ksoldiers-frontend

[ksoldiers.com](https://ksoldiers.com) — 입영 예정자·현역 장병 대상 군 생활 정보 SEO 블로그. WordPress(헤드리스) + Next.js 16 + Vercel.

## 아키텍처

```
ksoldiers.com (Vercel)            ← 공개 사이트, Next.js App Router
        ↓ GraphQL/REST
gigun0.mycafe24.com (Cafe24 WP)   ← 백엔드, 글 본문·이미지·관리자
```

- 공개 트래픽은 ksoldiers.com → Vercel만 가고, WP 호스트는 외부 노출 안 됨
- 글은 WP 어드민에서 클래식/구텐베르크로 작성 (엘리멘터는 사용 안 함)
- /admin 페이지에서 AI 초안 생성 → WP REST API로 임시저장도 가능

## 시작

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` 필요한 키는 `.env.example` 참고. 실제값은 Vercel production env 또는 Obsidian의 API_Credentials_Master.md.

## 핵심 파일

| 경로 | 역할 |
|---|---|
| [src/lib/wp.ts](src/lib/wp.ts) | WPGraphQL 클라이언트, `normalizeSlug`, `rewriteAssetHosts`(전환기 픽스) |
| [src/lib/wp-write.ts](src/lib/wp-write.ts) | WP REST 쓰기 (AI 드래프트 → WP 임시저장) |
| [src/lib/ai-draft.ts](src/lib/ai-draft.ts), [src/lib/ai-review.ts](src/lib/ai-review.ts) | Claude 기반 초안 생성·품질 평가 |
| [src/lib/prompts/ksoldiers-seo-draft.ts](src/lib/prompts/ksoldiers-seo-draft.ts) | 시스템 프롬프트 (군 도메인 + SEO 가이드) |
| [next.config.ts](next.config.ts) | `trailingSlash:true`, WP→Next 301 맵, *.vercel.app noindex |
| [src/app/sitemap.ts](src/app/sitemap.ts) | 사이트맵 (정적 4 + 카테고리 + 글) |

## 운영 메모

### URL 정책
- 한글 슬러그 그대로 유지 (예: `/blog/훈련소-준비물/`). 옛 WP 플랫 URL(`/한글/`)·카테고리(`/category/<en>/`)는 1-hop 301로 새 구조에 매핑됨 ([next.config.ts redirects](next.config.ts)).
- 모든 URL은 trailing slash. 컨벤션 변경 시 sitemap·canonical·내부 Link href 다 같이 손봐야 함.

### 배포
```bash
vercel --prod        # 새 배포
vercel env ls        # 현재 환경변수 확인
```

### 이미지 호스트
- 옛 글 본문에 박힌 `https://ksoldiers.com/wp-content/...` 같은 URL은 컷오버 후 깨짐 (ksoldiers.com이 Vercel을 가리키게 됐고 Vercel은 그 파일이 없음 + edge firewall이 `/wp-content/*` 자동 차단).
- 현재 임시 픽스: [wp.ts](src/lib/wp.ts)의 `rewriteAssetHosts`가 GraphQL 응답에서 `ksoldiers.com/wp-` → `gigun0.mycafe24.com/wp-`로 치환.
- **영구 픽스**: WP 어드민에 "Better Search Replace" 플러그인 설치 → DB에서 `https://ksoldiers.com/wp-content/` → `https://gigun0.mycafe24.com/wp-content/` 일괄 치환 → `rewriteAssetHosts` 제거 가능.

### 컷오버 이력
2026-05-29 ksoldiers.com이 Cafe24 WP에서 Vercel + 헤드리스 WP로 전환됨. 절차·트레이드오프는 git log + Obsidian 메모리(`project_ksoldiers`) 참고.
