ALTER TABLE "orders"
    ADD COLUMN "stripeChargeId" TEXT,
    ADD COLUMN "customerName" TEXT,
    ADD COLUMN "customerEmail" TEXT,
    ADD COLUMN "customerPhone" TEXT,
    ADD COLUMN "customerCountry" TEXT,
    ADD COLUMN "cardBrand" TEXT,
    ADD COLUMN "cardLast4" TEXT,
    ADD COLUMN "receiptUrl" TEXT,
    ADD COLUMN "billingLine1" TEXT,
    ADD COLUMN "billingLine2" TEXT,
    ADD COLUMN "billingCity" TEXT,
    ADD COLUMN "billingState" TEXT,
    ADD COLUMN "billingPostalCode" TEXT,
    ADD COLUMN "billingCountry" TEXT,
    ADD COLUMN "paymentDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_stripeChargeId_key" ON "orders"("stripeChargeId");
