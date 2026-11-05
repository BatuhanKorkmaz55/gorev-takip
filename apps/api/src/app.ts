import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./lib/env";
import { errorHandler, requireJson } from "./lib/http";
import { requireAuth } from "./lib/auth";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { tasksRouter } from "./routes/tasks";
import { activityRouter } from "./routes/activity";
import { dashboardRouter } from "./routes/dashboard";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requireJson);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", requireAuth, usersRouter);
  app.use("/api/tasks", requireAuth, tasksRouter);
  app.use("/api/activity", requireAuth, activityRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Uç nokta bulunamadı" });
  });
  app.use(errorHandler);
  return app;
}
