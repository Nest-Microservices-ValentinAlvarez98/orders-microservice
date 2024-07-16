/*
  Warnings:

  - A unique constraint covering the columns `[dlocal_payment_id]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Payment_dlocal_payment_id_key" ON "Payment"("dlocal_payment_id");
