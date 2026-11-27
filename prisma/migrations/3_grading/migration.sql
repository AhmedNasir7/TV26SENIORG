-- Detects two examiners marking the same answer at once
ALTER TABLE "Answer" ADD COLUMN "gradeVersion" INTEGER NOT NULL DEFAULT 0;
