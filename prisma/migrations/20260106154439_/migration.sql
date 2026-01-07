/*
  Warnings:

  - A unique constraint covering the columns `[hash]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_hash_key" ON "Conversation"("hash");
