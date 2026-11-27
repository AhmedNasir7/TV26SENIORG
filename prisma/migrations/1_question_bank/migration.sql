-- Current wording kept on the question for search; backfilled from the current version
ALTER TABLE "Question" ADD COLUMN "currentText" TEXT NOT NULL DEFAULT '';
UPDATE "Question" q SET "currentText" = v."text"
  FROM "QuestionVersion" v
  WHERE v."questionId" = q."id" AND v."version" = q."currentVersion";

-- Optional length limit for written answers
ALTER TABLE "QuestionVersion" ADD COLUMN "maxLength" INTEGER;
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_maxLength_positive"
  CHECK ("maxLength" IS NULL OR "maxLength" > 0);
