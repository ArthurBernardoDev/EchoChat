-- CreateIndex
CREATE INDEX "blocked_users_userId_createdAt_idx" ON "public"."blocked_users"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "blocked_users_createdAt_idx" ON "public"."blocked_users"("createdAt");

-- CreateIndex
CREATE INDEX "friendships_senderId_status_idx" ON "public"."friendships"("senderId", "status");

-- CreateIndex
CREATE INDEX "friendships_receiverId_status_idx" ON "public"."friendships"("receiverId", "status");

-- CreateIndex
CREATE INDEX "friendships_status_createdAt_idx" ON "public"."friendships"("status", "createdAt");

-- CreateIndex
CREATE INDEX "friendships_senderId_receiverId_status_idx" ON "public"."friendships"("senderId", "receiverId", "status");

-- CreateIndex
CREATE INDEX "friendships_status_updatedAt_idx" ON "public"."friendships"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "message_reactions_messageId_emoji_idx" ON "public"."message_reactions"("messageId", "emoji");

-- CreateIndex
CREATE INDEX "message_reactions_userId_createdAt_idx" ON "public"."message_reactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "message_reactions_emoji_createdAt_idx" ON "public"."message_reactions"("emoji", "createdAt");

-- CreateIndex
CREATE INDEX "message_read_receipts_messageId_readAt_idx" ON "public"."message_read_receipts"("messageId", "readAt");

-- CreateIndex
CREATE INDEX "message_read_receipts_userId_readAt_idx" ON "public"."message_read_receipts"("userId", "readAt" DESC);

-- CreateIndex
CREATE INDEX "messages_roomId_deleted_createdAt_idx" ON "public"."messages"("roomId", "deleted", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "messages_userId_createdAt_idx" ON "public"."messages"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "messages_roomId_userId_createdAt_idx" ON "public"."messages"("roomId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_replyToId_idx" ON "public"."messages"("replyToId");

-- CreateIndex
CREATE INDEX "messages_deleted_createdAt_idx" ON "public"."messages"("deleted", "createdAt");

-- CreateIndex
CREATE INDEX "messages_roomId_userId_deleted_idx" ON "public"."messages"("roomId", "userId", "deleted");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "public"."messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_edited_updatedAt_idx" ON "public"."messages"("edited", "updatedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "public"."notifications"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "public"."notifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_read_createdAt_idx" ON "public"."notifications"("read", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_type_read_idx" ON "public"."notifications"("userId", "type", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "room_bans_roomId_createdAt_idx" ON "public"."room_bans"("roomId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "room_bans_createdAt_idx" ON "public"."room_bans"("createdAt");

-- CreateIndex
CREATE INDEX "room_invites_roomId_expiresAt_idx" ON "public"."room_invites"("roomId", "expiresAt");

-- CreateIndex
CREATE INDEX "room_invites_expiresAt_idx" ON "public"."room_invites"("expiresAt");

-- CreateIndex
CREATE INDEX "room_invites_createdBy_createdAt_idx" ON "public"."room_invites"("createdBy", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "room_users_roomId_role_idx" ON "public"."room_users"("roomId", "role");

-- CreateIndex
CREATE INDEX "room_users_userId_joinedAt_idx" ON "public"."room_users"("userId", "joinedAt" DESC);

-- CreateIndex
CREATE INDEX "room_users_roomId_joinedAt_idx" ON "public"."room_users"("roomId", "joinedAt");

-- CreateIndex
CREATE INDEX "room_users_role_joinedAt_idx" ON "public"."room_users"("role", "joinedAt");

-- CreateIndex
CREATE INDEX "room_users_userId_role_idx" ON "public"."room_users"("userId", "role");

-- CreateIndex
CREATE INDEX "rooms_isPrivate_createdAt_idx" ON "public"."rooms"("isPrivate", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "rooms_isDirect_idx" ON "public"."rooms"("isDirect");

-- CreateIndex
CREATE INDEX "rooms_name_isPrivate_idx" ON "public"."rooms"("name", "isPrivate");

-- CreateIndex
CREATE INDEX "rooms_createdAt_idx" ON "public"."rooms"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_emailVerified_idx" ON "public"."users"("email", "emailVerified");

-- CreateIndex
CREATE INDEX "users_username_status_idx" ON "public"."users"("username", "status");

-- CreateIndex
CREATE INDEX "users_status_lastSeen_idx" ON "public"."users"("status", "lastSeen");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "users_lastSeen_status_idx" ON "public"."users"("lastSeen", "status");
