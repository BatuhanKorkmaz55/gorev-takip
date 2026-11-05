import type { UserLite } from "@gorev/shared";
import { UserRound } from "lucide-react";
import { cn, initials } from "@/lib/utils";

const sizes = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-11 text-sm" };

export function Avatar({
  user,
  size = "sm",
  className,
}: {
  user: Pick<UserLite, "name" | "color" | "active"> | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (!user) {
    return (
      <span
        title="Atanmamış"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400",
          sizes[size],
          className,
        )}
      >
        <UserRound className="size-[60%]" />
      </span>
    );
  }
  return (
    <span
      title={user.name + (user.active ? "" : " (ekipten ayrıldı)")}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        !user.active && "opacity-50 grayscale",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: user.color }}
    >
      {initials(user.name)}
    </span>
  );
}
