"use client";

import { STATUS_META, type TaskDTO, type TaskStatus } from "@gorev/shared";
import { useChangeStatus } from "@/lib/queries";
import { useToast } from "./Toast";

/** Başla / Tamamla / Geri al. Tamamlayınca bildirimde "Geri al" çıkar. */
export function useStatusActions() {
  const change = useChangeStatus();
  const toast = useToast();
  return (task: TaskDTO, status: TaskStatus) => {
    const prev = task.status;
    change.mutate({ id: task.id, status }, { onError: (e) => toast(e.message, { tone: "error" }) });
    if (status === "DONE") {
      toast(`“${task.title}” tamamlandı.`, {
        action: { label: "Geri al", onClick: () => change.mutate({ id: task.id, status: prev }) },
      });
    } else if (status === "IN_PROGRESS" && prev === "TODO") {
      toast(`“${task.title}” görevine başladın.`);
    } else {
      toast(`“${task.title}” yeniden ${STATUS_META[status].label.toLocaleLowerCase("tr-TR")} oldu.`);
    }
  };
}
