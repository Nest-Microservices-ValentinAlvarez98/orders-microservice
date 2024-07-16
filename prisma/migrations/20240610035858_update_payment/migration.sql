/*
  Warnings:

  - You are about to drop the column `expirationType` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `expirationValue` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "expirationType",
DROP COLUMN "expirationValue",
ADD COLUMN     "expiration_type" TEXT NOT NULL DEFAULT 'MINUTES',
ADD COLUMN     "expiration_value" INTEGER NOT NULL DEFAULT 15;
