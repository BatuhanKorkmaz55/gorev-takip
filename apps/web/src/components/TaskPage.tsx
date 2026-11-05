"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaskDTO } from "@gorev/shared";
import { cn } from "@/lib/utils";
import { Board } from "./Board";
import { TaskList } from "./TaskList";
import { Spinner } from "./ui";

/** Başlık + Liste/Pano seçimi + görevler. Görevlerim ve Verdiğim görevler aynı iskeleti kullanır. */
export function TaskPage({
  title,
  tasks,
  loading,
  show,
  empty,
  children,
}: {
  title: string;
  tasks: TaskDTO[] | undefined;
  loading: boolean;
  show: "from" | "to";
  empty: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const board = sp.get("gorunum") === "pano";
  const setBoard = (b: boolean) => {
    const p = new URLSearchParams(sp.toString());
    if (b) p.set("gorunum", "pano");
    else p.delete("gorunum");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className={cn("mx-auto flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8", board ? "max-w-[1200px]" : "max-w-[960px]")}>
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="flex-[1_1_220px] text-3xl font-bold text-ink">{title}</h1>
        <div className="flex rounded-md bg-sunken p-1" role="group" aria-label="Görünüm">
          {[
            ["Liste", false],
            ["Pano", true],
          ].map(([label, value]) => (
            <button
              key={String(label)}
              type="button"
              aria-pressed={board === value}
              onClick={() => setBoard(value as boolean)}
              className={cn(
                "h-10 cursor-pointer rounded-[8px] px-4 text-[15px]",
                board === value ? "bg-surface font-bold text-ink shadow-card" : "text-todo-ink hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      {children}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : board ? (
        <Board tasks={tasks ?? []} show={show} />
      ) : (
        <TaskList tasks={tasks ?? []} show={show} empty={empty} />
      )}
    </div>
  );
}
