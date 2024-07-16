/*
  Warnings:

  - You are about to drop the column `paid` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paid",
DROP COLUMN "paidAt";
