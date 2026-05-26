'use client';

import { useActionState } from 'react';
import { adminLogin, type AdminLoginState } from './actions';

const initialState: AdminLoginState = { status: 'idle', message: '' };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="contact-form" noValidate>
      <div className="form-field">
        <label htmlFor="password" className="form-label">관리자 비밀번호</label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="current-password"
          disabled={isPending}
          className="form-input"
          required
        />
      </div>

      {state.status === 'error' && (
        <div role="alert" className="form-alert form-alert-error">
          {state.message}
        </div>
      )}

      <button type="submit" className="btn form-submit" disabled={isPending}>
        {isPending ? '확인 중...' : '로그인'}
      </button>
    </form>
  );
}
