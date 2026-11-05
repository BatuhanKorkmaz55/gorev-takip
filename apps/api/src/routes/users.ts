import { Router } from "express";
import type { UserWithStats } from "@gorev/shared";
import { AVATAR_COLORS, OPEN_STATUSES, createUserSchema, updateUserSchema } from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/http";
import { currentUser, hashPassword, requireAdmin } from "../lib/auth";
import { toUserLite } from "../lib/serialize";
import { keyToDate, todayKey } from "../lib/dates";

export const usersRouter = Router();

/** Ekip listesi + her kişinin iş yükü */
usersRouter.get("/", async (_req, res) => {
  const today = keyToDate(todayKey());
  const [users, byStatus, overdue] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.task.groupBy({ by: ["assigneeId", "status"], _count: { _all: true }, where: { assigneeId: { not: null } } }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      _count: { _all: true },
      where: { assigneeId: { not: null }, status: { in: OPEN_STATUSES }, dueDate: { lt: today } },
    }),
  ]);

  const result: UserWithStats[] = users.map((u) => {
    const rows = byStatus.filter((r) => r.assigneeId === u.id);
    const n = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
      ...toUserLite(u),
      createdAt: u.createdAt.toISOString(),
      stats: {
        open: n("TODO") + n("IN_PROGRESS") + n("BLOCKED"),
        inProgress: n("IN_PROGRESS"),
        blocked: n("BLOCKED"),
        done: n("DONE"),
        overdue: overdue.find((o) => o.assigneeId === u.id)?._count._all ?? 0,
      },
    };
  });
  res.json({ users: result });
});

usersRouter.post("/", requireAdmin, async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new HttpError(409, "Bu e-posta ile kayıtlı bir kullanıcı var");
  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      title: input.title || null,
      color: AVATAR_COLORS[count % AVATAR_COLORS.length],
    },
  });
  res.status(201).json({ user: toUserLite(user) });
});

usersRouter.patch("/:id", requireAdmin, async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  const input = updateUserSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("Kullanıcı");

  if (target.id === me.id && (input.active === false || input.role === "MEMBER")) {
    throw new HttpError(400, "Kendi yönetici yetkinizi veya hesabınızı kapatamazsınız");
  }
  if (input.email && input.email !== target.email) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new HttpError(409, "Bu e-posta ile kayıtlı bir kullanıcı var");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      title: input.title === undefined ? undefined : input.title || null,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
    },
  });
  res.json({ user: toUserLite(user) });
});

/**
 * Kullanıcıyı ekipten çıkarır. Geçmişi (oluşturduğu görevler, notları) olan kullanıcılar
 * silinmez, pasife alınır; böylece kayıtlar korunur. Açık görevlerinin ataması kaldırılır.
 */
usersRouter.delete("/:id", requireAdmin, async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  if (id === me.id) throw new HttpError(400, "Kendinizi ekipten çıkaramazsınız");
  const target = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { createdTasks: true, activities: true } } },
  });
  if (!target) throw notFound("Kullanıcı");

  const openTasks = await prisma.task.findMany({
    where: { assigneeId: id, status: { in: OPEN_STATUSES } },
    select: { id: true },
  });
  const unassigned = openTasks.length;
  if (unassigned) {
    await prisma.$transaction([
      prisma.task.updateMany({ where: { id: { in: openTasks.map((t) => t.id) } }, data: { assigneeId: null } }),
      prisma.activity.createMany({
        data: openTasks.map((t) => ({
          taskId: t.id,
          userId: me.id,
          type: "ASSIGNEE" as const,
          message: `${target.name} ekipten çıkarıldığı için atama kaldırıldı`,
          meta: { fromId: id, fromName: target.name, toId: null, toName: null },
        })),
      }),
    ]);
  }

  if (target._count.createdTasks === 0 && target._count.activities === 0) {
    await prisma.user.delete({ where: { id } });
    res.json({ result: "deleted", unassigned });
    return;
  }
  await prisma.user.update({ where: { id }, data: { active: false } });
  res.json({ result: "deactivated", unassigned });
});
