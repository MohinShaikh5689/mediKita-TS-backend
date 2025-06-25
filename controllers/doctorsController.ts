import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/asyncHandler.ts";
import { CreateDoctor, GetDoctors, GetDoctorById, ChangeDoctorVerificationStatus, checkEmailExists, getDoctorsPassword, getDoctorByEmail, checkVerificationStatus, changeDoctorPassword } from "../services/doctorsService.ts";
import supabase from "../utils/supabase.ts";
import { sendEmail } from "../utils/mail.ts";
import { generateToken, generatePasswordResetToken } from "../utils/generateToken.ts";
import crypto from "crypto";
import bcrypt from "bcryptjs";

interface Doctor {
    FullName: string;
    Email: string;
    Password: string;
    Credentials: string;
    Specialization: string[];
    CurrentInstitution: string;
    YearsOfExperience: number;
    Education: string;
    Certifications: string[];
    Awards: string[];
    Membership: string[];
    Publications: string[];
    LanguagesSpoken: string[];
    Bio: string;
    AreaOfInterest: string[];
    Links: string;
    LicenseId: string;
}

export const createDoctor = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    let doctor: Doctor;
    let fileUrls: string[] = [];
    let fileTypes: string[] = [];

    console.log("Creating doctor with request content type:", request.headers['content-type']);

    if (request.isMultipart()) {
        console.log("Processing multipart/form-data request");

        const parts = request.parts();
        let doctorData: any = {};

        for await (const part of parts) {
            console.log(`Processing part: ${part.fieldname}, type: ${part.type}`);

            if (part.type === 'file') {
                // Handle file upload - looking for 'uploadedDocuments' fieldname
                if (part.fieldname === 'uploadedDocuments') {
                    console.log(`Uploading file: ${part.filename}`);

                    const fileBuffer = await part.toBuffer();
                    const fileExt = part.filename?.split('.').pop() || 'unknown';
                    const fileName = `doctors-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    try {
                        // Upload to Supabase
                        const { error, data: uploadData } = await supabase.storage
                            .from('kitadocs')
                            .upload(fileName, fileBuffer, {
                                contentType: part.mimetype,
                                upsert: true
                            });

                        if (error) {
                            console.error('Supabase upload error:', error);
                            return errorHandle(`Error uploading file: ${error.message}`, reply, 500);
                        }

                        // Get public URL
                        const { data: publicUrlData } = supabase.storage
                            .from('kitadocs')
                            .getPublicUrl(fileName);

                        fileUrls.push(publicUrlData.publicUrl);
                        fileTypes.push(fileExt);

                        console.log(`File uploaded successfully: ${fileName} -> ${publicUrlData.publicUrl}`);
                    } catch (uploadError) {
                        console.error('File upload failed:', uploadError);
                        return errorHandle(`File upload failed: ${uploadError}`, reply, 500);
                    }
                }
            } else {
                // Handle form fields
                doctorData[part.fieldname] = part.value;
                console.log(`Field ${part.fieldname}: ${part.value}`);
            }
        }

        // Parse JSON fields safely
        const parseJsonField = (field: string): any[] => {
            try {
                if (!field || field.trim() === '') return [];
                const parsed = JSON.parse(field);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.error(`Error parsing JSON field: ${field}`, error);
                return [];
            }
        };

        // Build doctor object
        doctor = {
            FullName: doctorData.FullName || "",
            Email: doctorData.Email || "",
            Password: crypto.randomBytes(16).toString('hex'),
            Credentials: doctorData.Credentials || "",
            Specialization: parseJsonField(doctorData.Specialization),
            CurrentInstitution: doctorData.CurrentInstitution || "",
            YearsOfExperience: parseInt(doctorData.YearsOfExperience) || 0,
            Education: doctorData.Education || "",
            Certifications: parseJsonField(doctorData.Certifications),
            Awards: parseJsonField(doctorData.Awards),
            Membership: parseJsonField(doctorData.Membership),
            Publications: parseJsonField(doctorData.Publications),
            LanguagesSpoken: parseJsonField(doctorData.LanguagesSpoken),
            Bio: doctorData.Bio || "",
            AreaOfInterest: parseJsonField(doctorData.AreaOfInterest),
            Links: doctorData.Links || "",
            LicenseId: doctorData.LicenseId || "",
        };

        console.log("Parsed doctor data:", doctor);
        console.log("Files uploaded:", fileUrls.length);

        // Check if email already exists
        const emailCheck = await checkEmailExists(doctor.Email);
        if (typeof emailCheck === "string") {
            return errorHandle(emailCheck, reply, 500);
        }
        if (emailCheck) {
            return errorHandle("Doctor with this email already exists", reply, 400);
        }

    } else {
        // Handle regular JSON request (without files)
        console.log("Processing JSON request body");
        doctor = request.body as Doctor;
    }

    // Validate required fields
    if (!doctor.FullName || !doctor.Credentials || !doctor.Specialization?.length ||
        !doctor.CurrentInstitution || !doctor.YearsOfExperience || !doctor.Education || !doctor.LicenseId) {
        return errorHandle("Missing required fields", reply, 400);
    }

    try {
        // Create doctor with multiple file URLs
        const result = await CreateDoctor({
            ...doctor,
            documentUrls: fileUrls,
            documentTypes: fileTypes
        });

        if (typeof result === "string") {
            return errorHandle(result, reply, 500);
        }

        const registrationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to KitaDocs</title>
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
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
                    opacity: 0.3;
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
                .welcome-icon {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: 50%;
                    margin: 0 auto 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 50px;
                    color: white;
                    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .welcome-title {
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
                    color: #667eea;
                    font-weight: 600;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .info-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    text-align: left;
                    border-left: 5px solid #667eea;
                }
                .info-title {
                    color: #1f2937;
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0 0 20px 0;
                    display: flex;
                    align-items: center;
                }
                .info-item {
                    display: flex;
                    align-items: center;
                    margin: 15px 0;
                    padding: 8px 0;
                }
                .info-icon {
                    color: #667eea;
                    margin-right: 12px;
                    font-size: 18px;
                    width: 20px;
                }
                .documents-section {
                    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: left;
                    border-left: 5px solid #10b981;
                }
                .documents-title {
                    color: #059669;
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 15px 0;
                    display: flex;
                    align-items: center;
                }
                .document-item {
                    background: white;
                    padding: 12px;
                    margin: 8px 0;
                    border-radius: 8px;
                    border: 1px solid #d1fae5;
                    display: flex;
                    align-items: center;
                }
                .document-icon {
                    color: #10b981;
                    margin-right: 10px;
                    font-size: 16px;
                }
                .next-steps {
                    background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    border-left: 5px solid #f59e0b;
                }
                .next-steps h3 {
                    color: #92400e;
                    margin: 0 0 15px 0;
                    font-size: 18px;
                }
                .next-steps p {
                    color: #78350f;
                    margin: 8px 0;
                    font-weight: 500;
                }
                .status-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    color: #78350f;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 14px;
                    margin: 10px 0;
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
                    color: #667eea;
                }
                .divider {
                    height: 2px;
                    background: linear-gradient(90deg, transparent 0%, #667eea 50%, transparent 100%);
                    margin: 30px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-content">
                        <h1>🏥 KitaDocs</h1>
                        <p class="header-subtitle">Medical Professional Platform</p>
                    </div>
                </div>
                
                <div class="content">
                    <div class="welcome-icon">🎉</div>
                    
                    <h2 class="welcome-title">Welcome to KitaDocs, ${doctor.FullName}!</h2>
                    
                    <p class="message">
                        Thank you for joining our <span class="highlight">medical professional community</span>! 
                        Your registration has been successfully submitted and we're excited to have you on board.
                    </p>
                    
                    <div class="status-badge">
                        📋 Registration Status: Under Review
                    </div>
                    
                    <div class="info-card">
                        <h3 class="info-title">
                            📝 Your Registration Details
                        </h3>
                        <div class="info-item">
                            <span class="info-icon">👨‍⚕️</span>
                            <span><strong>Name:</strong> ${doctor.FullName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">🏥</span>
                            <span><strong>Institution:</strong> ${doctor.CurrentInstitution}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">🔬</span>
                            <span><strong>Specialization:</strong> ${doctor.Specialization.join(', ')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">📜</span>
                            <span><strong>Credentials:</strong> ${doctor.Credentials}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-icon">⏱️</span>
                            <span><strong>Experience:</strong> ${doctor.YearsOfExperience} years</span>
                        </div>
                    </div>

                    ${fileUrls.length > 0 ? `
                    <div class="documents-section">
                        <h3 class="documents-title">
                            📁 Uploaded Documents (${fileUrls.length})
                        </h3>
                        ${fileUrls.map((url, index) => `
                        <div class="document-item">
                            <span class="document-icon">📄</span>
                            <span><strong>Document ${index + 1}:</strong> ${fileTypes[index]?.toUpperCase() || 'Unknown'} file uploaded successfully</span>
                        </div>
                        `).join('')}
                        <p style="color: #059669; font-size: 14px; margin-top: 15px;">
                            ✅ All documents received and will be reviewed by our medical team
                        </p>
                    </div>
                    ` : ''}
                    
                    <div class="divider"></div>
                    
                    <div class="next-steps">
                        <h3>🚀 What Happens Next?</h3>
                        <p>📋 Our medical review team will verify your credentials and documents</p>
                        <p>⏰ Review typically takes 2-3 business days</p>
                        <p>📧 You'll receive an email notification once approved</p>
                        <p>🎯 Access to content creation tools upon verification</p>
                    </div>
                    
                    <p class="message">
                        Once verified, you'll be able to create educational content, connect with other medical professionals, 
                        and contribute to our growing knowledge base.
                    </p>
                    
                    <p style="color: #6b7280; font-size: 16px; margin-top: 40px;">
                        Have questions? Our support team is here to help!
                    </p>
                </div>
                
                <div class="footer">
                    <div class="footer-logo">KitaDocs</div>
                    <p style="margin: 10px 0; color: #9ca3af;">Building the future of medical education</p>
                    
                    <div class="footer-links">
                        <a href="#" class="footer-link">Help Center</a>
                        <a href="#" class="footer-link">Privacy Policy</a>
                        <a href="#" class="footer-link">Terms of Service</a>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                        © 2024 KitaDocs. All rights reserved.<br>
                        This email was sent automatically. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>`;

        sendEmail(
            doctor.Email,
            "🎉 Welcome to KitaDocs - Registration Successful!",
            registrationHtml
        ).catch((error) => {
            console.error("Error sending email:", error);
        });

        return successHandle({
            message: "Doctor created successfully",
            doctorId: result.id,
            filesUploaded: fileUrls.length,
            fileUrls: fileUrls
        }, reply, 201);

    } catch (error) {
        console.error("Error in createDoctor:", error);
        return errorHandle("Failed to create doctor", reply, 500);
    }
});

export const getDoctors = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const doctors = await GetDoctors();

    if (typeof doctors === "string") {
        return errorHandle(doctors, reply, 500);
    }

    if (!doctors || doctors.length === 0) {
        return errorHandle("No doctors found", reply, 404);
    }

    successHandle(doctors, reply, 200);
});

