import { Router } from "express";
import type { DashboardDTO } from "@gorev/shared";
import { OPEN_STATUSES } from "@gorev/shared";
import { prisma } from "../lib/prisma";
import { currentUser } from "../lib/auth";
import { keyToDate, startOfDayInTz, todayKey, weekStartKey } from "../lib/dates";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res) => {
  const me = currentUser(req);
  const today = todayKey();
  const weekStart = startOfDayInTz(weekStartKey(today));
  const open = { in: OPEN_STATUSES };

  const [myOpen, myInProgress, myOverdue, myDoneThisWeek, teamOpen, teamDoneThisWeek, assignedByMeOpen] =
    await Promise.all([
      prisma.task.count({ where: { assigneeId: me.id, status: open } }),
      prisma.task.count({ where: { assigneeId: me.id, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { assigneeId: me.id, status: open, dueDate: { lt: keyToDate(today) } } }),
      prisma.task.count({ where: { assigneeId: me.id, status: "DONE", completedAt: { gte: weekStart } } }),
      prisma.task.count({ where: { status: open } }),
      prisma.task.count({ where: { status: "DONE", completedAt: { gte: weekStart } } }),
      prisma.task.count({
        where: { creatorId: me.id, status: open, assigneeId: { not: null }, NOT: { assigneeId: me.id } },
      }),
    ]);

  const body: DashboardDTO = {
    today,
    counts: { myOpen, myInProgress, myOverdue, myDoneThisWeek, teamOpen, teamDoneThisWeek, assignedByMeOpen },
  };
  res.json(body);
});
