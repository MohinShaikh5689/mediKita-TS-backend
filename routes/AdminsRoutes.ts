import type { FastifyInstance } from 'fastify';
import { createAdmin, loginAdmin, changeAdminPassword, resetAdminPassword, RestPassword } from '../controllers/AdminController.ts';
import { PasswordTokenChecker } from '../utils/passwordTokenChecker.ts';

export async function adminsRoutes(fastify: FastifyInstance) {
    fastify.post('/admins', createAdmin);
    fastify.post('/admins/login', loginAdmin);
    fastify.post('/admins/change-password', changeAdminPassword);
    fastify.post('/admins/reset-password', resetAdminPassword);
    fastify.post('/admin/reset-password', {preHandler:PasswordTokenChecker}, RestPassword);
}