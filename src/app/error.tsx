'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="section">
      <div className="container-sm error-page">
        <p className="uppercase text-accent error-page-eyebrow">Error</p>
        <h1 className="text-serif error-page-title">문제가 발생했습니다</h1>
        <p className="error-page-message">
          페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button type="button" className="btn" onClick={() => unstable_retry()}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
