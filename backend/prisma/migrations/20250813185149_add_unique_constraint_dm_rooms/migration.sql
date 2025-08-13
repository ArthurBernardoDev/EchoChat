/*
  Warnings:

  - A unique constraint covering the columns `[name,isDirect]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_isDirect_key" ON "public"."rooms"("name", "isDirect");
