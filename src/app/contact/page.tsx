import ContactForm from './ContactForm';

export const metadata = {
  title: 'Contact',
  description: '협업 문의나 궁금한 점이 있으신가요? ksoldiers에 언제든 연락주세요.',
  alternates: { canonical: '/contact/' },
};

export default function ContactPage() {
  return (
    <main className="section">
      <div className="container-sm">
        <header className="m-category-hero">
          <h1 className="m-category-title">Contact</h1>
          <p className="m-category-desc">궁금한 점이 있으시거나 협업 문의가 필요하신가요? 언제든 연락주세요.</p>
        </header>

        <div className="contact-card">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
