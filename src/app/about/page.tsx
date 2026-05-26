// TODO(ksoldiers): About 페이지 본문을 ksoldiers의 정체성(군 정보 큐레이션 블로그)에 맞게 새로 작성.
//   - description, m-category-desc, about-prose 본문 단락을 ksoldiers 톤으로 교체.
//   - 운영자(jdcorp101-ops)·콘텐츠 방향성·타깃 독자(입영 예정자/현역) 명시 검토.
export const metadata = {
  title: 'About',
  description: 'ksoldiers는 입영부터 전역까지 필요한 군 생활 정보를 정리하는 블로그입니다.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main className="section">
      <div className="container-sm">
        <header className="m-category-hero">
          <h1 className="m-category-title">About</h1>
          <p className="m-category-desc">입영부터 전역까지, 군 생활의 모든 정보를 정리합니다.</p>
        </header>

        <div className="about-prose">
          <p>안녕하세요, ksoldiers에 오신 것을 환영합니다.</p>
          <p>
            {/* TODO: ksoldiers 운영 동기·블로그 정체성 본문 작성 */}
            입영을 앞두거나 군 복무 중인 분들이 가장 궁금해하는 정보를 알기 쉽게 정리하여 공유합니다.
          </p>
          <p>
            훈련소 준비물, 휴대폰 규정, 휴가·외출 규정, 월급 정보까지 — 실제 군 생활에 바로 도움이 되는 가이드를 제공합니다.
          </p>
        </div>
      </div>
    </main>
  );
}
