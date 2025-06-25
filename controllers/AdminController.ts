import { asyncHandle, successHandle, errorHandle } from "../utils/asyncHandler.ts";
import type { FastifyRequest, FastifyReply } from "fastify";
import { CreateAdmin, checkAdminexist, changeAdminPass} from "../services/AdminService.ts";
import { generateToken, generatePasswordResetToken } from "../utils/generateToken.ts";
import { sendEmail } from "../utils/mail.ts";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const createAdmin = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const Name = (request.body as any).Name as string;
    const Email = (request.body as any).Email as string;
    const Role = (request.body as any).Role as string;

    const adminExists = await checkAdminexist(Email);
    if (typeof adminExists === "string") {
        return errorHandle(adminExists, reply, 500);
    }
    if (adminExists) {
        return errorHandle("Admin with this email already exists", reply, 400);
    }

    const password = crypto.createHash('sha256').digest('hex');

    const AdminData: any = {};

    if (!Name || !Email) {
        return errorHandle("Name, Email,are required", reply, 400);
    }
    AdminData["name"] = Name;
    AdminData["email"] = Email;
    AdminData["password"] = password;

    if (Role) {
        AdminData["Role"] = Role;
    }

    const result = await CreateAdmin(AdminData);

    if (typeof result === "string") {
        return errorHandle(result, reply, 500);
    }

    const emailContent = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Account Created - KitaDocs</title>
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
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
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
            .admin-icon {
                width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 50px;
                color: white;
                box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            .admin-title {
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
                color: #7c3aed;
                font-weight: 600;
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .credentials-card {
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                text-align: left;
                border-left: 5px solid #7c3aed;
                border: 1px solid #d1d5db;
            }
            .credentials-title {
                color: #1f2937;
                font-size: 20px;
                font-weight: 600;
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
            }
            .credential-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 15px 0;
                padding: 12px 15px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            .credential-label {
                color: #6b7280;
                font-weight: 500;
                display: flex;
                align-items: center;
            }
            .credential-icon {
                color: #7c3aed;
                margin-right: 8px;
                font-size: 16px;
            }
            .credential-value {
                color: #1f2937;
                font-weight: 600;
                font-family: 'Courier New', monospace;
                background: #f9fafb;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #e5e7eb;
            }
            .security-notice {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #ef4444;
                text-align: left;
            }
            .security-notice h3 {
                color: #dc2626;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .security-notice p {
                color: #991b1b;
                margin: 8px 0;
                font-weight: 500;
            }
            .role-badge {
                display: inline-block;
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                margin: 15px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                color: white;
                padding: 18px 40px;
                text-decoration: none;
                border-radius: 30px;
                font-weight: 600;
                font-size: 16px;
                margin: 30px 0;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(31, 41, 55, 0.3);
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(31, 41, 55, 0.4);
            }
            .permissions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            .permission-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                text-align: center;
            }
            .permission-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
            .permission-text {
                color: #6b7280;
                font-size: 14px;
                font-weight: 500;
            }
            .divider {
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, #7c3aed 50%, transparent 100%);
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
                color: #7c3aed;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <h1>🏥 KitaDocs</h1>
                    <p class="header-subtitle">Administrative Portal</p>
                </div>
            </div>
            
            <div class="content">
                <div class="admin-icon">👑</div>
                
                <h2 class="admin-title">Admin Account Created Successfully!</h2>
                
                <p class="message">
                    Welcome to the KitaDocs administrative team, <span class="highlight">${Name}</span>! 
                    Your admin account has been created and you now have access to the platform's administrative features.
                </p>
                
                <div class="role-badge">
                    ${Role || 'ADMIN'} ACCESS
                </div>
                
                <div class="credentials-card">
                    <h3 class="credentials-title">
                        🔐 Account Credentials
                    </h3>
                    <div class="credential-item">
                        <span class="credential-label">
                            <span class="credential-icon">📧</span>
                            Email Address
                        </span>
                        <span class="credential-value">${Email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">
                            <span class="credential-icon">🔑</span>
                            Temporary Password
                        </span>
                        <span class="credential-value">${password.substring(0, 16)}...</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">
                            <span class="credential-icon">👤</span>
                            Role
                        </span>
                        <span class="credential-value">${Role || 'Administrator'}</span>
                    </div>
                </div>
                
                <div class="security-notice">
                    <h3>🔒 Security Requirements</h3>
                    <p>• Change your password immediately after first login</p>
                    <p>• Enable two-factor authentication for enhanced security</p>
                    <p>• Never share your admin credentials with anyone</p>
                    <p>• Use a strong, unique password for your account</p>
                    <p>• Log out completely when finished with admin tasks</p>
                </div>
                
                <div class="credentials-card">
                    <h3 class="credentials-title">
                        ⚡ Admin Permissions
                    </h3>
                    <div class="permissions-grid">
                        <div class="permission-item">
                            <div class="permission-icon">👨‍⚕️</div>
                            <div class="permission-text">Manage Doctors</div>
                        </div>
                        <div class="permission-item">
                            <div class="permission-icon">✅</div>
                            <div class="permission-text">Verify Profiles</div>
                        </div>
                        <div class="permission-item">
                            <div class="permission-icon">📊</div>
                            <div class="permission-text">View Analytics</div>
                        </div>
                        <div class="permission-item">
                            <div class="permission-icon">📋</div>
                            <div class="permission-text">Manage Forms</div>
                        </div>
                        <div class="permission-item">
                            <div class="permission-icon">📧</div>
                            <div class="permission-text">Send Notifications</div>
                        </div>
                        <div class="permission-item">
                            <div class="permission-icon">⚙️</div>
                            <div class="permission-text">System Settings</div>
                        </div>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <a href="http://localhost:3000/admin/login" class="cta-button">
                    🚀 Access Admin Portal
                </a>
                
                <p class="message">
                    <strong>Next Steps:</strong> Click the button above to access your admin portal and complete your account setup.
                </p>
                
                <p style="color: #6b7280; font-size: 16px; margin-top: 30px;">
                    Questions? Contact the technical team at <strong>tech@kitadocs.com</strong>
                </p>
            </div>
            
            <div class="footer">
                <div class="footer-logo">KitaDocs Admin</div>
                <p style="margin: 10px 0; color: #9ca3af;">Administrative Access Portal</p>
                
                <div class="footer-links">
                    <a href="#" class="footer-link">Admin Guide</a>
                    <a href="#" class="footer-link">Security Policy</a>
                    <a href="#" class="footer-link">Technical Support</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    © 2024 KitaDocs. All rights reserved.<br>
                    This is a system-generated email for admin account creation.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    sendEmail(
        Email,
        "🔐 Admin Account Created - KitaDocs Administrative Access",
        emailContent
    )

    return successHandle({ message: "Admin created successfully" }, reply, 201);
});

export const loginAdmin = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const Email = (request.body as any).Email as string;
    const password = (request.body as any).password as string;

    if (!Email || !password) {
        return errorHandle("Email and password are required", reply, 400);
    }

    const adminExists = await checkAdminexist(Email);
    if (typeof adminExists === "string") {
        return errorHandle(adminExists, reply, 500);
    }

    if (!adminExists.exists) {
        return errorHandle("Admin with this email does not exist", reply, 404);
    }


    if (adminExists?.admin?.isInitial) {
        if (adminExists?.admin?.password === password) {
            const token = generateToken(adminExists.admin.id);
            return successHandle({ 
                token, 
                message: "Login successful. Please change your password.", 
                role:adminExists.admin.role, 
                isInitial:adminExists.admin.isInitial
            }, reply, 200);
        }
    }else {
        if (!adminExists?.admin?.password) {
            return errorHandle("Invalid admin account", reply, 401);
        }
        const isPasswordValid = await bcrypt.compare(password, adminExists.admin.password);
        if (!isPasswordValid) {
            return errorHandle("Invalid password", reply, 401);
        }
        const token = generateToken(adminExists.admin.id);
        return successHandle({ 
            token, 
            message: "Login successful",
            role: adminExists.admin.role ,
            isInitial: adminExists.admin.isInitial
        }, reply, 200);
        
        
    }
});

