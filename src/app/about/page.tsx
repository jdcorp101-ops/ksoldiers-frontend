export const metadata = {
  title: 'About',
  description:
    'ksoldiers는 입영 예정자와 현역 장병을 위한 군 생활 정보 가이드입니다. 훈련소 준비물·휴대폰 규정·월급·자대 배치 등 실제 도움되는 정보를 정리합니다.',
  alternates: { canonical: '/about/' },
};

export default function AboutPage() {
  return (
    <main className="section">
      <div className="container-sm">
        <header className="m-category-hero">
          <h1 className="m-category-title">About</h1>
          <p className="m-category-desc">
            입영부터 전역까지, 한국 군 생활에 필요한 정보를 한곳에 정리합니다.
          </p>
        </header>

        <div className="about-prose">
          <p>
            ksoldiers는 입영을 앞둔 분, 그리고 복무 중인 장병을 위한 군 생활 정보 블로그입니다.
            인터넷 여기저기 흩어진 정보를 모아 카테고리별로 정리해 한 번에 확인할 수 있게 합니다.
          </p>
          <p>
            다루는 주제는 크게 네 가지입니다.{' '}
            <strong>훈련소</strong>(준비물·기간·면회·입소 절차),{' '}
            <strong>군 규정</strong>(휴대폰·외출·휴가·머리·월급),{' '}
            <strong>군 생활 용품</strong>(깔창·반입금지 물품·필수 아이템), 그리고{' '}
            <strong>일반 정보</strong>(자대 배치·보직 종류·TMO 이용 등).
          </p>
          <p>
            글은 모두 직접 정리합니다. 군 관련 공식 자료, 실제 복무 경험, 커뮤니티에서 자주 나오는
            질문을 바탕으로 정확한 정보를 우선하고, 출처가 불명확한 내용은 싣지 않습니다.
            규정이 바뀌면 글도 함께 갱신합니다.
          </p>
          <p>
            궁금한 주제나 보완이 필요한 정보가 있다면 <a href="/contact/">Contact</a> 페이지로
            알려주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
