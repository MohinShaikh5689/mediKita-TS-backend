import { asyncHandle, errorHandle, successHandle } from "../utils/asyncHandler.ts";
import { generateFormData, checkFormForDoctorExists, getFormbyDoctorId, getAllForms, changeQuestionStatus, submitForm } from "../services/FormService.ts";
import type { FastifyRequest, FastifyReply } from "fastify";
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from "../utils/mail.ts";
import { GetDoctorById } from "../services/doctorsService.ts";

export const generateForm = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const experience = (req.body as any).experience;
    const Specialization = (req.body as any).Specialization;
    const email = (req.body as any).email;
    const id = (req.body as any).id;

    const check = await checkFormForDoctorExists(id);

    if (typeof check === "string") {
        return errorHandle(check, res, 500);
    }
    if (check) {
        return errorHandle("Form already exists for this doctor", res, 400);
    }

    const Formid = uuidv4();
    const client = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });


    const promptContent = `You are a medical board examiner creating a challenging knowledge assessment for a ${Specialization} specialist with ${experience} years of experience. Create tough, clinical questions that TEST their actual medical knowledge and expertise.

Generate questions that:
- Test deep clinical knowledge and decision-making
- Present complex case scenarios requiring expert analysis
- Challenge their diagnostic and treatment skills
- Assess their knowledge of latest medical research and guidelines
- Test their ability to handle complicated medical situations
- Include differential diagnosis questions
- Ask about drug interactions, contraindications, and complications
- Test their knowledge of rare conditions and atypical presentations

Make these questions DIFFICULT - the kind that would challenge even experienced specialists. These are NOT patient education questions - these are medical expertise tests.

You MUST respond with ONLY valid JSON in this exact format:
{
      "questions": [
        {
          "question": "A 45-year-old patient presents with chest pain. ECG shows ST elevation in leads II, III, aVF. However, echocardiogram shows regional wall motion abnormalities in the anterior wall. Troponin is elevated. What is your differential diagnosis and immediate management plan?",
        }
      ]
    
}

Generate 15-20 CHALLENGING questions specific to ${Specialization}. Make them progressively harder. Test real medical knowledge, not soft skills.

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.`;

    const prompt = await client.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'You are a medical examiner. Respond with ONLY valid JSON. No additional text before or after the JSON.'
            },
            {
                role: 'user',
                content: promptContent
            }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 4000
    });

    const response = prompt.choices[0].message.content;


    if (!response) {
        return errorHandle("Failed to generate form data", res, 500);
    }

    try {
        // Clean the response to ensure it's valid JSON
        const cleanedResponse = response.trim();
        let jsonResponse;

        // Try to extract JSON if there's extra text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonResponse = JSON.parse(jsonMatch[0]);
        } else {
            jsonResponse = JSON.parse(cleanedResponse);
        }

        const formData = await generateFormData({
            questions: jsonResponse.questions,
            id,
            Formid
        });

        if (!formData) {
            return errorHandle("Failed to save form data", res, 500);
        } else if (typeof formData === "string") {
            return errorHandle(formData, res, 500);
        } else {
            // Send email notification to the doctor
            const emailContent = `
                   <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Assessment Form - KitaDocs</title>
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
                    .form-icon {
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
                    .form-title {
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
                        border-left: 5px solid #3b82f6;
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
                        color: #3b82f6;
                        margin-right: 12px;
                        font-size: 18px;
                        width: 20px;
                    }
                    .assessment-details {
                        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                        border-radius: 12px;
                        padding: 25px;
                        margin: 30px 0;
                        border-left: 5px solid #3b82f6;
                    }
                    .assessment-details h3 {
                        color: #1e40af;
                        margin: 0 0 15px 0;
                        font-size: 18px;
                    }
                    .assessment-details p {
                        color: #1e3a8a;
                        margin: 8px 0;
                        font-weight: 500;
                    }
                    .cta-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        color: white;
                        padding: 18px 40px;
                        text-decoration: none;
                        border-radius: 30px;
                        font-weight: 600;
                        font-size: 16px;
                        margin: 30px 0;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                    }
                    .cta-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
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
                    .urgency-badge {
                        display: inline-block;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        padding: 8px 20px;
                        border-radius: 20px;
                        font-weight: 600;
                        font-size: 14px;
                        margin: 15px 0;
                        animation: glow 2s ease-in-out infinite alternate;
                    }
                    @keyframes glow {
                        from { box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
                        to { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
                    }
                    .question-count {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 25px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="header-content">
                            <h1>🏥 KitaDocs</h1>
                            <p class="header-subtitle">Medical Professional Assessment Platform</p>
                        </div>
                    </div>
                    
                    <div class="content">
                        <div class="form-icon">📋</div>
                        
                        <h2 class="form-title">New Assessment Form Ready!</h2>
                        
                        <p class="message">
                            Your personalized <span class="highlight">${Specialization} assessment form</span> 
                            has been generated and is ready for completion.
                        </p>
                        
                        <div class="urgency-badge">
                            ⚡ Action Required
                        </div>
                        
                        <div class="assessment-details">
                            <h3>📊 Assessment Details</h3>
                            <p><strong>Specialization:</strong> ${Specialization}</p>
                            <p><strong>Experience Level:</strong> ${experience} years</p>
                            <p><strong>Questions:</strong> ${jsonResponse.questions.length} challenging scenarios</p>
                            <p><strong>Estimated Time:</strong> 45-60 minutes</p>
                            <p><strong>Difficulty:</strong> Expert Level</p>
                        </div>
                        
                        <div class="question-count">
                            ${jsonResponse.questions.length} Expert-Level Questions
                        </div>
                        
                        <div class="info-card">
                            <h3 class="info-title">
                                🎯 What to Expect
                            </h3>
                            <div class="info-item">
                                <span class="info-icon">🧠</span>
                                <span>Complex clinical scenarios requiring deep expertise</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">🔬</span>
                                <span>Differential diagnosis challenges</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">💊</span>
                                <span>Drug interactions and contraindications</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">📚</span>
                                <span>Latest medical research and guidelines</span>
                            </div>
                            <div class="info-item">
                                <span class="info-icon">⚕️</span>
                                <span>Rare conditions and atypical presentations</span>
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <a href="http://localhost:3000/doctor/form/${id}" class="cta-button">
                            🚀 Start Assessment Now
                        </a>
                        
                        <p class="message">
                            <strong>Note:</strong> This assessment is designed to showcase your expertise and will be used 
                            to create educational content for the medical community.
                        </p>
                        
                        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                            <h4 style="color: #92400e; margin: 0 0 10px 0;">⏰ Important Reminders:</h4>
                            <p style="color: #78350f; margin: 5px 0;">• Complete the assessment within 7 days</p>
                            <p style="color: #78350f; margin: 5px 0;">• Provide detailed clinical reasoning</p>
                            <p style="color: #78350f; margin: 5px 0;">• Your responses will be reviewed by our medical board</p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 16px; margin-top: 30px;">
                            Questions? Contact our medical team at <strong>medical@kitadocs.com</strong>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">KitaDocs</div>
                        <p style="margin: 10px 0; color: #9ca3af;">Advancing Medical Education Through Expert Assessment</p>
                        
                        <div class="footer-links">
                            <a href="#" class="footer-link">Assessment Guidelines</a>
                            <a href="#" class="footer-link">Support Center</a>
                            <a href="#" class="footer-link">Medical Board</a>
                        </div>
                        
                        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                            © 2024 KitaDocs. All rights reserved.<br>
                        </p>
                    </div>
                </div>
            </body>
            </html>`;

            await sendEmail(
                email,
                "New Form Generated",
                emailContent
            );
            return successHandle({ formData }, res, 200,)
        }


    } catch (parseError) {

        return errorHandle("Failed to generate valid form structure", res, 500);
    }
});

