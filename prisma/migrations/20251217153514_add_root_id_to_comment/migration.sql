/*
  Warnings:

  - Added the required column `rootId` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "rootId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_rootId_createdAt_id_idx" ON "Comment"("rootId", "createdAt", "id");
