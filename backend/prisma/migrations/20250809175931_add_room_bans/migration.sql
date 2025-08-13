-- CreateTable
CREATE TABLE "public"."room_bans" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_bans_roomId_idx" ON "public"."room_bans"("roomId");

-- CreateIndex
CREATE INDEX "room_bans_userId_idx" ON "public"."room_bans"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_bans_roomId_userId_key" ON "public"."room_bans"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "public"."room_bans" ADD CONSTRAINT "room_bans_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_bans" ADD CONSTRAINT "room_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
