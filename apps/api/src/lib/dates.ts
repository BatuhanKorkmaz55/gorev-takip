import { addDaysKey, todayKeyInTz } from "@gorev/shared";
import { env } from "./env";

export const todayKey = () => todayKeyInTz(env.tz);

/** "YYYY-MM-DD" → @db.Date sütunu için Date */
export const keyToDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
export const dateToKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** İçinde bulunulan haftanın pazartesisi */
export function weekStartKey(today = todayKey()): string {
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = pazar
  return addDaysKey(today, -((dow + 6) % 7));
}

/** Saat diliminde verilen günün başlangıç anı (UTC Date) */
export function startOfDayInTz(key: string): Date {
  // Saat dilimi farkını o anki ofsete göre hesapla
  const probe = new Date(`${key}T12:00:00.000Z`);
  const local = new Date(probe.toLocaleString("en-US", { timeZone: env.tz }));
  const offsetMs = local.getTime() - new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() - offsetMs);
}
