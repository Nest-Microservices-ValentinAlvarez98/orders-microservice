-- CreateIndex
CREATE INDEX "user_reference_index" ON "Payer"("user_reference");

-- CreateIndex
CREATE INDEX "email_index" ON "Payer"("email");

-- CreateIndex
CREATE INDEX "order_id_index" ON "Payment"("orderId");
