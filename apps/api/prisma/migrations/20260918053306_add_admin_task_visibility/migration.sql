-- CreateTable
CREATE TABLE "admin_task_visibility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "viewerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_task_visibility_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "admin_task_visibility_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users" ("userId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_task_visibility_viewerId_targetId_key" ON "admin_task_visibility"("viewerId", "targetId");
