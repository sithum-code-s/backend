/*
  Warnings:

  - Made the column `businessName` on table `MerchantProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `businessDescription` on table `MerchantProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contactNumber` on table `MerchantProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contactNumber` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MerchantProfile" ALTER COLUMN "businessName" SET NOT NULL,
ALTER COLUMN "businessDescription" SET NOT NULL,
ALTER COLUMN "contactNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "contactNumber" SET NOT NULL;
