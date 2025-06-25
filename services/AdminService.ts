import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const CreateAdmin = async (adminData: any) => {
    try {
        const admin = await prisma.admin.create({
            data: adminData
        });

        return admin;
    } catch (error) {
        console.error("Error creating admin:", error);
        return "Failed to create admin";
    }
};

export const checkAdminexist = async (email: string) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { email: email }
        });
        return {
            exists: !!admin,
            admin: admin ? {
                id: admin.id,
                email: admin.email,
                fullName: admin.name,
                isInitial: admin.is_Initial,
                password: admin.password,
                role: admin.Role
            } : null
        }
        
    } catch (error) {
        console.error("Error checking if admin exists:", error);
        return "Error checking admin existence";
    }
}

export const changeAdminPass = async (email: string, newPassword: string) => {
    try {
        const updatedAdmin = await prisma.admin.update({
            where: { email: email },
            data: { 
                password: newPassword,
                is_Initial: false 
            }
        });

        return updatedAdmin;
    } catch (error) {
        console.error("Error changing admin password:", error);
        return "Failed to change password";
    }
}
