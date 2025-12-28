-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "postId" TEXT;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
