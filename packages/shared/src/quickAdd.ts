import type { Priority } from "./constants";
import { PRIORITY_META } from "./constants";
import { addDaysKey, formatDateKey, humanDue, toDateKey } from "./dates";

/**
 * Hızlı görev girişi ayrıştırıcısı.
 *
 * Örnek: "Teklif dosyasını hazırla @ayşe !acil #satış yarın"
 *   → başlık: "Teklif dosyasını hazırla", atanan: Ayşe, öncelik: Acil, etiket: satış, bitiş: yarın
 *
 * Desteklenen ifadeler:
 *   @isim / @ben / @kimse   → kişiye ata (@kimse: atamasız)
 *   !acil !yüksek !normal !düşük, !!! (acil), !! (yüksek)
 *   #etiket
 *   bugün, yarın, öbürgün, haftaya, pazartesi…pazar, 15.11, 15/11/2026, +3 / +3g
 */

export interface QuickAddUser {
  id: string;
  name: string;
  email: string;
}

export type QuickAddTokenKind = "assignee" | "priority" | "tag" | "due";

export interface QuickAddToken {
  kind: QuickAddTokenKind;
  raw: string;
  label: string;
  ok: boolean;
}

export interface QuickAddResult {
  title: string;
  /** undefined: belirtilmedi, null: açıkça atamasız (@kimse) */
  assigneeId?: string | null;
  priority?: Priority;
  tags: string[];
  dueDate?: string;
  tokens: QuickAddToken[];
}

export interface QuickAddOptions {
  users?: QuickAddUser[];
  currentUserId?: string;
  /** "YYYY-MM-DD"; verilmezse yerel bugün */
  today?: string;
}

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir: "Ayşe Işık" → "ayse isik" */
export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const PRIORITY_WORDS: Record<string, Priority> = {
  acil: "URGENT",
  kritik: "URGENT",
  yuksek: "HIGH",
  onemli: "HIGH",
  normal: "NORMAL",
  orta: "NORMAL",
  dusuk: "LOW",
};

const WEEKDAY_WORDS: Record<string, number> = {
  pazar: 0,
  pazartesi: 1,
  sali: 2,
  carsamba: 3,
  persembe: 4,
  cuma: 5,
  cumartesi: 6,
};

const TRAILING_PUNCT = /[.,;:!?)]+$/;

function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isValidDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Tek bir kelimeyi tarih olarak çözmeye çalışır */
export function parseDueWord(word: string, today: string): string | undefined {
  const w = normalizeTr(word).replace(TRAILING_PUNCT, "");
  if (w === "bugun") return today;
  if (w === "yarin") return addDaysKey(today, 1);
  if (w === "oburgun") return addDaysKey(today, 2);
  if (w === "haftaya") return addDaysKey(today, 7);
  if (w in WEEKDAY_WORDS) {
    const target = WEEKDAY_WORDS[w];
    const cur = weekdayOf(today);
    return addDaysKey(today, (target - cur + 7) % 7);
  }
  const plus = /^\+(\d{1,3})g?$/.exec(w);
  if (plus) return addDaysKey(today, Number(plus[1]));

  const dm = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/.exec(w);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    const [ty] = today.split("-").map(Number);
    let y = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : ty;
    if (!isValidDate(y, m, d)) return undefined;
    let key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!dm[3] && key < today) {
      y += 1;
      if (!isValidDate(y, m, d)) return undefined;
      key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return key;
  }
  return undefined;
}

/** "@ali" gibi bir ifadeyi kullanıcı listesinde arar */
export function matchUser(
  handle: string,
  users: QuickAddUser[],
  currentUserId?: string,
): QuickAddUser | undefined {
  const h = normalizeTr(handle).replace(TRAILING_PUNCT, "").replace(/[\s._-]/g, "");
  if (!h) return undefined;
  if ((h === "ben" || h === "bana") && currentUserId) {
    return users.find((u) => u.id === currentUserId);
  }
  const keys = (u: QuickAddUser) => {
    const parts = normalizeTr(u.name).split(/\s+/).filter(Boolean);
    const local = normalizeTr(u.email.split("@")[0] ?? "").replace(/[._-]/g, "");
    return { first: parts[0] ?? "", full: parts.join(""), parts, local };
  };
  const exact = users.filter((u) => {
    const k = keys(u);
    return k.first === h || k.full === h || k.local === h;
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  const prefix = users.filter((u) => {
    const k = keys(u);
    return k.full.startsWith(h) || k.parts.some((p) => p.startsWith(h)) || k.local.startsWith(h);
  });
  return prefix.length === 1 ? prefix[0] : undefined;
}

export function parseQuickAdd(input: string, opts: QuickAddOptions = {}): QuickAddResult {
  const users = opts.users ?? [];
  const today = opts.today ?? toDateKey(new Date());
  const words = input.split(/\s+/).filter(Boolean);
  const titleWords: string[] = [];
  const tokens: QuickAddToken[] = [];
  const result: QuickAddResult = { title: "", tags: [], tokens };

  for (const word of words) {
    // @kişi
    if (word.startsWith("@") && word.length > 1) {
      const handle = normalizeTr(word.slice(1)).replace(TRAILING_PUNCT, "");
      if (handle === "kimse" || handle === "yok") {
        result.assigneeId = null;
        replaceToken(tokens, { kind: "assignee", raw: word, label: "Atamasız", ok: true });
        continue;
      }
      const user = matchUser(word.slice(1), users, opts.currentUserId);
      if (user) {
        result.assigneeId = user.id;
        replaceToken(tokens, { kind: "assignee", raw: word, label: user.name, ok: true });
        continue;
      }
      tokens.push({ kind: "assignee", raw: word, label: `${word} bulunamadı`, ok: false });
      titleWords.push(word);
      continue;
    }

    // !öncelik
    if (/^!{2,3}$/.test(word)) {
      result.priority = word.length === 3 ? "URGENT" : "HIGH";
      replaceToken(tokens, { kind: "priority", raw: word, label: PRIORITY_META[result.priority].label, ok: true });
      continue;
    }
    if (word.startsWith("!") && word.length > 1) {
      const key = normalizeTr(word.slice(1)).replace(TRAILING_PUNCT, "");
      const p = PRIORITY_WORDS[key];
      if (p) {
        result.priority = p;
        replaceToken(tokens, { kind: "priority", raw: word, label: PRIORITY_META[p].label, ok: true });
        continue;
      }
    }

    // #etiket
    const tag = /^#([\p{L}\p{N}_-]{1,40})$/u.exec(word.replace(TRAILING_PUNCT, ""));
    if (tag) {
      const t = tag[1].toLocaleLowerCase("tr-TR");
      if (!result.tags.includes(t)) {
        result.tags.push(t);
        tokens.push({ kind: "tag", raw: word, label: `#${t}`, ok: true });
      }
      continue;
    }

    // tarih
    const due = parseDueWord(word, today);
    if (due) {
      result.dueDate = due;
      const human = humanDue(due, today);
      replaceToken(tokens, {
        kind: "due",
        raw: word,
        label: /\d/.test(human) ? formatDateKey(due) : `${human} · ${formatDateKey(due)}`,
        ok: true,
      });
      continue;
    }

    titleWords.push(word);
  }

  result.title = titleWords.join(" ").trim();
  return result;
}

function replaceToken(tokens: QuickAddToken[], t: QuickAddToken) {
  for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].kind === t.kind) tokens.splice(i, 1);
  tokens.push(t);
}
