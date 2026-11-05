"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_META } from "@gorev/shared";
import { House, KeyRound, LogOut, ListTodo, Plus, Send, SquareKanban, Users, Inbox } from "lucide-react";
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
import { Kbd, Spinner } from "./ui";

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
      <Sidebar onNew={openQuick} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onNew={openQuick} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
      <TaskDrawer />
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Yeni görev" className="max-w-xl">
        <QuickAdd autoFocus onCreated={() => setQuickOpen(false)} />
        <p className="mt-3 text-xs text-zinc-500">
          Kişi yazmazsan görev sana atanır. Ayrıntıları (açıklama, alt adımlar) görevi açıp ekleyebilirsin.
        </p>
      </Modal>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: ReactNode; match: (p: string, sp: URLSearchParams) => boolean; badge?: number };

function useNav(): NavItem[] {
  const { data } = useDashboard();
  return [
    { href: "/", label: "Panom", icon: <House className="size-4" />, match: (p) => p === "/" },
    {
      href: "/gorevler?scope=mine",
      label: "Görevlerim",
      icon: <Inbox className="size-4" />,
      match: (p, sp) => p === "/gorevler" && sp.get("scope") === "mine" && sp.get("view") !== "board",
      badge: data?.counts.myOpen,
    },
    {
      href: "/gorevler?scope=delegated",
      label: "Atadıklarım",
      icon: <Send className="size-4" />,
      match: (p, sp) => p === "/gorevler" && sp.get("scope") === "delegated" && sp.get("view") !== "board",
      badge: data?.counts.assignedByMeOpen,
    },
    {
      href: "/gorevler?scope=all",
      label: "Tüm görevler",
      icon: <ListTodo className="size-4" />,
      match: (p, sp) => p === "/gorevler" && (!sp.get("scope") || sp.get("scope") === "all" || sp.get("scope") === "created") && sp.get("view") !== "board",
    },
    {
      href: "/gorevler?scope=all&view=board",
      label: "Pano",
      icon: <SquareKanban className="size-4" />,
      match: (p, sp) => p === "/gorevler" && sp.get("view") === "board",
    },
    { href: "/ekip", label: "Ekip", icon: <Users className="size-4" />, match: (p) => p.startsWith("/ekip") },
  ];
}

function Sidebar({ onNew }: { onNew: () => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const nav = useNav();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200/80 bg-white/60 px-3 py-4 md:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      <button
        type="button"
        onClick={onNew}
        className="mt-5 flex h-9 items-center gap-2 rounded-lg bg-accent-600 px-3 text-sm font-medium text-white shadow-sm shadow-accent-600/20 transition hover:bg-accent-700"
      >
        <Plus className="size-4" /> Yeni görev
        <span className="ml-auto rounded bg-white/15 px-1.5 text-[11px]">N</span>
      </button>
      <nav className="mt-4 space-y-0.5">
        {nav.map((n) => {
          const active = n.match(pathname, sp);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                active ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900",
              )}
            >
              <span className={active ? "text-accent-600" : "text-zinc-400"}>{n.icon}</span>
              {n.label}
              {!!n.badge && <span className="ml-auto text-xs tabular-nums text-zinc-400">{n.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <div className="mb-3 rounded-lg px-2.5 text-[11px] leading-relaxed text-zinc-400">
          <Kbd>N</Kbd> yeni görev · <Kbd>Esc</Kbd> kapat
        </div>
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
        className={compact ? "" : "bottom-full top-auto mb-1 w-56"}
        trigger={({ toggle }) =>
          compact ? (
            <button type="button" onClick={toggle} className="rounded-full">
              <Avatar user={me} size="md" />
            </button>
          ) : (
            <button type="button" onClick={toggle} className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-zinc-100">
              <Avatar user={me} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900">{me.name}</span>
                <span className="block truncate text-xs text-zinc-500">{me.title || ROLE_META[me.role].label}</span>
              </span>
            </button>
          )
        }
      >
        {(close) => (
          <>
            <div className="px-2.5 py-1.5 text-xs text-zinc-500">{me.email}</div>
            <MenuItem
              onClick={() => {
                close();
                setPwOpen(true);
              }}
            >
              <KeyRound className="size-4" /> Şifremi değiştir
            </MenuItem>
            <MenuItem danger onClick={logout}>
              <LogOut className="size-4" /> Çıkış yap
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur md:hidden">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onNew} className="flex size-9 items-center justify-center rounded-full bg-accent-600 text-white" aria-label="Yeni görev">
          <Plus className="size-5" />
        </button>
        <UserMenu compact />
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const nav = useNav().filter((n) => ["Panom", "Görevlerim", "Pano", "Ekip"].includes(n.label));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {nav.map((n) => {
        const active = n.match(pathname, sp);
        return (
          <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-accent-600" : "text-zinc-500")}>
            {n.icon}
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
