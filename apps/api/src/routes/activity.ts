import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { currentUser } from "../lib/auth";
import { forbidden, notFound } from "../lib/http";
import { toActivityDTO, userLiteSelect } from "../lib/serialize";

export const activityRouter = Router();

const feedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(40),
  before: z.string().datetime().optional(),
  userId: z.string().optional(),
});

/** Ekip genelindeki son hareketler */
activityRouter.get("/", async (req, res) => {
  const q = feedQuery.parse(req.query);
  const rows = await prisma.activity.findMany({
    where: {
      ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: q.limit,
    include: {
      user: { select: userLiteSelect },
      task: { select: { id: true, number: true, title: true, status: true } },
    },
  });
  res.json({ activities: rows.map(toActivityDTO) });
});

/** Kendi notunu (veya yönetici herhangi bir notu) silebilir */
activityRouter.delete("/:id", async (req, res) => {
  const me = currentUser(req);
  const a = await prisma.activity.findUnique({ where: { id: String(req.params.id) } });
  if (!a || a.type !== "COMMENT") throw notFound("Not");
  if (a.userId !== me.id && me.role !== "ADMIN") throw forbidden("Yalnızca kendi notunuzu silebilirsiniz");
  await prisma.activity.delete({ where: { id: a.id } });
  res.json({ ok: true });
});
