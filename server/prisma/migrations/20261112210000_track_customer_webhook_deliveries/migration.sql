ALTER TABLE "webhook_events"
  ALTER COLUMN "stripeEventId" DROP NOT NULL,
  ADD COLUMN "webhookId" VARCHAR(36),
  ADD COLUMN "responseCode" INTEGER,
  ADD COLUMN "success" BOOLEAN,
  ADD COLUMN "errorMessage" TEXT;

ALTER TABLE "webhook_events"
  ADD CONSTRAINT "webhook_events_webhookId_fkey"
  FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "webhook_events_webhookId_createdAt_idx"
  ON "webhook_events"("webhookId", "createdAt");
