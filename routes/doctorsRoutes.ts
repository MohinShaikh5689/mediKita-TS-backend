import type{ FastifyInstance } from "fastify";
import { createDoctor, getDoctors, getDoctorById, changeDoctorVerificationStatus, loginDoctor, changeDoctorPasswordController, resetDoctorPassword, ResetPass } from "../controllers/doctorsController.ts";
import { AuthChecker } from "../utils/authChecker.ts";
import { DocAuthChecker } from "../utils/doctorsAuthChecker.ts";
import { PasswordTokenChecker } from "../utils/passwordTokenChecker.ts";

export const doctorsRoutes = async (app: FastifyInstance) => {
    app.post('/doctors', createDoctor);
    app.post('/doctors/login', loginDoctor);
    app.get('/doctors', { preHandler: AuthChecker }, getDoctors);
    app.post('/doctors/verification', { preHandler: AuthChecker }, changeDoctorVerificationStatus);
    app.post('/doctors/change-password', { preHandler: DocAuthChecker }, changeDoctorPasswordController);
    app.post('/doctors/changePassword', { preHandler: PasswordTokenChecker }, ResetPass);
    app.post('/doctors/reset-password', resetDoctorPassword);
    app.get('/doctors/:id', { preHandler: AuthChecker }, getDoctorById);
    app.get('/doctor/:id', { preHandler: DocAuthChecker }, getDoctorById);
};