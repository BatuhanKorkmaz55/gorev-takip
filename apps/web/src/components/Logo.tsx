export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent-600 shadow-sm shadow-accent-600/30">
        <svg viewBox="0 0 16 16" className="size-4" fill="none">
          <path d="M3.5 8.4 6.4 11.2 12.5 4.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Görev Takip</span>
    </span>
  );
}
