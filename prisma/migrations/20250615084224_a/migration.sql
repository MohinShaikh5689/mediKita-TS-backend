/*
  Warnings:

  - A unique constraint covering the columns `[Email]` on the table `Doctors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Email` to the `Doctors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Doctors" ADD COLUMN     "Email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Doctors_Email_key" ON "Doctors"("Email");
