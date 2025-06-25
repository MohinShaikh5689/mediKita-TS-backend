import type { FastifyInstance } from "fastify";
import { generateForm, getForm, getAllFormsController, changeQuestionStatusController, SubmitForm } from "../controllers/FormController.ts";
import { DocAuthChecker } from "../utils/doctorsAuthChecker.ts";

export const formRoutes = async (fastify: FastifyInstance) => {
    fastify.post("/generate-form", generateForm);
    fastify.get("/form/:formId", getForm);
    fastify.get("/forms", getAllFormsController);
    fastify.post("/form/change-question-status",{preHandler:DocAuthChecker}, changeQuestionStatusController);
    fastify.post("/form/submit",{preHandler:DocAuthChecker}, SubmitForm);
}