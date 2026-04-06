/*
  Warnings:

  - Added the required column `updatedAt` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DealVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RecurringRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DealVariant" ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "RecurringRule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priceOverride" DOUBLE PRECISION,
ADD COLUMN     "timeOfDay" TEXT,
ADD COLUMN     "totalSlots" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
