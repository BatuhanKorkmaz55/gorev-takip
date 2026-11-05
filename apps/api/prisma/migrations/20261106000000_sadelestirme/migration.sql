-- Sadeleştirme: kaldırılan durum ve alanlar için önce veriyi düzelt
UPDATE "tasks" SET "status" = 'IN_PROGRESS' WHERE "status" = 'BLOCKED';
UPDATE "tasks" SET "status" = 'DONE', "completedAt" = COALESCE("completedAt", "updatedAt") WHERE "status" = 'CANCELLED';
UPDATE "tasks" SET "assigneeId" = "creatorId" WHERE "assigneeId" IS NULL;
DELETE FROM "activities" WHERE "type" IN ('PRIORITY', 'TAGS', 'PROGRESS', 'CHECKLIST');
UPDATE "activities" SET "meta" = jsonb_set("meta", '{to}', '"IN_PROGRESS"') WHERE "type" = 'STATUS' AND "meta"->>'to' = 'BLOCKED';
UPDATE "activities" SET "meta" = jsonb_set("meta", '{to}', '"DONE"') WHERE "type" = 'STATUS' AND "meta"->>'to' = 'CANCELLED';
UPDATE "activities" SET "meta" = jsonb_set("meta", '{from}', '"IN_PROGRESS"') WHERE "type" = 'STATUS' AND "meta"->>'from' = 'BLOCKED';
UPDATE "activities" SET "meta" = jsonb_set("meta", '{from}', '"DONE"') WHERE "type" = 'STATUS' AND "meta"->>'from' = 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('CREATED', 'COMMENT', 'STATUS', 'ASSIGNEE', 'DUE_DATE', 'TITLE', 'DESCRIPTION');
ALTER TABLE "activities" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
ALTER TABLE "public"."tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';
COMMIT;

-- DropForeignKey
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_taskId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigneeId_fkey";

-- DropIndex
DROP INDEX "activities_createdAt_idx";

-- DropIndex
DROP INDEX "tasks_creatorId_idx";

-- DropIndex
DROP INDEX "tasks_dueDate_idx";

-- DropIndex
DROP INDEX "tasks_status_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "priority",
DROP COLUMN "progress",
DROP COLUMN "tags",
ALTER COLUMN "assigneeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "title",
ALTER COLUMN "color" SET DEFAULT '#3A5BA9';

-- DropTable
DROP TABLE "checklist_items";

-- DropEnum
DROP TYPE "Priority";

-- CreateIndex
CREATE INDEX "tasks_creatorId_status_idx" ON "tasks"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

