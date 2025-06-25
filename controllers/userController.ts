import type{ FastifyRequest, FastifyReply } from 'fastify';
import { CreateUser, GetUserByEmail, GetUserById, changeUserPassword } from '../services/userService.ts';
import bcrypt from 'bcryptjs';
import type{ User } from '../services/userService.ts';
import { asyncHandle, errorHandle, successHandle } from '../utils/asyncHandler.ts';
import { generateToken } from '../utils/generateToken.ts';
import { sendEmail } from '../utils/mail.ts';
import { generatePasswordResetToken } from '../utils/generateToken.ts';


export const createUser = asyncHandle(async(request: FastifyRequest, reply: FastifyReply) => {
    const user = request.body as User;
    const existingUser = await GetUserByEmail(user.email);
    if(typeof existingUser === 'string') {
        return errorHandle(existingUser, reply, 500);
    }
    if(existingUser) {
        return errorHandle('User already exists', reply, 400);
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    const result = await CreateUser(user);
    if(typeof result === 'string') {
        return errorHandle(result, reply, 500);
    }
    if(!result) {
        return errorHandle('User creation failed', reply, 500);
    }else {
       
        return successHandle({ message: 'User registered successfully' }, reply, 201);
    }
});

export const LoginUser = asyncHandle(async(request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    const user = await GetUserByEmail(email);
    if(typeof user === 'string') {
        return errorHandle(user, reply, 500);
    }
    if(!user) {
        return errorHandle('User not found', reply, 404);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
        return errorHandle('Invalid credentials', reply, 401);
    }
    const token = generateToken(user.id);
    return successHandle({ user, token }, reply, 200);
});

export const getUserById = asyncHandle(async(request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if(!userId) {
        return errorHandle('User ID is required', reply, 400);
    }
    const user = await GetUserById(userId);
    if(typeof user === 'string') {
        return errorHandle(user, reply, 500);
    }
    if(!user) {
        return errorHandle('User not found', reply, 404);
    }
    return successHandle(user, reply, 200);
});

 export const resetPasswordLink = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;

    if (!email) {
        return errorHandle("Email is required", reply, 400);
    }

    const userExist = await GetUserByEmail(email);
    if (typeof userExist === "string") {
        return errorHandle(userExist, reply, 500);
    }

    if (!userExist) {
        return errorHandle("User with this email does not exist", reply, 404);
    }

    if (userExist?.email !== email) {
       return errorHandle("You are not authorized to reset this password", reply, 403);
    }

    const resetToken = generatePasswordResetToken(email);
    const resetLink = `http://localhost:3000/user/reset-password?token=${resetToken}`;
    
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request - KitaDocs</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 15px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
                opacity: 0.4;
            }
            .header-content {
                position: relative;
                z-index: 1;
            }
            .header h1 {
                margin: 0;
                font-size: 32px;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .header-subtitle {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
                font-weight: 300;
            }
            .content {
                padding: 50px 40px;
                text-align: center;
            }
            .security-icon {
                width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 50px;
                color: white;
                box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            .reset-title {
                color: #1f2937;
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 20px 0;
            }
            .message {
                font-size: 18px;
                margin: 25px 0;
                color: #4b5563;
                line-height: 1.7;
            }
            .highlight {
                color: #3b82f6;
                font-weight: 600;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .security-notice {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #3b82f6;
                text-align: left;
            }
            .security-notice h3 {
                color: #1e40af;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .security-notice p {
                color: #1e3a8a;
                margin: 8px 0;
                font-weight: 500;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 20px 50px;
                text-decoration: none;
                border-radius: 30px;
                font-weight: 700;
                font-size: 18px;
                margin: 30px 0;
                transition: all 0.3s ease;
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .reset-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
            }
            .expiry-badge {
                display: inline-block;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 10px 25px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
                margin: 15px 0;
                text-transform: uppercase;
            }
            .token-info {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #10b981;
                text-align: left;
            }
            .token-info h3 {
                color: #059669;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .token-item {
                display: flex;
                align-items: center;
                margin: 12px 0;
                padding: 8px 0;
            }
            .token-icon {
                color: #10b981;
                margin-right: 12px;
                font-size: 16px;
                width: 20px;
            }
            .divider {
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%);
                margin: 30px 0;
            }
            .footer {
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                color: #d1d5db;
                padding: 30px;
                text-align: center;
            }
            .footer-logo {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 15px;
                color: #f9fafb;
            }
            .footer-links {
                margin: 20px 0;
            }
            .footer-link {
                color: #9ca3af;
                text-decoration: none;
                margin: 0 15px;
                font-size: 14px;
            }
            .footer-link:hover {
                color: #3b82f6;
            }
            .warning-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                border-left: 5px solid #f59e0b;
                text-align: left;
            }
            .warning-box h4 {
                color: #92400e;
                margin: 0 0 10px 0;
                font-size: 16px;
            }
            .warning-box p {
                color: #78350f;
                margin: 5px 0;
                font-size: 14px;
            }
            .welcome-box {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #10b981;
                text-align: left;
            }
            .welcome-box h3 {
                color: #059669;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .welcome-item {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            .welcome-icon {
                color: #10b981;
                margin-right: 10px;
                font-size: 16px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <h1>🏥 KitaDocs</h1>
                    <p class="header-subtitle">Medical Knowledge Platform</p>
                </div>
            </div>
            
            <div class="content">
                <div class="security-icon">🔐</div>
                
                <h2 class="reset-title">Password Reset Request</h2>
                
                <p class="message">
                    We received a request to reset your <span class="highlight">KitaDocs account password</span>. 
                    If you made this request, please click the button below to create a new password.
                </p>
                
                <div class="expiry-badge">
                    ⏰ Expires in 15 minutes
                </div>
                
                <div class="token-info">
                    <h3>🔑 Reset Instructions</h3>
                    <div class="token-item">
                        <span class="token-icon">📧</span>
                        <span><strong>Account:</strong> ${email}</span>
                    </div>
                    <div class="token-item">
                        <span class="token-icon">⏰</span>
                        <span><strong>Requested:</strong> ${new Date().toLocaleString()}</span>
                    </div>
                    <div class="token-item">
                        <span class="token-icon">👤</span>
                        <span><strong>Account Type:</strong> User Account</span>
                    </div>
                    <div class="token-item">
                        <span class="token-icon">📍</span>
                        <span><strong>Valid For:</strong> Single Use Only</span>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <a href="${resetLink}" class="reset-button" target="_blank">
                    🔑 Reset Password Now
                </a>
                
                <div class="security-notice">
                    <h3>🛡️ Security Information</h3>
                    <p>• This link will expire in 15 minutes for security</p>
                    <p>• The link can only be used once</p>
                    <p>• You will be required to create a strong new password</p>
                    <p>• After reset, you'll need to log in with the new password</p>
                </div>
                
                <div class="welcome-box">
                    <h3>🌟 What You Can Do After Reset</h3>
                    <div class="welcome-item">
                        <span class="welcome-icon">📚</span>
                        <span>Access thousands of medical articles and resources</span>
                    </div>
                    <div class="welcome-item">
                        <span class="welcome-icon">👨‍⚕️</span>
                        <span>Connect with verified medical professionals</span>
                    </div>
                    <div class="welcome-item">
                        <span class="welcome-icon">💡</span>
                        <span>Get personalized health insights and tips</span>
                    </div>
                    <div class="welcome-item">
                        <span class="welcome-icon">📱</span>
                        <span>Use all KitaDocs features seamlessly</span>
                    </div>
                </div>
                
                <div class="warning-box">
                    <h4>⚠️ Security Notice</h4>
                    <p>• If you did not request this password reset, please ignore this email</p>
                    <p>• Contact our support team if you suspect unauthorized access</p>
                    <p>• Never share your login credentials with anyone</p>
                    <p>• Use a strong, unique password for your account</p>
                </div>
                
                <p class="message">
                    <strong>Need Help?</strong> If you're having trouble with the reset process, 
                    our support team is here to help you get back to learning!
                </p>
                
                <p style="color: #6b7280; font-size: 16px; margin-top: 30px;">
                    Questions or concerns? Contact us at <strong>support@kitadocs.com</strong>
                </p>
            </div>
            
            <div class="footer">
                <div class="footer-logo">KitaDocs</div>
                <p style="margin: 10px 0; color: #9ca3af;">Your Trusted Medical Knowledge Platform</p>
                
                <div class="footer-links">
                    <a href="#" class="footer-link">Help Center</a>
                    <a href="#" class="footer-link">Privacy Policy</a>
                    <a href="#" class="footer-link">Contact Support</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    © 2024 KitaDocs. All rights reserved.<br>
                    Empowering healthcare knowledge for everyone.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    await sendEmail(
        email,
        "🔐 Password Reset Request - KitaDocs",
        emailContent
    ).catch((error) => {
        console.error("Error sending password reset email:", error);
    });

    return successHandle({ 
        message: "Password reset link sent to your email",
        note: "Please check your email and click the link within 15 minutes"
    }, reply, 200);
});

export const resetPassword = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, newPassword } = request.body as { email: string; newPassword: string };
    if (!email || !newPassword) {
        return errorHandle("Email and new password are required", reply, 400);
    }
    
    const user = await GetUserByEmail(email);
    if (typeof user === 'string') {
        return errorHandle(user, reply, 500);
    }
    if (!user) {
        return errorHandle("User not found", reply, 404);
    }

    if(email !== user.email) {
        return errorHandle("You are not authorized to reset this password", reply, 403);
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const result = await changeUserPassword(email, hashedPassword);

    if (typeof result === 'string') {
        return errorHandle(result, reply, 500);
    }

    if (!result) {
        return errorHandle("Password reset failed", reply, 500);
    }

    return successHandle({ message: "Password reset successfully" }, reply, 200);
    
})

