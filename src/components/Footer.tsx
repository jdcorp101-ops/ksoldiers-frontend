export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container text-center">
        <h3 className="text-serif site-footer-logo">ksoldiers</h3>
        <p className="site-footer-tagline">
          입영부터 전역까지, 가장 실용적인 군 생활 정보 가이드.
        </p>
        <div className="site-footer-copy">
          &copy; {new Date().getFullYear()} ksoldiers. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
