/*
  Warnings:

  - The `verificationStatus` column on the `MerchantProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MerchantVerificationStatus" AS ENUM ('pending', 'verified');

-- AlterTable
ALTER TABLE "MerchantProfile" DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "MerchantVerificationStatus" NOT NULL DEFAULT 'pending';
