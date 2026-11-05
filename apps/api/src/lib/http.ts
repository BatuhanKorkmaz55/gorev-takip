import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Kayıt") => new HttpError(404, `${what} bulunamadı`);
export const forbidden = (msg = "Bu işlem için yetkiniz yok") => new HttpError(403, msg);

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/** Durum değiştiren isteklerde JSON gövde zorunlu (basit CSRF koruması) */
export const requireJson: RequestHandler = (req, _res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return next(new HttpError(415, "İstek gövdesi application/json olmalı"));
  }
  next();
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      error: first?.message ?? "Geçersiz istek",
      field: first?.path.join("."),
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Bu kayıt zaten mevcut" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Kayıt bulunamadı" });
      return;
    }
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Geçersiz JSON" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası" });
};
