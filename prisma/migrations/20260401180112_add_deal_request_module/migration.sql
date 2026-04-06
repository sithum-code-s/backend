-- CreateEnum
CREATE TYPE "DealRequestStatus" AS ENUM ('new', 'contacted', 'closed');

-- CreateTable
CREATE TABLE "DealRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "status" "DealRequestStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DealRequest" ADD CONSTRAINT "DealRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
