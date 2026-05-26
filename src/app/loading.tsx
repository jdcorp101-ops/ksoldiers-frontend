export default function Loading() {
  return (
    <main className="section">
      <div className="container-sm text-center">
        <div aria-label="로딩 중" className="loading-spinner" />
        <p className="loading-label">Loading...</p>
      </div>
    </main>
  );
}
