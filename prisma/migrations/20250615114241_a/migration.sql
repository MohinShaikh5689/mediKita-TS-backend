-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormQuestions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "formId" TEXT NOT NULL,

    CONSTRAINT "FormQuestions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestions" ADD CONSTRAINT "FormQuestions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
