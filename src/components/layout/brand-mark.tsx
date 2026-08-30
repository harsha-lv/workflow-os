export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <rect x="1.5" y="3" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.5" y="10" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 6.5h2.2A3.3 3.3 0 0 1 14 9.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
