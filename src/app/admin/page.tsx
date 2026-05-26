import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifySessionToken } from '@/lib/admin-auth';
import { getCategories } from '@/lib/wp';
import LoginForm from './LoginForm';
import DraftForm from './DraftForm';
import { adminLogout } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authed = verifySessionToken(token);

  return (
    <main className="section">
      <div className="container-sm">
        <header className="m-category-hero">
          <h1 className="m-category-title">Admin</h1>
          <p className="m-category-desc">
            {authed
              ? 'AI 초안 생성 → WP 초안 저장. 발행은 WP wp-admin에서 직접 검수 후 진행.'
              : '내부 직원 전용. 비밀번호를 입력해주세요.'}
          </p>
        </header>

        <div className="contact-card">
          {authed ? (
            <AuthedSection />
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </main>
  );
}

async function AuthedSection() {
  const categories = await getCategories();
  return (
    <>
      <DraftForm categories={categories} />
      <form action={adminLogout} style={{ marginTop: 24, textAlign: 'right' }}>
        <button type="submit" className="btn" style={{ background: 'transparent', border: '1px solid #ccc' }}>
          로그아웃
        </button>
      </form>
    </>
  );
}
