import jwt from 'jsonwebtoken';

export const generateToken = (userId: string): string => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET as string, {
        expiresIn: '30d' 
    });
    return token;
}

export const generatePasswordResetToken = (Email: string): string => {
    const token = jwt.sign({Email}, process.env.JWT_SECRET as string, {
        expiresIn: '1h' 
    });
    return token;
}