/*
  Warnings:

  - You are about to drop the column `slotId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `slotId` on the `DealLock` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_slotId_fkey";

-- DropForeignKey
ALTER TABLE "DealLock" DROP CONSTRAINT "DealLock_slotId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "slotId";

-- AlterTable
ALTER TABLE "DealLock" DROP COLUMN "slotId";

-- CreateTable
CREATE TABLE "_SlotLocks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SlotLocks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SlotBookings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SlotBookings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SlotLocks_B_index" ON "_SlotLocks"("B");

-- CreateIndex
CREATE INDEX "_SlotBookings_B_index" ON "_SlotBookings"("B");

-- AddForeignKey
ALTER TABLE "_SlotLocks" ADD CONSTRAINT "_SlotLocks_A_fkey" FOREIGN KEY ("A") REFERENCES "DealLock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SlotLocks" ADD CONSTRAINT "_SlotLocks_B_fkey" FOREIGN KEY ("B") REFERENCES "VariantSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SlotBookings" ADD CONSTRAINT "_SlotBookings_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SlotBookings" ADD CONSTRAINT "_SlotBookings_B_fkey" FOREIGN KEY ("B") REFERENCES "VariantSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
