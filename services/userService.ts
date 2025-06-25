import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export interface User {
    FirstName: string;
    LastName: string;
    email: string;
    password: string;
}

export const CreateUser = async (data:User) => {
    try {
        const user = await prisma.user.create({
            data: {
                FirstName: data.FirstName,
                LastName: data.LastName,
                email: data.email,
                password: data.password,
            },
        });
        return user;
    } catch (error) {
        console.error("Error creating user:", error);
        return 'Error creating user';
    }
}

export const GetUserByEmail = async (email: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        return user;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return 'Error fetching user by email';
    }
}

export const GetUserById = async (id: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select:{
                id: true,
                FirstName: true,
                LastName: true,
                email: true,
                ArticleSave:{
                    select: {
                        articleId: true,
                        article: {
                            select: {
                                id: true,
                                title: true,
                                content: true,
                                imageUrl: true,
                                category: true,
                                createdAt: true,      
                            }
                        }
                    }
                }
            }
        });
        return user;
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return 'Error fetching user by ID';
    }
};

export const changeUserPassword = async (email: string, newPassword: string) => {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password: newPassword },
        });
        return user;
    } catch (error) {
        console.error("Error changing user password:", error);
        return 'Error changing user password';
    }
}