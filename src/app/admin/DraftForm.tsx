'use client';

import { useState, useTransition } from 'react';
import type { WPCategory } from '@/lib/wp';

type ImageSuggestion = { position: string; altText: string; caption: string };
type InternalLink = { anchorText: string; targetSlug: string; reason: string };
type FaqItem = { question: string; answer: string };

type DraftPreview = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string;
  seoDesc: string;
  suggestedCategorySlug: string;
  imageSuggestions?: ImageSuggestion[];
  internalLinks?: InternalLink[];
  faqItems?: FaqItem[];
};

type DraftResponse =
  | {
      ok: true;
      postId: number;
      editUrl: string;
      previewUrl: string;
      categoryAttached: number | null;
      preview: DraftPreview;
    }
  | { ok: false; stage?: 'ai' | 'wp'; error: string };

type ReviewImprovement = {
  area: 'seo' | 'readability' | 'credibility' | 'tone' | 'structure';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
};

type ReviewResult = {
  scoreSEO: number;
  scoreReadability: number;
  scoreCredibility: number;
  scoreOverall: number;
  summary: string;
  topImprovements: ReviewImprovement[];
};

type ReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ReviewResult }
  | { status: 'error'; error: string };

type IntentValue = 'auto' | 'informational' | 'comparative' | 'transactional';

const INTENT_OPTIONS: { value: IntentValue; label: string }[] = [
  { value: 'auto', label: '자동 추정 (AI가 키워드 보고 판단)' },
  { value: 'informational', label: '정보형 — 정의·How-to 위주 (1200~1800자)' },
  { value: 'comparative', label: '비교형 — 장단점·비교표 위주 (1500~2200자)' },
  { value: 'transactional', label: '거래/실행형 — 체크리스트·가격대·일정 (1500~2500자)' },
];

const SERP_MAX_LEN = 3000;

