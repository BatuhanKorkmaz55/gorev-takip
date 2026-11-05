"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Görev detay paneli URL'de ?gorev=<numara> olarak tutulur; paylaşılabilir ve geri tuşuyla kapanır. */
export function useTaskDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("gorev");

  const open = useCallback(
    (num: number | string) => {
      const p = new URLSearchParams(sp.toString());
      p.set("gorev", String(num));
      router.push(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [router, pathname, sp],
  );

  const close = useCallback(() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("gorev");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, sp]);

  return { current, open, close };
}
