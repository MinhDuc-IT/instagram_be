-- CreateIndexes and AddForeignKeys for tables that were already created
-- These tables were created by the 20251122055112_init_schema migration

-- CreateIndex for Comment
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- AddForeignKey for Comment
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for CommentLike
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");
CREATE UNIQUE INDEX "CommentLike_actorId_commentId_key" ON "CommentLike"("actorId", "commentId");

-- AddForeignKey for CommentLike
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for ConversationMember
CREATE INDEX "ConversationMember_conversationId_idx" ON "ConversationMember"("conversationId");
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");

-- AddForeignKey for ConversationMember
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Follow
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- AddForeignKey for Follow
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Message
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- AddForeignKey for Message
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for MessageRead
CREATE INDEX "MessageRead_actorId_idx" ON "MessageRead"("actorId");
CREATE UNIQUE INDEX "MessageRead_messageId_actorId_key" ON "MessageRead"("messageId", "actorId");

-- AddForeignKey for MessageRead
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Notification
CREATE INDEX "Notification_receiverId_idx" ON "Notification"("receiverId");
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey for Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for PostLike
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
CREATE UNIQUE INDEX "PostLike_actorId_postId_key" ON "PostLike"("actorId", "postId");

-- AddForeignKey for PostLike
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Story
CREATE INDEX "Story_userId_idx" ON "Story"("userId");

-- AddForeignKey for Story
ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for StoryLike
CREATE INDEX "StoryLike_storyId_idx" ON "StoryLike"("storyId");
CREATE UNIQUE INDEX "StoryLike_actorId_storyId_key" ON "StoryLike"("actorId", "storyId");

-- AddForeignKey for StoryLike
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for StoryView
CREATE INDEX "StoryView_storyId_idx" ON "StoryView"("storyId");
CREATE UNIQUE INDEX "StoryView_actorId_storyId_key" ON "StoryView"("actorId", "storyId");

-- AddForeignKey for StoryView
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Note: Post_userId_fkey and Post indexes were already added in migration 20251027164523_add_post_table
-- No additional Post foreign keys or indexes need to be added
