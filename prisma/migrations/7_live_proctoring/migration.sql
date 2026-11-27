-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "liveProctor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveRoomId" TEXT;
