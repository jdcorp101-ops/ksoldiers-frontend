import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

export type ReviewInput = {
  keyword: string;
  title: string;
  seoTitle: string;
  seoDesc: string;
  contentHtml: string;
};

export type ReviewImprovement = {
  area: 'seo' | 'readability' | 'credibility' | 'tone' | 'structure';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
};

export type ReviewOutput = {
  scoreSEO: number;
  scoreReadability: number;
  scoreCredibility: number;
  scoreOverall: number;
  summary: string;
  topImprovements: ReviewImprovement[];
};

const REVIEW_SYSTEM_PROMPT = `당신은 한국 군 생활 콘텐츠 SEO 전문 리뷰어다. ksoldiers(ksoldiers.com) 블로그 글 초안을 받아 SEO·가독성·신뢰도 관점에서 평가하고 개선점을 제시한다.

[평가 기준]

SEO (0~100점):
- 메인 키워드가 제목·도입부 첫 문장·메타 디스크립션에 원형 그대로 포함됐는가
- H2 헤딩 중 1~2개는 자연 질문형(PAA 흡수)인가
- 메타 디스크립션 길이(120~155자) 적정한가
- 내부 링크 자연스럽게 1~3개 들어갔는가

가독성 (0~100점):
- 단락이 3문장을 넘는지 (넘으면 감점)
- 리스트/표/blockquote 같은 시각 요소가 골고루 들어갔는지
- H2 섹션마다 시각 요소가 최소 1개 있는지
- strong 강조가 핵심 수치·키워드에 사용됐는지

신뢰도 (0~100점):
- 추상적 일반론(보통, 많이, 대부분)이 구체 범위·수치로 치환됐는지
- 가짜 인용·가짜 통계·가짜 인터뷰·임의 부대명·임의 인물명이 있는지 (있으면 큰 감점)
- 한국 군 복무 특유 맥락(훈련소 5주 체계·자대·일과·외박·휴가·면회·PX·보직 분류 등)이 반영됐는지
- 규정 관련 내용에 "2026년 기준" 같은 시점 표기가 있는지 (없으면 감점)
- 광고/과장 표현(최고, 무조건, 강력 추천)이나 자극적·마초적 표현(진짜 남자, 꿀빨기 등)이 있는지 (있으면 감점)

[출력 규칙]
- 반드시 submit_draft_review 도구를 호출해 평가 결과를 제출한다.
- topImprovements는 가장 임팩트 큰 3개만 (우선순위 high → low 순).
- summary는 1~2문장. 전반 평가 요약.
- 점수는 정수.`;

const REVIEW_TOOL: Anthropic.Messages.Tool = {
  name: 'submit_draft_review',
  description: 'ksoldiers 블로그 초안 평가 결과 제출.',
  input_schema: {
    type: 'object',
    properties: {
      scoreSEO: { type: 'integer', description: 'SEO 점수 0~100' },
      scoreReadability: { type: 'integer', description: '가독성 점수 0~100' },
      scoreCredibility: { type: 'integer', description: '신뢰도 점수 0~100' },
      scoreOverall: { type: 'integer', description: '전체 점수 0~100 (가중 평균)' },
      summary: { type: 'string', description: '1~2문장 전반 평가' },
      topImprovements: {
        type: 'array',
        description: '가장 임팩트 큰 개선점 3개.',
        items: {
          type: 'object',
          properties: {
            area: {
              type: 'string',
              enum: ['seo', 'readability', 'credibility', 'tone', 'structure'],
            },
            suggestion: { type: 'string', description: '구체적인 개선 액션 한 문장' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['area', 'suggestion', 'priority'],
        },
      },
    },
    required: ['scoreSEO', 'scoreReadability', 'scoreCredibility', 'scoreOverall', 'summary', 'topImprovements'],
  },
};

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  return new Anthropic({ apiKey });
}

function clampScore(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeReview(raw: unknown): ReviewOutput {
  if (!raw || typeof raw !== 'object') throw new Error('tool_use input이 객체가 아닙니다');
  const obj = raw as Record<string, unknown>;
  const improvements = Array.isArray(obj.topImprovements) ? obj.topImprovements : [];
  return {
    scoreSEO: clampScore(obj.scoreSEO),
    scoreReadability: clampScore(obj.scoreReadability),
    scoreCredibility: clampScore(obj.scoreCredibility),
    scoreOverall: clampScore(obj.scoreOverall),
    summary: typeof obj.summary === 'string' ? obj.summary.trim() : '',
    topImprovements: improvements.slice(0, 5).map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const area = typeof o.area === 'string' ? o.area : 'structure';
      const priority = typeof o.priority === 'string' ? o.priority : 'medium';
      return {
        area: (['seo', 'readability', 'credibility', 'tone', 'structure'].includes(area) ? area : 'structure') as ReviewImprovement['area'],
        suggestion: typeof o.suggestion === 'string' ? o.suggestion.trim() : '',
        priority: (['high', 'medium', 'low'].includes(priority) ? priority : 'medium') as ReviewImprovement['priority'],
      };
    }).filter((it) => it.suggestion),
  };
}

export async function reviewKsoldiersDraft(input: ReviewInput): Promise<ReviewOutput> {
  const client = getClient();
  const userMessage = [
    `메인 키워드: ${input.keyword}`,
    `제목: ${input.title}`,
    `SEO 제목: ${input.seoTitle}`,
    `메타 디스크립션: ${input.seoDesc}`,
    '',
    '본문 HTML:',
    input.contentHtml,
    '',
    '위 초안을 평가하고 submit_draft_review 도구로 결과를 제출하세요.',
  ].join('\n');

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      { type: 'text', text: REVIEW_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    tools: [REVIEW_TOOL],
    tool_choice: { type: 'tool', name: 'submit_draft_review' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolBlock = res.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('AI 응답에 tool_use 블록이 없습니다');
  }
  return normalizeReview(toolBlock.input);
}
