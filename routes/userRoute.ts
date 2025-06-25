import type { FastifyInstance } from "fastify";
import { createUser, LoginUser, getUserById, resetPassword, resetPasswordLink } from "../controllers/userController.ts";
import { UserAuthChecker } from "../utils/usersAuth.ts";
import { PasswordTokenChecker } from "../utils/passwordTokenChecker.ts";

export async function userRoute(fastify: FastifyInstance) {
    fastify.post('/user/register', createUser);
    fastify.post('/user/login', LoginUser);
    fastify.get('/user/profile', { preHandler: UserAuthChecker }, getUserById);
    fastify.post('/users/reset-password', resetPasswordLink);
    fastify.post('/user/reset-password', { preHandler: PasswordTokenChecker }, resetPassword);
}