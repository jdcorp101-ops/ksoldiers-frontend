import Anthropic from '@anthropic-ai/sdk';
import { KSOLDIERS_DRAFT_SYSTEM_PROMPT } from './prompts/ksoldiers-seo-draft';
import type { WPPostSummary } from './wp';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

export type DraftIntent = 'auto' | 'informational' | 'comparative' | 'transactional';

export type DraftInput = {
  keyword: string;
  categoryHint?: string;
  intent?: DraftIntent;
  serpContext?: string;
  existingPosts?: WPPostSummary[];
};

export type ImageSuggestion = {
  position: string;
  altText: string;
  caption: string;
};

export type InternalLink = {
  anchorText: string;
  targetSlug: string;
  reason: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type DraftOutput = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string;
  seoDesc: string;
  suggestedCategorySlug: string;
  imageSuggestions: ImageSuggestion[];
  internalLinks: InternalLink[];
  faqItems: FaqItem[];
};

const DRAFT_TOOL: Anthropic.Messages.Tool = {
  name: 'submit_ksoldiers_draft',
  description: 'ksoldiers 블로그 글 초안을 구조화된 형태로 제출. 모든 필수 필드를 채워서 호출.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '한국어 제목, 30~50자 권장' },
      slug: { type: 'string', description: '한국어 슬러그 (핵심 키워드 + 하이픈, 5~7단어)' },
      excerpt: { type: 'string', description: '1~2문장 요약, 80~140자' },
      contentHtml: { type: 'string', description: '본문 HTML (시맨틱 태그만)' },
      seoTitle: { type: 'string', description: '검색 결과용 제목, 50~60자' },
      seoDesc: { type: 'string', description: '메타 디스크립션, 120~155자 (메인 키워드 원형 포함)' },
      suggestedCategorySlug: { type: 'string', description: '영문 카테고리 슬러그: training-camp / military-rules / military-life-gear / blog 중 하나' },
      imageSuggestions: {
        type: 'array',
        description: '본문에 이미지를 넣으면 좋을 위치·alt 텍스트·캡션 제안 2~3개. 작성자가 워드프레스에서 직접 첨부할 때 참고용.',
        items: {
          type: 'object',
          properties: {
            position: { type: 'string', description: '예: "도입부 직후", "첫 번째 H2 다음", "결론 직전" 같은 본문 내 위치 묘사' },
            altText: { type: 'string', description: 'SEO 친화적 alt 텍스트 (메인 키워드 또는 변형 포함, 60자 이내)' },
            caption: { type: 'string', description: '이미지에 무엇이 담겨야 하는지 한 줄 설명' },
          },
          required: ['position', 'altText', 'caption'],
        },
      },
      internalLinks: {
        type: 'array',
        description: '사용자 메시지에 제공된 [기존 글 목록] 중 본문에 자연스럽게 링크한 글들. 본문 contentHtml에는 이미 <a href="/{슬러그}/">앵커</a> 형태로 삽입돼 있어야 한다. 여기서는 사용한 링크만 보고용으로 다시 나열.',
        items: {
          type: 'object',
          properties: {
            anchorText: { type: 'string', description: '본문에 사용한 앵커 텍스트' },
            targetSlug: { type: 'string', description: '기존 글 목록에서 가져온 슬러그' },
            reason: { type: 'string', description: '왜 이 글을 링크했는지 한 줄 이유' },
          },
          required: ['anchorText', 'targetSlug', 'reason'],
        },
      },
      faqItems: {
        type: 'array',
        description: '본문 내 질문형 H2와 그에 대한 답을 Q&A 쌍으로 추출. 구글 PAA/FAQ 리치 결과 노출 목적의 FAQPage JSON-LD에 사용됨. 본문에 질문형 H2가 1개 이상이면 반드시 채울 것.',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', description: '질문 (자연 질문문, 50자 내외)' },
            answer: { type: 'string', description: '답 (1~3문장, 300자 이내, HTML 태그 없이 순수 텍스트)' },
          },
          required: ['question', 'answer'],
        },
      },
    },
    required: ['title', 'slug', 'excerpt', 'contentHtml', 'seoTitle', 'seoDesc', 'suggestedCategorySlug', 'imageSuggestions', 'internalLinks', 'faqItems'],
  },
};

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  return new Anthropic({ apiKey });
}

const INTENT_LABEL: Record<Exclude<DraftIntent, 'auto'>, string> = {
  informational: '정보형 (informational)',
  comparative: '비교형 (comparative)',
  transactional: '거래/실행형 (transactional)',
};

