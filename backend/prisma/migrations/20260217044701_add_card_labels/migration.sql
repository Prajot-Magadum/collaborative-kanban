-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[];
