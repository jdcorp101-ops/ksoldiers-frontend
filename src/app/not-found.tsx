import Link from 'next/link';

export const metadata = {
  // layout의 title 템플릿(%s | ksoldiers)이 접미사를 붙이므로 여기엔 제목만.
  title: '페이지를 찾을 수 없습니다',
};

export default function NotFound() {
  return (
    <main className="section">
      <div className="container-sm error-page">
        <p className="uppercase text-accent error-page-eyebrow">404</p>
        <h1 className="text-serif error-page-title">페이지를 찾을 수 없습니다</h1>
        <p className="error-page-message">
          요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
        </p>
        <Link href="/" className="btn">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
