-- Per-examination choice of what is recorded and when the board draws attention
ALTER TABLE "Exam" ADD COLUMN "monitoring" JSONB NOT NULL DEFAULT '{}';
