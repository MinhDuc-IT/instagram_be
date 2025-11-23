/*
  Warnings:

  - A unique constraint covering the columns `[loginToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_loginToken_key" ON "User"("loginToken");