export const getForm = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const formId = (req.params as any).formId;

    if (!formId) {
        return errorHandle("Form ID is required", res, 400);
    }

    const form = await getFormbyDoctorId(formId);

    if (!form) {
        return errorHandle("Form not found", res, 404);
    }
    if (typeof form === "string") {
        return errorHandle(form, res, 500);
    }

    return successHandle({ form }, res, 200);
});

export const getAllFormsController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {

    const forms = await getAllForms();

    if (!forms) {
        return errorHandle("No forms found", res, 404);
    }
    if (typeof forms === "string") {
        return errorHandle(forms, res, 500);
    }

    return successHandle({ forms }, res, 200);

});

export const changeQuestionStatusController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { questionId, status } = req.body as { formId: string; questionId: string; status: string };

    if (!questionId || !status) {
        return errorHandle("Form ID, Question ID, and Status are required", res, 400);
    }


    const updatedForm = await changeQuestionStatus(questionId, status);

    if (typeof updatedForm === "string") {
        return errorHandle(updatedForm, res, 500);
    }

    if (!updatedForm) {
        return errorHandle("Failed to update question status", res, 500);
    }

    return successHandle({ updatedForm }, res, 200);

});

export const SubmitForm = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { formId, DoctorId } = req.body as { 
        formId: string; 
        DoctorId: string; 
    };

    const doctor = await GetDoctorById(DoctorId);

    if(typeof doctor === "string"){
        return errorHandle(doctor, res, 500);
    }

    if (!doctor) {
        return errorHandle("Doctor not found", res, 404);
    }
    
    if (!formId) {
        return errorHandle("Form ID is required", res, 400);
    }

    const submissionResult = await submitForm(formId);
    if (typeof submissionResult === "string") {
        return errorHandle(submissionResult, res, 500);
    }
    if (!submissionResult) {
        return errorHandle("Failed to submit form", res, 500);
    }

    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assessment Completed - Schedule Interview</title>
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
            .success-icon {
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
            .success-title {
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
                color: #10b981;
                font-weight: 600;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .completion-card {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                text-align: left;
                border-left: 5px solid #10b981;
            }
            .completion-title {
                color: #1f2937;
                font-size: 20px;
                font-weight: 600;
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
            }
            .completion-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 8px 0;
            }
            .completion-icon {
                color: #10b981;
                margin-right: 12px;
                font-size: 18px;
                width: 20px;
            }
            .next-steps {
                background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
                border-radius: 12px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #f59e0b;
                text-align: left;
            }
            .next-steps h3 {
                color: #92400e;
                margin: 0 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            .next-steps p {
                color: #78350f;
                margin: 8px 0;
                font-weight: 500;
            }
            .interview-card {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                border-left: 5px solid #3b82f6;
                text-align: left;
            }
            .interview-card h3 {
                color: #1e40af;
                margin: 0 0 15px 0;
                font-size: 20px;
                display: flex;
                align-items: center;
            }
            .interview-item {
                display: flex;
                align-items: center;
                margin: 12px 0;
                padding: 8px 0;
            }
            .interview-icon {
                color: #3b82f6;
                margin-right: 12px;
                font-size: 16px;
                width: 20px;
            }
            .calendly-button {
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
            .calendly-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
            }
            .urgency-badge {
                display: inline-block;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 10px 25px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
                margin: 15px 0;
                animation: glow 2s ease-in-out infinite alternate;
                text-transform: uppercase;
            }
            @keyframes glow {
                from { box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
                to { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
            }
            .divider {
                height: 2px;
                background: linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%);
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
                color: #10b981;
            }
            .celebration-emoji {
                font-size: 24px;
                margin: 0 5px;
                animation: bounce 1s ease-in-out infinite;
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <h1>🏥 KitaDocs</h1>
                    <p class="header-subtitle">Medical Professional Assessment Platform</p>
                </div>
            </div>
            
            <div class="content">
                <div class="success-icon">✅</div>
                
                <h2 class="success-title">
                    Assessment Successfully Completed!
                    <span class="celebration-emoji">🎉</span>
                    <span class="celebration-emoji">🎊</span>
                </h2>
                
                <p class="message">
                    Congratulations, <span class="highlight">${doctor.FullName || 'Doctor'}</span>! 
                    Your <strong>medical assessment</strong> has been successfully submitted 
                    and is now under review by our medical board.
                </p>
                
                <div class="completion-card">
                    <h3 class="completion-title">
                        ✅ Assessment Summary
                    </h3>
                    <div class="completion-item">
                        <span class="completion-icon">📋</span>
                        <span><strong>Status:</strong> Successfully Submitted</span>
                    </div>
                    <div class="completion-item">
                        <span class="completion-icon">⏰</span>
                        <span><strong>Submission Time:</strong> ${new Date().toLocaleString()}</span>
                    </div>
                    <div class="completion-item">
                        <span class="completion-icon">🔬</span>
                        <span><strong>Specialization:</strong> Medical Assessment</span>
                    </div>
                    <div class="completion-item">
                        <span class="completion-icon">📊</span>
                        <span><strong>Review Status:</strong> Pending Medical Board Review</span>
                    </div>
                </div>
                
                <div class="urgency-badge">
                    ⚡ Next Step Required
                </div>
                
                <div class="next-steps">
                    <h3>🚀 What Happens Next?</h3>
                    <p>📝 Your responses are being reviewed by our medical experts</p>
                    <p>🎯 An interview will help us understand your clinical approach</p>
                    <p>💼 This interview is the final step in our assessment process</p>
                    <p>⏰ Please schedule your interview within the next 3 days</p>
                </div>
                
                <div class="interview-card">
                    <h3>🎤 Schedule Your Medical Interview</h3>
                    <div class="interview-item">
                        <span class="interview-icon">⏱️</span>
                        <span><strong>Duration:</strong> 30 minutes</span>
                    </div>
                    <div class="interview-item">
                        <span class="interview-icon">🎯</span>
                        <span><strong>Format:</strong> Video call discussion</span>
                    </div>
                    <div class="interview-item">
                        <span class="interview-icon">🔬</span>
                        <span><strong>Focus:</strong> Clinical reasoning and expertise validation</span>
                    </div>
                    <div class="interview-item">
                        <span class="interview-icon">📅</span>
                        <span><strong>Availability:</strong> Multiple time slots available</span>
                    </div>
                    <div class="interview-item">
                        <span class="interview-icon">👨‍⚕️</span>
                        <span><strong>Interviewer:</strong> Senior medical board member</span>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <a href="https://calendly.com/launchmage-tech/30min?back=1" class="calendly-button" target="_blank">
                    📅 Schedule Interview Now
                </a>
                
                <p class="message">
                    <strong>Important:</strong> The interview is a friendly discussion about your clinical approach 
                    and expertise. It's designed to showcase your knowledge and validate your assessment responses.
                </p>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h4 style="color: #1e40af; margin: 0 0 10px 0;">💡 Interview Preparation Tips:</h4>
                    <p style="color: #1e3a8a; margin: 5px 0;">• Review your assessment responses</p>
                    <p style="color: #1e3a8a; margin: 5px 0;">• Prepare to discuss your clinical reasoning</p>
                    <p style="color: #1e3a8a; margin: 5px 0;">• Have examples of challenging cases ready</p>
                    <p style="color: #1e3a8a; margin: 5px 0;">• Ensure stable internet connection for video call</p>
                </div>
                
               
            </div>
            
            <div class="footer">
                <div class="footer-logo">KitaDocs</div>
                <p style="margin: 10px 0; color: #9ca3af;">Advancing Medical Education Through Expert Validation</p>
                
                <div class="footer-links">
                    <a href="#" class="footer-link">Interview Guidelines</a>
                    <a href="#" class="footer-link">Support Center</a>
                    <a href="#" class="footer-link">Medical Board</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    © 2024 KitaDocs. All rights reserved.<br>
                    Form ID: ${formId}
                </p>
            </div>
        </div>
    </body>
    </html>`;

    await sendEmail(
        doctor.Email ,
        "🎉 Assessment Completed - Schedule Your Interview | KitaDocs",
        emailContent
    ).catch((error) => {
        console.error("Error sending form submission email:", error);
    });

    return successHandle({ 
        message: "Form submitted successfully",
    }, res, 200);
});