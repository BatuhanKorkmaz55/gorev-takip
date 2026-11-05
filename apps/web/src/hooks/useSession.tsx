"use client";

import { createContext, useContext } from "react";
import type { UserLite } from "@gorev/shared";

export const SessionCtx = createContext<UserLite | null>(null);

export function useSession(): UserLite {
  const me = useContext(SessionCtx);
  if (!me) throw new Error("useSession yalnızca oturum açılmış sayfalarda kullanılabilir");
  return me;
}
