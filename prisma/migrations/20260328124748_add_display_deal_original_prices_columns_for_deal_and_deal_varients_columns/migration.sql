/*
  Warnings:

  - You are about to drop the column `finalPrice` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `offerPrice` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `finalPrice` on the `DealVariant` table. All the data in the column will be lost.
  - You are about to drop the column `offerPrice` on the `DealVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "finalPrice",
DROP COLUMN "offerPrice",
ADD COLUMN     "dealPrice" DOUBLE PRECISION,
ADD COLUMN     "displayedPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DealVariant" DROP COLUMN "finalPrice",
DROP COLUMN "offerPrice",
ADD COLUMN     "dealPrice" DOUBLE PRECISION,
ADD COLUMN     "displayedPrice" DOUBLE PRECISION;