export const getDoctorById = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const doctorId = (request.params as { id: string }).id;

    if (!doctorId) {
        return errorHandle("Doctor ID is required", reply, 400);
    }

    const doctor = await GetDoctorById(doctorId);

    if (typeof doctor === "string") {
        return errorHandle(doctor, reply, 500);
    }

    if (!doctor) {
        return errorHandle("Doctor not found", reply, 404);
    }


    successHandle(doctor, reply, 200);
});

export const changeDoctorVerificationStatus = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, status, email } = request.body as { id: string; status: string; email: string };

    console.log("Changing doctor verification status:", id, status, email);

    if (!id || !status) {
        return errorHandle("Doctor ID and status are required", reply, 400);
    }

    let html: string;
    let subject: string;
    let doctorPassword: string | null = null;

    // Only get password if status is VERIFIED
    if (status === "VERIFIED") {
        const passwordResult = await getDoctorsPassword(email);
        console.log("Password result:", passwordResult);

        if (typeof passwordResult === "string") {
            return errorHandle(passwordResult, reply, 500);
        }
        if (!passwordResult?.is_Initial) {
            doctorPassword = null;
        } else {
            console.log("Doctor password found:", passwordResult.Password);
            doctorPassword = passwordResult.Password;
        }


    }

    if (status === "VERIFIED") {
        console.log("Doctor verification status is VERIFIED");
        subject = "🎉 Welcome to KitaDocs - Your Profile is Now Verified!";
        html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profile Verified</title>
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
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .success-icon {
                    width: 80px;
                    height: 80px;
                    background-color: #10b981;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    color: white;
                }
                .message {
                    font-size: 18px;
                    margin: 20px 0;
                    color: #555;
                }
                .highlight {
                    color: #10b981;
                    font-weight: 600;
                }
                .credentials-card {
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 5px solid #10b981;
                    text-align: left;
                }
                .credential-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 15px 0;
                    padding: 12px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }
                .credential-label {
                    color: #6b7280;
                    font-weight: 500;
                }
                .credential-value {
                    color: #1f2937;
                    font-weight: 600;
                    font-family: 'Courier New', monospace;
                    background: #f9fafb;
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .login-notice {
                    background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 5px solid #f59e0b;
                    text-align: left;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 20px;
                    transition: transform 0.2s;
                }
                .button:hover {
                    transform: translateY(-2px);
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #666;
                    border-top: 1px solid #e9ecef;
                }
                .features {
                    background-color: #f8f9fa;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                    text-align: left;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    margin: 10px 0;
                }
                .feature-icon {
                    color: #10b981;
                    margin-right: 10px;
                    font-size: 18px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 KitaDocs</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Medical Professional Platform</p>
                </div>
                
                <div class="content">
                    <div class="success-icon">✓</div>
                    
                    <h2 style="color: #10b981; margin: 0 0 20px 0;">Profile Successfully Verified!</h2>
                    
                    <p class="message">
                        Congratulations! Your medical professional profile has been <span class="highlight">successfully verified</span> 
                        and approved by our medical review team.
                    </p>
                    
                    ${doctorPassword != null ? `
                    <div class="credentials-card">
                        <h3 style="margin-top: 0; color: #333;">🔐 Your Login Credentials</h3>
                        <div class="credential-item">
                            <span class="credential-label">📧 Email:</span>
                            <span class="credential-value">${email}</span>
                        </div>
                        <div class="credential-item">
                            <span class="credential-label">🔑 Password:</span>
                            <span class="credential-value">${doctorPassword}</span>
                        </div>
                        <p style="color: #dc2626; font-weight: 600; margin-top: 15px; font-size: 14px;">
                            ⚠️ Please change your password after first login for security.
                        </p>
                    </div>
                    ` : `
                    <div class="login-notice">
                        <h3 style="margin-top: 0; color: #92400e;">🔐 Login Information</h3>
                        <p style="color: #78350f; margin: 0;">
                            You can now log in to your account using your existing credentials. 
                            Your password remains the same as you previously set.
                        </p>
                    </div>
                    `}
                    
                    <div class="features">
                        <h3 style="margin-top: 0; color: #333;">🚀 You now have access to:</h3>
                        <div class="feature-item">
                            <span class="feature-icon">📋</span>
                            <span>Create and manage medical content</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🎥</span>
                            <span>Generate educational videos & blogs</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">👥</span>
                            <span>Connect with other medical professionals</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <span>Access advanced analytics</span>
                        </div>
                    </div>
                    
                    <a href="http://localhost:3000/doctor/login" class="button">
                        🚀 Access Your Dashboard
                    </a>
                    
                    <p style="margin-top: 30px; font-size: 16px; color: #666;">
                        Welcome to the KitaDocs community! We're excited to have you on board.
                    </p>
                </div>
                
                <div class="footer">
                    <p><strong>KitaDocs Team</strong></p>
                    <p>📧 support@kitadocs.com | 🌐 www.kitadocs.com</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        This email was sent automatically. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>`;
    } else if (status === "REJECTED") {
        subject = "❌ Profile Verification Update - Action Required";
        html = `
        <!-- Your existing REJECTED email HTML -->
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profile Verification Update</title>
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
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .warning-icon {
                    width: 80px;
                    height: 80px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    color: white;
                }
                .message {
                    font-size: 18px;
                    margin: 20px 0;
                    color: #555;
                }
                .requirements {
                    background-color: #fef2f2;
                    border-left: 4px solid #ef4444;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: left;
                }
                .requirement-item {
                    display: flex;
                    align-items: center;
                    margin: 10px 0;
                }
                .requirement-icon {
                    color: #ef4444;
                    margin-right: 10px;
                    font-size: 16px;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 20px;
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #666;
                    border-top: 1px solid #e9ecef;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 KitaDocs</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Medical Professional Platform</p>
                </div>
                
                <div class="content">
                    <div class="warning-icon">!</div>
                    
                    <h2 style="color: #ef4444; margin: 0 0 20px 0;">Profile Verification Update</h2>
                    
                    <p class="message">
                        We regret to inform you that your profile verification could not be completed at this time. 
                        Our medical review team has identified some areas that need attention.
                    </p>
                    
                    <div class="requirements">
                        <h3 style="margin-top: 0; color: #333;">📋 Common Requirements:</h3>
                        <div class="requirement-item">
                            <span class="requirement-icon">•</span>
                            <span>Valid medical license documentation</span>
                        </div>
                        <div class="requirement-item">
                            <span class="requirement-icon">•</span>
                            <span>Clear professional headshot photo</span>
                        </div>
                        <div class="requirement-item">
                            <span class="requirement-icon">•</span>
                            <span>Complete education and certification details</span>
                        </div>
                        <div class="requirement-item">
                            <span class="requirement-icon">•</span>
                            <span>Accurate contact and institution information</span>
                        </div>
                    </div>
                    
                    <p style="color: #666; margin: 20px 0;">
                        Don't worry! You can update your profile and resubmit for verification at any time.
                    </p>
                    
                </div>
                
                <div class="footer">
                    <p><strong>KitaDocs Team</strong></p>
                    <p>📧 support@kitadocs.com | 🌐 www.kitadocs.com</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        Need help? Contact our support team for assistance.
                    </p>
                </div>
            </div>
        </body>
        </html>`;
    } else {
        subject = "⏳ Profile Under Review - KitaDocs";
        html = `
        <!-- Your existing PENDING email HTML -->
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profile Under Review</title>
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
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .pending-icon {
                    width: 80px;
                    height: 80px;
                    background-color: #f59e0b;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    color: white;
                }
                .message {
                    font-size: 18px;
                    margin: 20px 0;
                    color: #555;
                }
                .timeline {
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: left;
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #666;
                    border-top: 1px solid #e9ecef;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 KitaDocs</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Medical Professional Platform</p>
                </div>
                
                <div class="content">
                    <div class="pending-icon">⏳</div>
                    
                    <h2 style="color: #f59e0b; margin: 0 0 20px 0;">Profile Under Review</h2>
                    
                    <p class="message">
                        Thank you for your patience! Your medical professional profile is currently being reviewed by our team.
                    </p>
                    
                    <div class="timeline">
                        <h3 style="margin-top: 0; color: #333;">📅 Review Timeline:</h3>
                        <p><strong>Typical review time:</strong> 2-3 business days</p>
                        <p><strong>Current status:</strong> In progress</p>
                        <p><strong>Next update:</strong> Within 24 hours</p>
                    </div>
                    
                    <p style="color: #666; margin: 20px 0;">
                        We'll notify you immediately once the review is complete.
                    </p>
                </div>
                
                <div class="footer">
                    <p><strong>KitaDocs Team</strong></p>
                    <p>📧 support@kitadocs.com | 🌐 www.kitadocs.com</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        Questions about your review? Contact our support team.
                    </p>
                </div>
            </div>
        </body>
        </html>`;
    }

    const updatedDoctor = await ChangeDoctorVerificationStatus(id, status);

    if (typeof updatedDoctor === "string") {
        return errorHandle(updatedDoctor, reply, 500);
    }

    if (!updatedDoctor) {
        return errorHandle("Failed to update doctor verification status", reply, 500);
    }
    console.log(html);
    console.log("Sending email to:", email);
    sendEmail(
        email,
        subject,
        html
    ).catch((error) => {
        console.error("Error sending email:", error);
    });

    successHandle({ message: "Doctor verification status updated successfully" }, reply, 200);
});

export const loginDoctor = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
        return errorHandle("Email and password are required", reply, 400);
    }

    const checkVerification = await checkVerificationStatus(email);

    if (typeof checkVerification === "string") {
        return errorHandle(checkVerification, reply, 500);
    }

    if (checkVerification.verificationStatus === 'PENDING') {
        return errorHandle("Doctor profile is still under review", reply, 403);
    } else if (checkVerification.verificationStatus === 'REJECTED') {
        console.log('entered')
        return errorHandle("Doctor profile has been rejected", reply, 403);
    }

    const doctor = await getDoctorByEmail(email);

    if (typeof doctor === "string") {
        return errorHandle(doctor, reply, 500);
    }

    if (!doctor) {
        return errorHandle("Doctor not found", reply, 404);
    }

    if (doctor.is_Initial) {
        if (password !== doctor.Password) {
            return errorHandle("Invalid password", reply, 401);
        } else {
            const token = generateToken(doctor.id);
            return successHandle({ doctor, token }, reply, 200);
        }
    } else {
        if (!doctor.Password) {
            return errorHandle("Invalid email or password", reply, 401);
        }

        const isPasswordValid = await bcrypt.compare(password, doctor.Password);

        if (!isPasswordValid) {
            return errorHandle("Invalid email or password", reply, 401);
        } else {
            const token = generateToken(doctor.id);
            return successHandle({
                doctor: {
                    id: doctor.id,
                    FullName: doctor.FullName,
                    is_Initial: doctor.is_Initial
                }, token
            }, reply, 200);
        }
    }
});

export const changeDoctorPasswordController = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, newPassword, currentPassword } = request.body as { email: string; newPassword: string; currentPassword: string };

    if (!email || !newPassword || !currentPassword) {
        return errorHandle("Email, new password, and current password are required", reply, 400);
    }


    const checkDocotorExists = await getDoctorByEmail(email);
    if (typeof checkDocotorExists === "string") {
        return errorHandle(checkDocotorExists, reply, 500);
    }

    if (!checkDocotorExists) {
        return errorHandle("Doctor not found", reply, 404);
    }

    if (checkDocotorExists.is_Initial) {
        if (currentPassword !== checkDocotorExists.Password) {
            return errorHandle("Invalid current password", reply, 401);
        }
    } 

    const password = await bcrypt.hash(newPassword, 10);

    const result = await changeDoctorPassword(email, password);

    if (typeof result === "string") {
        return errorHandle(result, reply, 500);
    }

    successHandle({ message: "Password changed successfully" }, reply, 200);
});

export const resetDoctorPassword = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as any;
    if (!email) {
        return errorHandle("Email is required", reply, 400);
    }
    const doctor = await getDoctorByEmail(email);
    if (typeof doctor === "string") {
        return errorHandle(doctor, reply, 500);
    }
    if (!doctor) {
        return errorHandle("Doctor not found", reply, 404);
    }

    if(email !== doctor.Email) {
        return errorHandle("sorry you're not authorized to reset this password", reply, 400);
    }
    
    const resetToken = generatePasswordResetToken(email);
    const resetLink = `http://localhost:3000/doctor/reset-password?token=${resetToken}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request - KitaDocs Professional</title>
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 50px;
                color: white;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
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
                color: #667eea;
                font-weight: 600;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .security-notice {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #667eea;
                text-align: left;
            }
            .security-notice h3 {
                color: #4c51bf;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .security-notice p {
                color: #553c9a;
                margin: 8px 0;
                font-weight: 500;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px 50px;
                text-decoration: none;
                border-radius: 30px;
                font-weight: 700;
                font-size: 18px;
                margin: 30px 0;
                transition: all 0.3s ease;
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .reset-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
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
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
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
                background: linear-gradient(90deg, transparent 0%, #667eea 50%, transparent 100%);
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
                color: #667eea;
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
            .professional-box {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #0369a1;
                text-align: left;
            }
            .professional-box h3 {
                color: #0369a1;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .professional-item {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            .professional-icon {
                color: #0369a1;
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
                    <p class="header-subtitle">Medical Professional Platform</p>
                </div>
            </div>
            
            <div class="content">
                <div class="security-icon">🔐</div>
                
                <h2 class="reset-title">Password Reset Request</h2>
                
                <p class="message">
                    We received a request to reset your <span class="highlight">medical professional account password</span>. 
                    If you made this request, please click the button below to create a new password.
                </p>
                
                <div class="expiry-badge">
                    ⏰ Expires in 15 minutes
                </div>
                
                <div class="token-info">
                    <h3>🔑 Reset Instructions</h3>
                    <div class="token-item">
                        <span class="token-icon">👨‍⚕️</span>
                        <span><strong>Professional Account:</strong> ${email}</span>
                    </div>
                    <div class="token-item">
                        <span class="token-icon">⏰</span>
                        <span><strong>Requested:</strong> ${new Date().toLocaleString()}</span>
                    </div>
                    <div class="token-item">
                        <span class="token-icon">🩺</span>
                        <span><strong>Account Type:</strong> Medical Professional</span>
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
                
                <div class="professional-box">
                    <h3>🌟 What You Can Do After Reset</h3>
                    <div class="professional-item">
                        <span class="professional-icon">📚</span>
                        <span>Create educational medical content and articles</span>
                    </div>
                    <div class="professional-item">
                        <span class="professional-icon">🎥</span>
                        <span>Generate medical videos and educational materials</span>
                    </div>
                    <div class="professional-item">
                        <span class="professional-icon">👥</span>
                        <span>Connect with other verified medical professionals</span>
                    </div>
                    <div class="professional-item">
                        <span class="professional-icon">📊</span>
                        <span>Access advanced analytics and insights</span>
                    </div>
                    <div class="professional-item">
                        <span class="professional-icon">🏆</span>
                        <span>Manage your professional profile and credentials</span>
                    </div>
                </div>
                
                <div class="warning-box">
                    <h4>⚠️ Security Notice</h4>
                    <p>• If you did not request this password reset, please ignore this email</p>
                    <p>• Contact our support team if you suspect unauthorized access</p>
                    <p>• Never share your login credentials with anyone</p>
                    <p>• Use a strong, unique password for your professional account</p>
                    <p>• Consider enabling two-factor authentication for added security</p>
                </div>
                
                <p class="message">
                    <strong>Need Help?</strong> If you're having trouble with the reset process, 
                    our medical support team is here to assist you with your professional account.
                </p>
                
                <p style="color: #6b7280; font-size: 16px; margin-top: 30px;">
                    Professional support? Contact us at <strong>medical-support@kitadocs.com</strong>
                </p>
            </div>
            
            <div class="footer">
                <div class="footer-logo">KitaDocs Professional</div>
                <p style="margin: 10px 0; color: #9ca3af;">Your Trusted Medical Professional Platform</p>
                
                <div class="footer-links">
                    <a href="#" class="footer-link">Professional Help</a>
                    <a href="#" class="footer-link">Privacy Policy</a>
                    <a href="#" class="footer-link">Medical Support</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    © 2024 KitaDocs. All rights reserved.<br>
                    Advancing medical education through technology.
                </p>
            </div>
        </div>
    </body>
    </html>`;

    await sendEmail(
        email,
        "🔐 Password Reset Request - KitaDocs Professional",
        html
    ).catch((error) => {
        console.error("Error sending password reset email:", error);
    });

    return successHandle({ 
        message: "Password reset link sent to your email",
        note: "Please check your email and click the link within 15 minutes"
    }, reply, 200);
});

export const ResetPass = asyncHandle(async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, newPassword } = request.body as { email: string; newPassword: string; currentPassword: string };

    if (!email || !newPassword ) {
        return errorHandle("Email and new password are required", reply, 400);
    }


    const checkDocotorExists = await getDoctorByEmail(email);
    if (typeof checkDocotorExists === "string") {
        return errorHandle(checkDocotorExists, reply, 500);
    }

    if (!checkDocotorExists) {
        return errorHandle("Doctor not found", reply, 404);
    }

    const password = await bcrypt.hash(newPassword, 10);

    const result = await changeDoctorPassword(email, password);

    if (typeof result === "string") {
        return errorHandle(result, reply, 500);
    }

    successHandle({ message: "Password changed successfully" }, reply, 200);
}); 