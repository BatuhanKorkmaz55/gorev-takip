import clsx, { type ClassValue } from "clsx";
import { toDateKey } from "@gorev/shared";

export const cn = (...v: ClassValue[]) => clsx(v);

export const todayKey = () => toDateKey(new Date());

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toLocaleUpperCase("tr-TR");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

export function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "az önce";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) {
    const days = Math.round(abs / 86400);
    if (diff < 0) return days === 1 ? "dün" : `${days} gün önce`;
    return days === 1 ? "yarın" : `${days} gün sonra`;
  }
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function randomPassword(len = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}
