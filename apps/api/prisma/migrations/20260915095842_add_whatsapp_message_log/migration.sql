-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "logId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_message_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_logs_logId_key" ON "whatsapp_message_logs"("logId");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_createdAt_idx" ON "whatsapp_message_logs"("createdAt");
