'use server';

import { Resend } from 'resend';

export type ContactFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    message?: string;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export async function submitContact(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  const fieldErrors: ContactFormState['fieldErrors'] = {};
  if (!name) fieldErrors.name = '이름을 입력해주세요.';
  else if (name.length > 100) fieldErrors.name = '이름은 100자 이하로 입력해주세요.';
  if (!email) fieldErrors.email = '이메일을 입력해주세요.';
  else if (!EMAIL_REGEX.test(email)) fieldErrors.email = '올바른 이메일 주소를 입력해주세요.';
  if (!message) fieldErrors.message = '메시지를 입력해주세요.';
  else if (message.length < 10) fieldErrors.message = '메시지는 10자 이상 입력해주세요.';
  else if (message.length > 5000) fieldErrors.message = '메시지는 5000자 이하로 입력해주세요.';

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: '입력 내용을 확인해주세요.',
      fieldErrors,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || 'ksoldiers <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.error('[contact] missing RESEND_API_KEY or CONTACT_TO_EMAIL');
    return {
      status: 'error',
      message: '메일 서비스 설정 오류입니다. 잠시 후 다시 시도해주세요.',
    };
  }

  const resend = new Resend(apiKey);

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: email,
      subject: `[ksoldiers 문의] ${name}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#131A23">
          <h2 style="margin:0 0 16px;font-size:18px">ksoldiers 새 문의</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6B7886;width:80px">이름</td><td style="padding:8px 0">${safeName}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7886">이메일</td><td style="padding:8px 0"><a href="mailto:${safeEmail}" style="color:#3B6FA8">${safeEmail}</a></td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#F6F8FB;border-radius:8px;line-height:1.7;font-size:14px;white-space:pre-wrap">${safeMessage}</div>
          <p style="margin-top:24px;font-size:12px;color:#6B7886">이 메일에 회신하면 ${safeEmail}로 직접 답장됩니다.</p>
        </div>
      `,
      text: `ksoldiers 새 문의\n\n이름: ${name}\n이메일: ${email}\n\n${message}\n\n— 회신: ${email}`,
    });

    if (error) {
      console.error('[contact] resend error:', error);
      return {
        status: 'error',
        message: '메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }
  } catch (e) {
    console.error('[contact] send threw:', e);
    return {
      status: 'error',
      message: '메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  return {
    status: 'success',
    message: '메시지가 정상적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.',
  };
}
