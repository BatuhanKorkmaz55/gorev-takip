export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-md bg-ink" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="size-5" fill="none">
          <path d="M5 10.5l3.2 3.2L15 6.8" stroke="var(--color-signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-lg font-bold text-ink">Görev Takip</span>
    </span>
  );
}
