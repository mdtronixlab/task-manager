-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "tasks" ADD COLUMN "dueReminderSentAt" DATETIME;
ALTER TABLE "tasks" ADD COLUMN "dueTime" TEXT;
