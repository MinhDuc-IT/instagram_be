-- AlterTable
ALTER TABLE "UploadedAsset" ADD COLUMN     "postId" TEXT;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "caption" TEXT,
    "location" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "isLikesHidden" BOOLEAN NOT NULL DEFAULT false,
    "isCommentsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(255),
    "modifiedDate" TIMESTAMP(3) NOT NULL,
    "modifiedBy" VARCHAR(255),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedBy" VARCHAR(255),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_createdDate_idx" ON "Post"("createdDate");

-- CreateIndex
CREATE INDEX "Post_deleted_idx" ON "Post"("deleted");

-- AddForeignKey
ALTER TABLE "UploadedAsset" ADD CONSTRAINT "UploadedAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
