-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "examId" INTEGER;
ALTER TABLE "Enrollment" ADD COLUMN "reminderMinutes" INTEGER;

-- The old community chat belongs to no examination; it is removed
DELETE FROM "ChatMessage" WHERE "examId" IS NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_examId_idx" ON "ChatMessage"("examId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder choices are small positive numbers of minutes
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_reminderMinutes_check" CHECK ("reminderMinutes" IS NULL OR ("reminderMinutes" > 0 AND "reminderMinutes" <= 10080));

-- A candidate who leaves a running examination ends it
ALTER TYPE "SubmitReason" ADD VALUE 'LEFT';