function ScoreBlock({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#3F8E3F' : value >= 60 ? '#D6840F' : '#C04848';
  return (
    <div style={{ minWidth: 70 }}>
      <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function DraftForm({ categories }: { categories: WPCategory[] }) {
  const [keyword, setKeyword] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [intent, setIntent] = useState<IntentValue>('auto');
  const [serpContext, setSerpContext] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [review, setReview] = useState<ReviewState>({ status: 'idle' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setResult(null);
    setReview({ status: 'idle' });
    startTransition(async () => {
      try {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: keyword.trim(),
            categorySlug: categorySlug || undefined,
            intent,
            serpContext: serpContext.trim() || undefined,
          }),
        });
        const data = (await res.json()) as DraftResponse;
        setResult(data);
        if (data.ok) {
          window.open(data.editUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (e) {
        setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    });
  };

  const runReview = async (preview: DraftPreview) => {
    setReview({ status: 'loading' });
    try {
      const res = await fetch('/api/draft/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          title: preview.title,
          seoTitle: preview.seoTitle,
          seoDesc: preview.seoDesc,
          contentHtml: preview.contentHtml,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReview({ status: 'success', data: data.review as ReviewResult });
      } else {
        setReview({ status: 'error', error: data.error || '평가 실패' });
      }
    } catch (e) {
      setReview({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="contact-form">
      <form onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="keyword" className="form-label">메인 키워드 / 주제</label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 훈련소 준비물, 군인 월급 인상 2026"
            disabled={isPending}
            maxLength={100}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="intent" className="form-label">검색 의도</label>
          <select
            id="intent"
            value={intent}
            onChange={(e) => setIntent(e.target.value as IntentValue)}
            disabled={isPending}
            className="form-input"
          >
            {INTENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="serp" className="form-label">
            상위 SERP 결과 (선택, {SERP_MAX_LEN}자 이내)
          </label>
          <textarea
            id="serp"
            value={serpContext}
            onChange={(e) => setSerpContext(e.target.value.slice(0, SERP_MAX_LEN))}
            disabled={isPending}
            placeholder={`구글/네이버에서 키워드 검색 후 상위 3~5개 글의 제목+짧은 설명을 그대로 붙여넣기.\n비워두면 SERP 분석 없이 작성됩니다.\n\n예:\n1) 훈련소 준비물 완벽 가이드 — 필수품·반입금지 정리...\n2) 입영 전 챙겨야 할 10가지 — 2026년 기준...\n3) ...`}
            rows={6}
            maxLength={SERP_MAX_LEN}
            className="form-input"
            style={{ fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            {serpContext.length} / {SERP_MAX_LEN}자
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="category" className="form-label">카테고리 (선택)</label>
          <select
            id="category"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            disabled={isPending}
            className="form-input"
          >
            <option value="">— AI가 추천한 카테고리 사용 —</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn form-submit" disabled={isPending || !keyword.trim()}>
          {isPending ? '초안 생성 중… (10~30초)' : '초안 생성 → WP 초안 저장'}
        </button>
      </form>

      {result && result.ok && (
        <div role="status" className="form-alert form-alert-success" style={{ marginTop: 24 }}>
          <strong>✓ 초안 #{result.postId} 저장 완료</strong>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <div><b>제목</b>: {result.preview.title}</div>
            <div><b>슬러그</b>: {result.preview.slug}</div>
            <div><b>요약</b>: {result.preview.excerpt}</div>
            <div><b>SEO 제목</b>: {result.preview.seoTitle}</div>
            <div><b>SEO 설명</b>: {result.preview.seoDesc}</div>
            <div>
              <b>카테고리</b>:{' '}
              {result.categoryAttached
                ? `연결됨 (ID ${result.categoryAttached})`
                : `미연결 — AI 추천 슬러그 "${result.preview.suggestedCategorySlug}"가 WP에 없음. WP 에디터에서 직접 지정.`}
            </div>
            {result.preview.imageSuggestions && result.preview.imageSuggestions.length > 0 && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  이미지 제안 ({result.preview.imageSuggestions.length}개)
                </summary>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {result.preview.imageSuggestions.map((img, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <div><b>위치</b>: {img.position}</div>
                      <div><b>alt</b>: {img.altText}</div>
                      <div><b>내용</b>: {img.caption}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {result.preview.internalLinks && result.preview.internalLinks.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  내부 링크 ({result.preview.internalLinks.length}개) — 본문에 자동 삽입됨
                </summary>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {result.preview.internalLinks.map((lnk, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <a href={`/blog/${lnk.targetSlug}/`} target="_blank" rel="noopener noreferrer">
                        {lnk.anchorText}
                      </a>{' '}
                      <span style={{ color: '#888' }}>— /{lnk.targetSlug}</span>
                      <div style={{ fontSize: 12, color: '#666' }}>{lnk.reason}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {result.preview.faqItems && result.preview.faqItems.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  FAQ schema ({result.preview.faqItems.length}개) — JSON-LD로 본문에 인라인 삽입됨
                </summary>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {result.preview.faqItems.map((f, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      <div><b>Q.</b> {f.question}</div>
                      <div><b>A.</b> {f.answer}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={result.editUrl} target="_blank" rel="noopener noreferrer" className="btn">
                WP 에디터 열기
              </a>
              <button
                type="button"
                className="btn"
                style={{ background: 'transparent', border: '1px solid #ccc' }}
                onClick={() => runReview(result.preview)}
                disabled={review.status === 'loading'}
              >
                {review.status === 'loading' ? '품질 검토 중…' : '품질 검토하기'}
              </button>
            </div>

            {review.status === 'success' && (
              <div style={{ marginTop: 16, padding: 12, background: '#F6F8FB', borderRadius: 6, border: '1px solid #DCE2EA' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                  <ScoreBlock label="전체" value={review.data.scoreOverall} />
                  <ScoreBlock label="SEO" value={review.data.scoreSEO} />
                  <ScoreBlock label="가독성" value={review.data.scoreReadability} />
                  <ScoreBlock label="신뢰도" value={review.data.scoreCredibility} />
                </div>
                <div style={{ fontSize: 14, marginBottom: 12 }}>{review.data.summary}</div>
                {review.data.topImprovements.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>개선 제안</div>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {review.data.topImprovements.map((it, i) => (
                        <li key={i} style={{ marginBottom: 6, fontSize: 14 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            fontSize: 11,
                            borderRadius: 4,
                            background: it.priority === 'high' ? '#FFE0E0' : it.priority === 'medium' ? '#FFF4E5' : '#F0F4F8',
                            marginRight: 6,
                          }}>
                            {it.priority} · {it.area}
                          </span>
                          {it.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {review.status === 'error' && (
              <div style={{ marginTop: 12, fontSize: 14, color: '#c00' }}>
                품질 검토 실패: {review.error}
              </div>
            )}
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div role="alert" className="form-alert form-alert-error" style={{ marginTop: 24 }}>
          <strong>✗ 실패 {result.stage ? `(${result.stage} 단계)` : ''}</strong>
          <div style={{ marginTop: 8, fontSize: 14 }}>{result.error}</div>
        </div>
      )}
    </div>
  );
}
