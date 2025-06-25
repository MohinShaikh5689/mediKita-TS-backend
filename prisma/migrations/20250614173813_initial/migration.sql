-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "Doctors" (
    "id" TEXT NOT NULL,
    "FullName" TEXT NOT NULL,
    "Credentials" TEXT NOT NULL,
    "Specialization" TEXT[],
    "CurrentInstitution" TEXT NOT NULL,
    "YearsOfExperience" INTEGER NOT NULL,
    "Education" TEXT NOT NULL,
    "Certifications" TEXT[],
    "Awards" TEXT[],
    "Membership" TEXT[],
    "Publications" TEXT[],
    "LanguagesSpoken" TEXT[],
    "Bio" TEXT NOT NULL,
    "AreaOfInterest" TEXT[],
    "Links" TEXT NOT NULL,
    "LicenseId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorDocument" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DoctorDocument" ADD CONSTRAINT "DoctorDocument_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
