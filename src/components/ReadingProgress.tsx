'use client';

import { useEffect, useState } from 'react';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let scheduled = false;

    function compute() {
      scheduled = false;
      const html = document.documentElement;
      const scrollTop = html.scrollTop || document.body.scrollTop;
      const max = html.scrollHeight - html.clientHeight;
      if (max <= 0) {
        setProgress(0);
        return;
      }
      const pct = (scrollTop / max) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      rafId = window.requestAnimationFrame(compute);
    }

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="reading-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
