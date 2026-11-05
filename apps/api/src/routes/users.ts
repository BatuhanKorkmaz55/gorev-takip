import { Router } from "express";
import type { UserWithStats } from "@gorev/shared";
import { AVATAR_COLORS, OPEN_STATUSES, createUserSchema, updateUserSchema } from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/http";
import { currentUser, hashPassword, requireAdmin } from "../lib/auth";
import { toUserLite } from "../lib/serialize";

export const usersRouter = Router();

/** Ekip: aktif kişiler ve açık görev sayıları */
usersRouter.get("/", async (_req, res) => {
  const [users, open] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.task.groupBy({ by: ["assigneeId"], _count: { _all: true }, where: { status: { in: OPEN_STATUSES } } }),
  ]);
  const result: UserWithStats[] = users.map((u) => ({
    ...toUserLite(u),
    openCount: open.find((o) => o.assigneeId === u.id)?._count._all ?? 0,
  }));
  res.json({ users: result });
});

/** Kişi ekle. Daha önce çıkarılmış bir e-posta gelirse o hesap yeniden açılır. */
usersRouter.post("/", requireAdmin, async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing?.active) throw new HttpError(409, "Bu e-posta ile ekipte zaten biri var");
  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { active: true, name: input.name, role: input.role, passwordHash },
    });
    res.status(200).json({ user: toUserLite(user), reactivated: true });
    return;
  }
  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, role: input.role, passwordHash, color: AVATAR_COLORS[count % AVATAR_COLORS.length] },
  });
  res.status(201).json({ user: toUserLite(user) });
});

/** Şifre sıfırla */
usersRouter.patch("/:id", requireAdmin, async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) throw notFound("Kişi");
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: input.password ? await hashPassword(input.password) : undefined },
  });
  res.json({ user: toUserLite(user) });
});

/**
 * Ekipten çıkar. Açık görevleri, görevi veren kişiye geçer; veren de çıkarılan kişiyse çıkaran yöneticiye.
 * Geçmişi olan kişi silinmez, pasife alınır (kayıtlar korunur).
 */
usersRouter.delete("/:id", requireAdmin, async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  if (id === me.id) throw new HttpError(400, "Kendini ekipten çıkaramazsın");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || !target.active) throw notFound("Kişi");

  const openTasks = await prisma.task.findMany({
    where: { assigneeId: id, status: { in: OPEN_STATUSES } },
    include: { creator: true },
  });
  for (const t of openTasks) {
    const to = t.creatorId === id || !t.creator.active ? me : t.creator;
    await prisma.$transaction([
      prisma.task.update({ where: { id: t.id }, data: { assigneeId: to.id } }),
      prisma.activity.create({
        data: {
          taskId: t.id,
          userId: me.id,
          type: "ASSIGNEE",
          message: `${target.name} ekipten çıkarıldığı için görev ${to.name} kişisine geçti`,
          meta: { fromId: id, fromName: target.name, toId: to.id, toName: to.name },
        },
      }),
    ]);
  }

  const refs = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { createdTasks: true, assignedTasks: true, activities: true } } },
  });
  const c = refs!._count;
  if (c.createdTasks + c.assignedTasks + c.activities === 0) {
    await prisma.user.delete({ where: { id } });
  } else {
    await prisma.user.update({ where: { id }, data: { active: false } });
  }
  res.json({ ok: true, moved: openTasks.length });
});
