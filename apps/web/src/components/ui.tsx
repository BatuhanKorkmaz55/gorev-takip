"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:bg-ink/85",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-paper",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-danger text-on-danger hover:bg-danger/90",
  link: "text-accent hover:text-accent-strong hover:underline underline-offset-2 px-0!",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[15px] gap-1.5",
  md: "h-11 px-4 text-base gap-2",
  lg: "h-14 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Tüm butonlar en az 44px (md); metin fiille başlar: "Görevi ekle", "Notu kaydet". */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

/** Yalnızca simgeli buton: yalnızca kapat ve "diğer" gibi evrensel işlemler için. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink transition-colors hover:bg-sunken",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

const fieldBase =
  "w-full rounded-md border border-line-strong bg-surface text-base text-ink placeholder:text-ink-muted transition-shadow outline-none focus:border-accent focus:ring-3 focus:ring-accent/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-11 px-3.5", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "px-3.5 py-3 leading-6", className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-11 w-auto cursor-pointer pl-3 pr-9 text-[15px]", className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[15px] font-semibold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Spinner({ className, label = "Yükleniyor" }: { className?: string; label?: string }) {
  return <LoaderCircle className={cn("size-6 animate-spin text-ink-muted", className)} aria-label={label} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-line-strong bg-surface px-1.5 font-sans text-sm font-semibold text-ink">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-ink-muted" aria-hidden="true">{icon}</div>}
      <p className="text-lg font-bold text-ink">{title}</p>
      {children && <div className="max-w-md text-base text-ink-muted">{children}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface shadow-card", className)} {...rest}>
      {children}
    </section>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-base text-danger">
      {children}
    </p>
  );
}
