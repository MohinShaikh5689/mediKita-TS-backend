import { PrismaClient } from "../generated/prisma/index.js";
import { QuestionStaus } from "../generated/prisma/index.js";
import { FormStatus } from "../generated/prisma/index.js";
const Prisma = new PrismaClient();

export const generateFormData = async (data: any) => {
   const doctorId = data.id;
   const formId = data.Formid;
   const questions = data.questions;
   
   console.log("Generating form data for doctor:", doctorId, "with form ID:", formId);
   console.log("Questions to save:", questions.length);

   try {
      // Use transaction to ensure both form and questions are created together
      const result = await Prisma.$transaction(async (tx) => {
         // Create the form first
         const form = await tx.form.create({
            data: {
               id: formId,
               doctorId: doctorId,
            }
         });

         // Create all questions
         const createQuestions = await tx.formQuestions.createMany({
            data: questions.map((question: any) => ({
               question: question.question,
               formId: formId, // Use formId directly, not form.id
            }))
         });

         return { form, createQuestions };
      });

      console.log("Form created:", result.form);
      console.log("Questions created count:", result.createQuestions.count);
      
      return result;
   } catch (error) {
      console.error("Error creating form and questions:", error);
      return "Failed to create form and questions";
   }
};

export const checkFormForDoctorExists = async (doctorId: string) => {
   try {
      const form = await Prisma.form.findFirst({
         where: {
            doctorId: doctorId,
         }
      });

      return form !== null; // Returns true if form exists, false otherwise
   } catch (error) {
      console.error("Error checking if form exists for doctor:", error);
      return "Error checking form existence";
   }
}

export const getFormbyDoctorId = async (formId: string) => {
    try {
        const form = await Prisma.form.findFirst({
            where: {
                doctorId: formId,
            },
            include: {
                questions: true, 
                doctor:{
                   select:{
                      FullName: true,
                   }
                }
            }
        });

        if(!form){
         return "Form not found";
        }
    
        return form; // Returns the form with its questions
    } catch (error) {
        console.error("Error fetching form by ID:", error);
        return "Failed to fetch form";
    }
}

export const getAllForms = async () => {
      try {
         const forms = await Prisma.form.findMany({
            include:{
               doctor:{
                  select: {
                     id: true,
                     FullName: true,
                     Email: true,
                  }
               }
            }
         });
   
         return forms; // Returns all forms with their questions
      } catch (error) {
         console.error("Error fetching all forms:", error);
         return "Failed to fetch forms";
      }
}

export const changeQuestionStatus = async (questionId: string, status: string) => {
   try {
      const updatedQuestion = await Prisma.formQuestions.update({
         where: {
            id: questionId,
         },
         data: {
            status: status as QuestionStaus, 
         }
      });

      return updatedQuestion; // Returns the updated question
   } catch (error) {
      console.error("Error updating question status:", error);
      return "Failed to update question status";
   }
}

export const submitForm = async (formId: string) => {
   try {
      const updatedForm = await Prisma.form.update({
         where: {
            id: formId,
         },
         data: {
            FormStatus: "SUBMITTED" as FormStatus, // Assuming you have a status field in your form model
         }
      });

      return updatedForm; // Returns the updated form
   } catch (error) {
      console.error("Error submitting form:", error);
      return "Failed to submit form";
   }
}
