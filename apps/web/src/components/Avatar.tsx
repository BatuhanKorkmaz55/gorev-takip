import type { UserLite } from "@gorev/shared";
import { UserRound } from "lucide-react";
import { cn, initials } from "@/lib/utils";

const sizes = { sm: "size-7 text-[12px]", md: "size-9 text-sm", lg: "size-12 text-base" };

/** Kişi rozeti süsleyicidir: adın kendisi her zaman yanında yazılır. */
export function Avatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<UserLite, "name" | "color" | "active"> | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (!user) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-muted",
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
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white",
        !user.active && "opacity-60 grayscale",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: user.color }}
    >
      {initials(user.name)}
    </span>
  );
}
