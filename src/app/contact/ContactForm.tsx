'use client';

import { useActionState } from 'react';
import { submitContact, type ContactFormState } from './actions';

const initialState: ContactFormState = {
  status: 'idle',
  message: '',
};

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, initialState);

  return (
    <form action={formAction} className="contact-form" noValidate>
      <div className="form-field">
        <label htmlFor="name" className="form-label">이름</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="홍길동"
          disabled={isPending}
          className="form-input"
        />
        {state.fieldErrors?.name && <span className="form-error-text">{state.fieldErrors.name}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="email" className="form-label">이메일</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="example@email.com"
          disabled={isPending}
          className="form-input"
        />
        {state.fieldErrors?.email && <span className="form-error-text">{state.fieldErrors.email}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="message" className="form-label">메시지</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="문의 내용을 입력해주세요. (10자 이상)"
          disabled={isPending}
          className="form-input form-textarea"
        />
        {state.fieldErrors?.message && <span className="form-error-text">{state.fieldErrors.message}</span>}
      </div>

      {state.status === 'success' && (
        <div role="status" className="form-alert form-alert-success">
          {state.message}
        </div>
      )}

      {state.status === 'error' && !state.fieldErrors && (
        <div role="alert" className="form-alert form-alert-error">
          {state.message}
        </div>
      )}

      <button type="submit" className="btn form-submit" disabled={isPending}>
        {isPending ? '전송 중...' : '메시지 보내기'}
      </button>
    </form>
  );
}
