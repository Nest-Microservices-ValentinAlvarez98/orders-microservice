/*
  Warnings:

  - A unique constraint covering the columns `[userReference]` on the table `Payer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'UYU',
ALTER COLUMN "country" SET DEFAULT 'UY',
ALTER COLUMN "expirationType" SET DEFAULT 'MINUTES',
ALTER COLUMN "expirationValue" SET DEFAULT 15;

-- CreateIndex
CREATE UNIQUE INDEX "Payer_userReference_key" ON "Payer"("userReference");
