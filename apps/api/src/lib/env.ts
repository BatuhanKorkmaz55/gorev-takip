import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Ortam değişkeni eksik: ${name} (apps/api/.env dosyasını kontrol edin)`);
  return v;
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  tz: process.env.APP_TZ ?? "Europe/Istanbul",
};

if (env.isProd && env.jwtSecret.length < 32) {
  throw new Error("Üretimde JWT_SECRET en az 32 karakter olmalı");
}
