"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Inbox, KeyRound, LogOut, Moon, Plus, Send, Sun, Users } from "lucide-react";
import { useMe, useTasks } from "@/lib/queries";
import { api } from "@/lib/api";
import { SessionCtx } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { Modal } from "./Modal";
import { MenuItem, Popover } from "./Popover";
import { NewTaskForm } from "./NewTaskForm";
import { TaskDrawer } from "./TaskDrawer";
import { PasswordModal } from "./PasswordModal";
import { Button, Spinner } from "./ui";

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
  const [giving, setGiving] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar onGive={() => setGiving(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onGive={() => setGiving(true)} />
        <main id="icerik" className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <TaskDrawer />
      <Modal open={giving} onClose={() => setGiving(false)} title="Görev ver" className="max-w-2xl">
        <NewTaskForm bare autoFocus onCreated={() => setGiving(false)} />
      </Modal>
    </div>
  );
}

function useNav() {
  const mine = useTasks({ scope: "mine", status: "open" });
  const given = useTasks({ scope: "given", status: "open" });
  return [
    { href: "/", label: "Görevlerim", short: "Görevlerim", icon: <Inbox className="size-5" />, count: mine.data?.length },
    { href: "/verdiklerim", label: "Verdiğim görevler", short: "Verdiklerim", icon: <Send className="size-5" />, count: given.data?.length },
    { href: "/ekip", label: "Ekip", short: "Ekip", icon: <Users className="size-5" />, count: undefined },
  ];
}

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function Sidebar({ onGive }: { onGive: () => void }) {
  const pathname = usePathname();
  const nav = useNav();
  return (
    <aside className="sticky top-0 hidden h-screen w-62 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 md:flex">
      <Link href="/" className="rounded-md px-2">
        <Logo />
      </Link>
      <Button variant="primary" className="h-12" onClick={onGive}>
        <Plus className="size-5" aria-hidden="true" /> Görev ver
      </Button>
      <nav aria-label="Ana menü" className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-base text-ink", active ? "bg-accent-soft font-semibold" : "hover:bg-paper")}
            >
              <span className={active ? "text-accent" : "text-ink-muted"} aria-hidden="true">
                {n.icon}
              </span>
              <span className="flex-1">{n.label}</span>
              {!!n.count && <span className="text-sm text-ink-muted">{n.count}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
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
  const { theme, toggle: toggleTheme } = useTheme();
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
        className="w-60"
        triggerClassName={compact ? "inline-flex" : "flex w-full"}
        trigger={({ toggle }) =>
          compact ? (
            <button type="button" onClick={toggle} className="flex size-11 cursor-pointer items-center justify-center rounded-full" aria-label={`Hesabım: ${me.name}`}>
              <Avatar user={me} size="md" />
            </button>
          ) : (
            <button type="button" onClick={toggle} className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-paper p-3 text-left hover:bg-sunken">
              <Avatar user={me} size="md" />
              <span className="min-w-0 truncate text-base font-semibold text-ink">{me.name}</span>
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
            <MenuItem onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
              {theme === "dark" ? "Açık tema" : "Koyu tema"}
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

function MobileTopBar({ onGive }: { onGive: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
      <Link href="/" className="flex-1">
        <Logo />
      </Link>
      <Button variant="primary" size="sm" className="h-11" onClick={onGive}>
        Görev ver
      </Button>
      <UserMenu compact />
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const nav = useNav();
  return (
    <nav aria-label="Ana menü" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {nav.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-[72px] flex-col items-center justify-center gap-0.5 text-sm", active ? "font-bold text-accent" : "text-ink-muted")}
          >
            <span aria-hidden="true">{n.icon}</span>
            {n.short}
          </Link>
        );
      })}
    </nav>
  );
}
