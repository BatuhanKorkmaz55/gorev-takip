import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#eef2ff,_#fafafa_60%)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-900/5">
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
