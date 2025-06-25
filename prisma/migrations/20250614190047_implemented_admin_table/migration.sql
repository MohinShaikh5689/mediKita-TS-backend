/*
  Warnings:

  - You are about to drop the column `email` on the `Admin` table. All the data in the column will be lost.
  - Added the required column `name` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Admin_email_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "email",
ADD COLUMN     "name" TEXT NOT NULL;
