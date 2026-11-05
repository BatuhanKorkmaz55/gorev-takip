"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_META } from "@gorev/shared";
import { House, Inbox, KeyRound, LayoutGrid, List, LogOut, Plus, Send, Users } from "lucide-react";
import { useDashboard, useMe } from "@/lib/queries";
import { api } from "@/lib/api";
import { SessionCtx } from "@/hooks/useSession";
import { useHotkey } from "@/hooks/useHotkey";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { Modal } from "./Modal";
import { MenuItem, Popover } from "./Popover";
import { QuickAdd } from "./QuickAdd";
import { TaskDrawer } from "./TaskDrawer";
import { PasswordModal } from "./PasswordModal";
import { Button, Kbd, Spinner } from "./ui";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, isLoading, isError } = useMe();

  useEffect(() => {
    const onUnauthorized = () => {
      qc.clear();
      router.replace("/giris");
    };
    window.addEventListener("gt:unauthorized", onUnauthorized);
    return () => window.removeEventListener("gt:unauthorized", onUnauthorized);
  }, [qc, router]);

  useEffect(() => {
    if (isError) router.replace("/giris");
  }, [isError, router]);

  if (isLoading || !me) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={me}>
      <Suspense>
        <Shell>{children}</Shell>
      </Suspense>
    </SessionCtx.Provider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const openQuick = useCallback(() => setQuickOpen(true), []);
  useHotkey("n", openQuick);

  return (
    <div className="flex min-h-screen">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        İçeriğe geç
      </a>
      <Sidebar onNew={openQuick} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onNew={openQuick} />
        <main id="icerik" className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <TaskDrawer />
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Yeni görev" className="max-w-2xl">
        <QuickAdd bare autoFocus onCreated={() => setQuickOpen(false)} />
      </Modal>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: ReactNode; match: (p: string, sp: URLSearchParams) => boolean; badge?: number };

function useNav(): NavItem[] {
  const { data } = useDashboard();
  const scope = (sp: URLSearchParams) => sp.get("scope") ?? "all";
  const isBoard = (sp: URLSearchParams) => sp.get("view") === "board";
  return [
    { href: "/", label: "Özet", icon: <House className="size-5" />, match: (p) => p === "/" },
    {
      href: "/gorevler?scope=mine",
      label: "Görevlerim",
      icon: <Inbox className="size-5" />,
      match: (p, sp) => p === "/gorevler" && scope(sp) === "mine" && !isBoard(sp),
      badge: data?.counts.myOpen,
    },
    {
      href: "/gorevler?scope=delegated",
      label: "Verdiğim görevler",
      icon: <Send className="size-5" />,
      match: (p, sp) => p === "/gorevler" && scope(sp) === "delegated" && !isBoard(sp),
      badge: data?.counts.assignedByMeOpen,
    },
    {
      href: "/gorevler?scope=all",
      label: "Tüm görevler",
      icon: <List className="size-5" />,
      match: (p, sp) => p === "/gorevler" && (scope(sp) === "all" || scope(sp) === "created") && !isBoard(sp),
    },
    {
      href: "/gorevler?scope=all&view=board",
      label: "Pano",
      icon: <LayoutGrid className="size-5" />,
      match: (p, sp) => p === "/gorevler" && isBoard(sp),
    },
    { href: "/ekip", label: "Ekip", icon: <Users className="size-5" />, match: (p) => p.startsWith("/ekip") },
  ];
}

function Sidebar({ onNew }: { onNew: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const nav = useNav();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 md:flex">
      <Link href="/" className="rounded-md px-2">
        <Logo />
      </Link>
      <Button variant="primary" className="h-12" onClick={onNew}>
        <Plus className="size-5" aria-hidden="true" /> Yeni görev
      </Button>
      <nav aria-label="Ana menü" className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = n.match(pathname, sp);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-base text-ink transition-colors",
                active ? "bg-accent-soft font-semibold" : "hover:bg-paper",
              )}
            >
              <span className={active ? "text-accent" : "text-ink-muted"} aria-hidden="true">
                {n.icon}
              </span>
              <span className="flex-1">{n.label}</span>
              {!!n.badge && (
                <span className="text-sm font-semibold text-ink-muted" aria-label={`${n.badge} açık görev`}>
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <p className="px-2 text-sm text-ink-muted">
          Kısayol: <Kbd>N</Kbd> tuşu yeni görev açar.
        </p>
        <UserMenu />
      </div>
    </aside>
  );
}

function UserMenu({ compact }: { compact?: boolean }) {
  const { data: me } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [pwOpen, setPwOpen] = useState(false);
  if (!me) return null;
  const logout = async () => {
    await api.post("/auth/logout");
    qc.clear();
    router.replace("/giris");
  };
  return (
    <>
      <Popover
        align={compact ? "end" : "start"}
        className={compact ? "w-64" : "top-auto bottom-full mt-0 mb-2 w-full"}
        trigger={({ toggle }) =>
          compact ? (
            <button type="button" onClick={toggle} className="flex size-11 cursor-pointer items-center justify-center rounded-full" aria-label={`Hesabım: ${me.name}`}>
              <Avatar user={me} size="md" />
            </button>
          ) : (
            <button type="button" onClick={toggle} className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-paper p-3 text-left hover:bg-sunken">
              <Avatar user={me} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-ink">{me.name}</span>
                <span className="block truncate text-sm text-ink-muted">{me.title || ROLE_META[me.role].label}</span>
              </span>
            </button>
          )
        }
      >
        {(close) => (
          <>
            <p className="px-3 py-2 text-sm break-all text-ink-muted">{me.email}</p>
            <MenuItem
              onClick={() => {
                close();
                setPwOpen(true);
              }}
            >
              <KeyRound className="size-5" aria-hidden="true" /> Şifremi değiştir
            </MenuItem>
            <MenuItem danger onClick={logout}>
              <LogOut className="size-5" aria-hidden="true" /> Çıkış yap
            </MenuItem>
          </>
        )}
      </Popover>
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function MobileTopBar({ onNew }: { onNew: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
      <Link href="/" className="flex-1">
        <Logo />
      </Link>
      <Button variant="primary" size="sm" className="h-11" onClick={onNew}>
        <Plus className="size-5" aria-hidden="true" /> Yeni
      </Button>
      <UserMenu compact />
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const nav = useNav().filter((n) => ["Özet", "Görevlerim", "Pano", "Ekip"].includes(n.label));
  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {nav.map((n) => {
        const active = n.match(pathname, sp);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-[72px] flex-col items-center justify-center gap-0.5 text-sm", active ? "font-bold text-accent" : "text-ink-muted")}
          >
            <span aria-hidden="true">{n.icon}</span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
