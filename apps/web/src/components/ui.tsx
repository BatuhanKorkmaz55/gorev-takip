"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-accent-600 text-white hover:bg-accent-700 shadow-sm disabled:bg-accent-600/60",
  secondary: "bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 shadow-xs",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs outline-none transition focus:border-accent-500 focus:ring-3 focus:ring-accent-500/15",
        className,
      )}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs outline-none transition focus:border-accent-500 focus:ring-3 focus:ring-accent-500/15",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-lg border border-zinc-200 bg-white pl-3 pr-8 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-accent-500 focus:ring-3 focus:ring-accent-500/15",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-zinc-700">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600">{error}</span> : hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin text-zinc-400", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1 font-sans text-[11px] font-medium text-zinc-500">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-zinc-300">{icon}</div>}
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {children && <div className="max-w-sm text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-zinc-200/80 bg-white shadow-xs", className)}>{children}</div>;
}