function buildUserMessage({ keyword, categoryHint, intent, serpContext, existingPosts }: DraftInput): string {
  const lines: string[] = [
    `메인 키워드: ${keyword}`,
  ];
  if (intent && intent !== 'auto') {
    lines.push(`검색 의도: ${INTENT_LABEL[intent]}`);
  }
  if (categoryHint) lines.push(`참고 카테고리: ${categoryHint}`);
  if (serpContext && serpContext.trim()) {
    lines.push('', '상위 SERP 결과 (작성자가 직접 수집):', serpContext.trim());
  }
  if (existingPosts && existingPosts.length > 0) {
    lines.push('', '[기존 글 목록 — 내부 링킹 후보]');
    lines.push('아래 글들 중 이번 본문 주제와 자연스럽게 연결되는 1~3개를 본문에 <a href="/{슬러그}/">앵커</a> 형태로 삽입하라. 억지로 끼우지 말고, 정말 도움될 때만.');
    for (const p of existingPosts) {
      const cat = p.categorySlug ? ` [${p.categorySlug}]` : '';
      const summary = p.excerpt ? ` — ${p.excerpt}` : '';
      lines.push(`- slug: ${p.slug}${cat} | "${p.title}"${summary}`);
    }
  }
  lines.push('', '위 정보를 기반으로 ksoldiers 블로그 초안 1편을 submit_ksoldiers_draft 도구로 제출하세요.');
  return lines.join('\n');
}

function asStringArray(value: unknown, fieldName: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`AI 응답의 ${fieldName} 필드가 배열이 아닙니다`);
  }
  return value;
}

function normalizeImageSuggestions(raw: unknown): ImageSuggestion[] {
  return asStringArray(raw, 'imageSuggestions').map((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      position: typeof o.position === 'string' ? o.position.trim() : `위치 ${i + 1}`,
      altText: typeof o.altText === 'string' ? o.altText.trim() : '',
      caption: typeof o.caption === 'string' ? o.caption.trim() : '',
    };
  }).filter((s) => s.altText && s.caption);
}

function normalizeInternalLinks(raw: unknown): InternalLink[] {
  return asStringArray(raw, 'internalLinks').map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      anchorText: typeof o.anchorText === 'string' ? o.anchorText.trim() : '',
      targetSlug: typeof o.targetSlug === 'string' ? o.targetSlug.trim() : '',
      reason: typeof o.reason === 'string' ? o.reason.trim() : '',
    };
  }).filter((l) => l.anchorText && l.targetSlug);
}

function normalizeFaqItems(raw: unknown): FaqItem[] {
  return asStringArray(raw, 'faqItems').map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      question: typeof o.question === 'string' ? o.question.trim() : '',
      answer: typeof o.answer === 'string' ? o.answer.trim() : '',
    };
  }).filter((f) => f.question && f.answer);
}

function normalizeDraft(raw: unknown): DraftOutput {
  if (!raw || typeof raw !== 'object') throw new Error('tool_use input이 객체가 아닙니다');
  const obj = raw as Record<string, unknown>;
  const required: (keyof Pick<DraftOutput, 'title' | 'slug' | 'excerpt' | 'contentHtml' | 'seoTitle' | 'seoDesc' | 'suggestedCategorySlug'>)[] = [
    'title', 'slug', 'excerpt', 'contentHtml', 'seoTitle', 'seoDesc', 'suggestedCategorySlug',
  ];
  for (const key of required) {
    if (typeof obj[key] !== 'string' || !(obj[key] as string).trim()) {
      throw new Error(`AI 응답에 필수 필드 누락 또는 빈 값: ${key}`);
    }
  }
  return {
    title: (obj.title as string).trim(),
    slug: (obj.slug as string).trim().toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    excerpt: (obj.excerpt as string).trim(),
    contentHtml: (obj.contentHtml as string).trim(),
    seoTitle: (obj.seoTitle as string).trim(),
    seoDesc: (obj.seoDesc as string).trim(),
    suggestedCategorySlug: (obj.suggestedCategorySlug as string).trim(),
    imageSuggestions: normalizeImageSuggestions(obj.imageSuggestions),
    internalLinks: normalizeInternalLinks(obj.internalLinks),
    faqItems: normalizeFaqItems(obj.faqItems),
  };
}

export function buildFaqJsonLd(faqItems: FaqItem[]): string {
  if (!faqItems || faqItems.length === 0) return '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

export function appendFaqSchemaToHtml(contentHtml: string, faqItems: FaqItem[]): string {
  const jsonLd = buildFaqJsonLd(faqItems);
  if (!jsonLd) return contentHtml;
  return `${contentHtml}\n${jsonLd}`;
}

export async function generateKsoldiersPost(input: DraftInput): Promise<DraftOutput> {
  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: KSOLDIERS_DRAFT_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [DRAFT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_ksoldiers_draft' },
    messages: [
      { role: 'user', content: buildUserMessage(input) },
    ],
  });

  const toolBlock = res.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error(`AI 응답에 tool_use 블록이 없습니다 (stop_reason=${res.stop_reason})`);
  }
  if (res.stop_reason === 'max_tokens') {
    throw new Error(`AI 응답이 max_tokens(${MAX_TOKENS})에서 잘렸습니다. 본문이 너무 길거나 max_tokens를 더 올려야 합니다.`);
  }
  return normalizeDraft(toolBlock.input);
}
