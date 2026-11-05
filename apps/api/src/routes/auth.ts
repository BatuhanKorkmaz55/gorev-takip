import { Router } from "express";
import { AVATAR_COLORS, changePasswordSchema, loginSchema, setupSchema } from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http";
import {
  clearSession,
  currentUser,
  hashPassword,
  rateLimit,
  requireAuth,
  setSession,
  verifyPassword,
} from "../lib/auth";
import { toUserLite } from "../lib/serialize";

export const authRouter = Router();

/** Hiç kullanıcı yoksa ilk yönetici kurulumu gerekir */
authRouter.get("/setup", async (_req, res) => {
  const count = await prisma.user.count();
  res.json({ needsSetup: count === 0 });
});

authRouter.post("/setup", async (req, res) => {
  const input = setupSchema.parse(req.body);
  const user = await prisma.$transaction(async (tx) => {
    const count = await tx.user.count();
    if (count > 0) throw new HttpError(409, "Kurulum zaten tamamlanmış");
    return tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: "ADMIN",
        color: AVATAR_COLORS[0],
      },
    });
  });
  setSession(res, user);
  res.status(201).json({ user: toUserLite(user) });
});

authRouter.post("/login", rateLimit(10, 5 * 60 * 1000), async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "E-posta veya şifre hatalı");
  if (!user.active) throw new HttpError(403, "Hesabınız pasif durumda. Yöneticinizle görüşün.");
  setSession(res, user);
  res.json({ user: toUserLite(user) });
});

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: toUserLite(currentUser(req)) });
});

authRouter.post("/password", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const input = changePasswordSchema.parse(req.body);
  if (!(await verifyPassword(input.currentPassword, me.passwordHash))) {
    throw new HttpError(400, "Mevcut şifre hatalı");
  }
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  res.json({ ok: true });
});
