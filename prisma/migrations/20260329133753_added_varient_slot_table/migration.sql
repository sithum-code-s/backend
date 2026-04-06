-- CreateEnum
CREATE TYPE "VariantSlotStatus" AS ENUM ('available', 'booked', 'locked', 'cancelled');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "slotId" TEXT;

-- AlterTable
ALTER TABLE "DealLock" ADD COLUMN     "slotId" TEXT;

-- CreateTable
CREATE TABLE "VariantSlot" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "status" "VariantSlotStatus" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VariantSlot" ADD CONSTRAINT "VariantSlot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "DealVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealLock" ADD CONSTRAINT "DealLock_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "VariantSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "VariantSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
