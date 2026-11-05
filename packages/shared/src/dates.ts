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

export type DueTone = "overdue" | "today" | "tomorrow" | "soon" | "later";

/**
 * Kelimeyle bitiş tarihi: "3 gün gecikti", "Bugün", "Yarın", "Cuma, 7 Kas", "14 Kas", "3 Oca 2027".
 * Okunurluk için sayıyla tarih (07.11) hiçbir zaman tek başına kullanılmaz.
 */
export function dueLabel(dueKey: string, todayKey: string): { text: string; tone: DueTone } {
  const diff = diffDays(todayKey, dueKey);
  if (diff < 0) return { text: `${-diff} gün gecikti`, tone: "overdue" };
  if (diff === 0) return { text: "Bugün", tone: "today" };
  if (diff === 1) return { text: "Yarın", tone: "tomorrow" };
  const [y, m, d] = dueKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const [ty] = todayKey.split("-").map(Number);
  if (diff < 7) return { text: `${WEEKDAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`, tone: "soon" };
  return { text: `${d} ${MONTHS[m - 1]}${y !== ty ? ` ${y}` : ""}`, tone: "later" };
}

/** "Perşembe, 5 Kasım" */
export function longDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]}, ${d} ${MONTHS_LONG[m - 1]}`;
}

const MONTHS_LONG = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
