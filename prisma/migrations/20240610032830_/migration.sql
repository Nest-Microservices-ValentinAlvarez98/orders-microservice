/*
  Warnings:

  - You are about to drop the column `fullAddress` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `userReference` on the `Payer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_reference]` on the table `Payer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `full_address` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zip_code` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Payer_userReference_key";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "fullAddress",
DROP COLUMN "zipCode",
ADD COLUMN     "full_address" TEXT NOT NULL,
ADD COLUMN     "zip_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payer" DROP COLUMN "userReference",
ADD COLUMN     "user_reference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payer_user_reference_key" ON "Payer"("user_reference");
