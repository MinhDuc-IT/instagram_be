-- Create PostSave table for save/bookmark functionality
CREATE TABLE "PostSave" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostSave_postId_idx" ON "PostSave"("postId");
CREATE UNIQUE INDEX "PostSave_actorId_postId_key" ON "PostSave"("actorId", "postId");

-- AddForeignKey
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
