/**
 * Yetki kuralları. API bunları zorunlu tutar; arayüz de aynı kurallarla düğmeleri gösterir ya da gizler.
 *
 * - Durumu (başla / tamamla / geri al) yalnızca görevi YAPAN kişi değiştirir.
 *   Görevi veren kişi ve yönetici de değiştiremez.
 * - Görevi düzenlemek ve silmek: görevi VEREN kişi ya da yönetici.
 * - Not eklemek: görevi yapan, veren ya da yönetici.
 */
export interface PermUser {
  id: string;
  role: "ADMIN" | "MEMBER";
}

export interface PermTask {
  creatorId: string;
  assigneeId: string;
}

export const canChangeStatus = (user: PermUser, task: PermTask) => task.assigneeId === user.id;

export const canEdit = (user: PermUser, task: PermTask) => task.creatorId === user.id || user.role === "ADMIN";

export const canAddNote = (user: PermUser, task: PermTask) =>
  task.assigneeId === user.id || task.creatorId === user.id || user.role === "ADMIN";
