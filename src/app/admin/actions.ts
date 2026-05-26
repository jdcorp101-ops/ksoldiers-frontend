'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  verifyAdminPassword,
} from '@/lib/admin-auth';

export type AdminLoginState = {
  status: 'idle' | 'error';
  message: string;
};

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const password = String(formData.get('password') ?? '');

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return {
      status: 'error',
      message: '관리자 인증이 서버에 설정되지 않았습니다.',
    };
  }

  if (!verifyAdminPassword(password)) {
    return {
      status: 'error',
      message: '비밀번호가 올바르지 않습니다.',
    };
  }

  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  redirect('/admin');
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect('/admin');
}