export const changeAdminPassword = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, currentPassword, newPassword } = request.body as any;

    if (!email || !currentPassword || !newPassword) {
        return errorHandle("Email, old password, and new password are required", reply, 400);
    }

    const adminExists = await checkAdminexist(email);
    if (typeof adminExists === "string") {
        return errorHandle(adminExists, reply, 500);
    }

    if (!adminExists.exists) {
        return errorHandle("Admin with this email does not exist", reply, 404);
    }

    if (adminExists?.admin?.isInitial) {
        if (adminExists?.admin?.password === currentPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updatedAdmin = await changeAdminPass(email, hashedPassword);
            if (typeof updatedAdmin === "string") {
                return errorHandle(updatedAdmin, reply, 500);
            }
            return successHandle({ message: "Password changed successfully" }, reply, 200);
        }
    }

});

export const resetAdminPassword = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;

    if (!email) {
        return errorHandle("Email is required", reply, 400);
    }

    const adminExists = await checkAdminexist(email);
    if (typeof adminExists === "string") {
        return errorHandle(adminExists, reply, 500);
    }

    if (!adminExists.exists) {
        return errorHandle("Admin with this email does not exist", reply, 404);
    }

    if (adminExists?.admin?.email !== email) {
       return errorHandle("You are not authorized to reset this password", reply, 403);
    }

    const resetToken = generatePasswordResetToken(email);
    const resetLink = `http://localhost:3000/admin/reset-password?token=${resetToken}`;
    
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request - KitaDocs Admin</title>
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
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 50px;
                color: white;
                box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
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
                color: #ef4444;
                font-weight: 600;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .security-notice {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #ef4444;
                text-align: left;
            }
            .security-notice h3 {
                color: #dc2626;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .security-notice p {
                color: #991b1b;
                margin: 8px 0;
                font-weight: 500;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 20px 50px;
                text-decoration: none;
                border-radius: 30px;
                font-weight: 700;
                font-size: 18px;
                margin: 30px 0;
                transition: all 0.3s ease;
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .reset-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
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
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #3b82f6;
                text-align: left;
            }
            .token-info h3 {
                color: #1e40af;
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
                color: #3b82f6;
                margin-right: 12px;
                font-size: 16px;
                width: 20px;
            }
            .divider {
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, #ef4444 50%, transparent 100%);
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
                color: #ef4444;
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <h1>🏥 KitaDocs</h1>
                    <p class="header-subtitle">Administrative Security Center</p>
                </div>
            </div>
            
            <div class="content">
                <div class="security-icon">🔐</div>
                
                <h2 class="reset-title">Password Reset Request</h2>
                
                <p class="message">
                    We received a request to reset your <span class="highlight">admin account password</span>. 
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
                        <span class="token-icon">🛡️</span>
                        <span><strong>Security Level:</strong> Admin Access</span>
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
                
                <div class="warning-box">
                    <h4>⚠️ Important Security Notice</h4>
                    <p>• If you did not request this password reset, please ignore this email</p>
                    <p>• Contact our security team immediately if you suspect unauthorized access</p>
                    <p>• Never share your admin credentials with anyone</p>
                    <p>• Always use a strong, unique password for your admin account</p>
                </div>
                
                <p class="message">
                    <strong>Need Help?</strong> If you're having trouble with the reset process, 
                    contact our technical support team immediately.
                </p>
                
                <p style="color: #6b7280; font-size: 16px; margin-top: 30px;">
                    Security concerns? Contact us at <strong>security@kitadocs.com</strong>
                </p>
            </div>
            
            <div class="footer">
                <div class="footer-logo">KitaDocs Security</div>
                <p style="margin: 10px 0; color: #9ca3af;">Administrative Security Center</p>
                
                <div class="footer-links">
                    <a href="#" class="footer-link">Security Policy</a>
                    <a href="#" class="footer-link">Emergency Support</a>
                    <a href="#" class="footer-link">Account Help</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    © 2024 KitaDocs. All rights reserved.<br>
                    This is a security-sensitive email. Do not forward or share.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    await sendEmail(
        email,
        "🔐 Admin Password Reset Request - KitaDocs Security",
        emailContent
    ).catch((error) => {
        console.error("Error sending password reset email:", error);
    });

    return successHandle({ 
        message: "Password reset link sent to your email",
        note: "Please check your email and click the link within 15 minutes"
    }, reply, 200);
});

export const RestPassword = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const email = (request.body as any).email as string;
    const newPassword = (request.body as any).newPassword as string;

    if (!email || !newPassword) {
        return errorHandle("Email and new password are required", reply, 400);
    }

    const adminExists = await checkAdminexist(email);
    if (typeof adminExists === "string") {
        return errorHandle(adminExists, reply, 500);
    }
    if (!adminExists.exists) {
        return errorHandle("Admin with this email does not exist", reply, 404);
    }
    if (adminExists?.admin?.email !== email) {
        return errorHandle("You are not authorized to reset this password", reply, 403);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedAdmin = await changeAdminPass(email, hashedPassword);
    if (typeof updatedAdmin === "string") {
        return errorHandle(updatedAdmin, reply, 500);
    }else{
        console.log("Password reset successfully for admin:", email);
        return successHandle({ message: "Password reset successfully" }, reply, 200);
    }
})

