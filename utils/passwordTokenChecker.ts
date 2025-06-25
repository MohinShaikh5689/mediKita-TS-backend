import jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { errorHandle } from './asyncHandler.ts';

export const PasswordTokenChecker = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) return errorHandle('Unauthorized: No token provided', reply, 401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        if (typeof decoded === 'string' || !decoded?.Email) {
            return errorHandle('Unauthorized: Invalid token', reply, 401);
        } else {
            (request.body as any).email = decoded.Email; // Attach Email to request body
            return;
        }
    } catch (error) {
        return errorHandle('Unauthorized: Invalid token', reply, 401);
    }
};