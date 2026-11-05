import type { Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./prisma";
import { HttpError, forbidden } from "./http";

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 30;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function setSession(res: Response, user: Pick<User, "id">) {
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

async function loadUser(req: Request): Promise<User | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return user && user.active ? user : null;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) return next(new HttpError(401, "Oturum açmanız gerekiyor"));
  req.user = user;
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "ADMIN") return next(forbidden("Bu işlem yalnızca yöneticilere açık"));
  next();
};

export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, "Oturum açmanız gerekiyor");
  return req.user;
}

/** Basit bellek içi deneme sınırlayıcı (giriş için) */
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, _res, next) => {
    const key = `${req.ip}:${String(req.body?.email ?? "")}`;
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    h.count++;
    if (h.count > max) return next(new HttpError(429, "Çok fazla deneme. Birkaç dakika sonra tekrar deneyin."));
    next();
  };
}
