-- Where a candidate has got to; enforces "no going back" on the server
ALTER TABLE "Attempt" ADD COLUMN "reachedPosition" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_reached_positive" CHECK ("reachedPosition" >= 1);
