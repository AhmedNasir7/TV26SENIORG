-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "seal" TEXT;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "revealAnswers" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Dispute" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "attemptQuestionId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "resolvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReview" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispute_attemptId_idx" ON "Dispute"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_attemptQuestionId_key" ON "Dispute"("attemptQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiReview_attemptId_kind_key" ON "AiReview"("attemptId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_examId_candidateId_kind_key" ON "Reminder"("examId", "candidateId", "kind");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

