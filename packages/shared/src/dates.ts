/** Yerel tarih → "YYYY-MM-DD" */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Belirli bir saat dilimindeki bugünün tarihi → "YYYY-MM-DD" */
export function todayKeyInTz(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** İki tarih anahtarı arasındaki gün farkı (b - a) */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

/** "Bugün", "Yarın", "Dün", "3 gün gecikti", "Cuma", "12 Kas" gibi insan dostu tarih */
export function humanDue(dueKey: string, todayKey: string): string {
  const diff = diffDays(todayKey, dueKey);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  if (diff < 0) return `${-diff} gün gecikti`;
  const [y, m, d] = dueKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (diff < 7) return WEEKDAYS[dt.getUTCDay()];
  const [ty] = todayKey.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== ty ? ` ${y}` : ""}`;
}

export function formatDateKey(dueKey: string): string {
  const [y, m, d] = dueKey.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
