-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "dlocal_payment_id" TEXT;

-- CreateIndex
CREATE INDEX "Payment_dlocal_payment_id_idx" ON "Payment"("dlocal_payment_id");
