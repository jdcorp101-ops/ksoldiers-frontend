'use client';

import Link from 'next/link';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="text-serif hover-text-accent header-logo">
          ksoldiers
        </Link>

        <nav className="nav-desktop">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link uppercase">
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="nav-toggle"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsOpen((o) => !o)}
        >
          <span className={`nav-toggle-bar ${isOpen ? 'open-top' : ''}`} />
          <span className={`nav-toggle-bar ${isOpen ? 'open-mid' : ''}`} />
          <span className={`nav-toggle-bar ${isOpen ? 'open-bot' : ''}`} />
        </button>
      </div>

      <nav
        id="mobile-nav"
        className={`nav-mobile ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link-mobile" onClick={close}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
