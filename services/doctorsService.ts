import { PrismaClient, VerificationStatus } from "../generated/prisma/index.js";
const prisma = new PrismaClient();


interface DoctorData {
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
    documentUrls?: string[];
    documentTypes?: string[];
}

export const CreateDoctor = async (doctorData: DoctorData) => {
    try {
        console.log("Creating doctor:", doctorData);


        const doctor = await prisma.doctors.create({
            data: {
                FullName: doctorData.FullName,
                Email: doctorData.Email,
                Password: doctorData.Password,
                Credentials: doctorData.Credentials,
                Specialization: doctorData.Specialization,
                CurrentInstitution: doctorData.CurrentInstitution,
                YearsOfExperience: doctorData.YearsOfExperience,
                Education: doctorData.Education,
                Certifications: doctorData.Certifications,
                Awards: doctorData.Awards,
                Membership: doctorData.Membership,
                Publications: doctorData.Publications,
                LanguagesSpoken: doctorData.LanguagesSpoken,
                Bio: doctorData.Bio,
                AreaOfInterest: doctorData.AreaOfInterest,
                Links: doctorData.Links,
                LicenseId: doctorData.LicenseId,
            }
        });

        // If document URLs are provided, create multiple document records
        if (doctorData.documentUrls && doctorData.documentUrls.length > 0) {
            const documentPromises = doctorData.documentUrls.map((url, index) => {
                return prisma.doctorDocument.create({
                    data: {
                        documentUrl: url,
                        documentType: doctorData.documentTypes?.[index] || 'verification_document',
                        doctorId: doctor.id
                    }
                });
            });

            await Promise.all(documentPromises);
            console.log(`Created ${doctorData.documentUrls.length} document records for doctor ${doctor.id}`);
        }

        return doctor;
    } catch (error) {
        console.error("Error creating doctor:", error);
        return "Failed to create doctor";
    }
};

export const GetDoctors = async () => {
    try {
        const doctors = await prisma.doctors.findMany({
            select: {
                id: true,
                FullName: true,
                Credentials: true,
                Specialization: true,
                Education: true,
                verificationStatus: true,
            },
        });

        if (!doctors || doctors.length === 0) {
            return "No doctors found";
        }

        return doctors;
    } catch (error) {
        console.error("Error fetching doctors:", error);
        return "Failed to fetch doctors";
    }
};

export const GetDoctorById = async (id: string) => {
    try {
        const doctor = await prisma.doctors.findUnique({
            where: { id },
            select: {
                id: true,
                FullName: true,
                Email: true,
                Credentials: true,
                Specialization: true,
                CurrentInstitution: true,
                YearsOfExperience: true,
                Education: true,
                Certifications: true,
                Awards: true,
                Membership: true,
                Publications: true,
                LanguagesSpoken: true,
                Bio: true,
                AreaOfInterest: true,
                Links: true,
                LicenseId: true,
                verificationStatus: true,
                DoctorDocument: {
                    select: {
                        documentUrl: true,
                        documentType: true,
                    }
                }
            }
        });

        if (!doctor) {
            return "Doctor not found";
        }

        return doctor;
    } catch (error) {
        console.error("Error fetching doctor by ID:", error);
        return "Failed to fetch doctor";
    }
};

export const ChangeDoctorVerificationStatus = async (id: string, status: string) => {
    try {
        // Check if doctor exists first
        const doctor = await prisma.doctors.findUnique({
            where: { id }
        });

        if (!doctor) {
            return "Doctor not found";
        }

        const updatedDoctor = await prisma.doctors.update({
            where: { id },
            data: { verificationStatus: status as VerificationStatus }
        });

        return updatedDoctor;
    } catch (error) {
        console.error("Error updating doctor verification status:", error);
        return "Failed to update doctor verification status";
    }
};

export const checkEmailExists = async (email: string) => {
    try {
        const doctor = await prisma.doctors.findUnique({
            where: { Email: email }
        });

        return doctor !== null; // Returns true if email exists, false otherwise
    } catch (error) {
        console.error("Error checking email existence:", error);
        return "Error checking email existence";
    }
}

export const getDoctorsPassword = async (email: string) => {
    try {
        const doctor = await prisma.doctors.findUnique({
            where: { Email: email },
            select: {
                is_Initial: true,
                Password: true
            }
        });

        if (!doctor) {
            return "Doctor not found";
        }
        console.log("Doctor found:", doctor);

        return doctor;
    } catch (error) {
        console.error("Error fetching doctor's password:", error);
        return "Failed to fetch doctor's password";
    }
}

export const checkVerificationStatus = async (email: string) => {
    try {
        const doctor = await prisma.doctors.findUnique({
            where: { Email: email },
            select: {
                verificationStatus: true
            }
        });

        if (!doctor) {
            return "Doctor not found";
        }

        return doctor;
    } catch (error) {
        console.error("Error checking verification status:", error);
        return "Failed to check verification status";
    }
}

export const getDoctorByEmail = async (email: string) => {
    try {
        const doctor = await prisma.doctors.findUnique({
            where: { Email: email },
            select:{
                id: true,
                FullName: true,
                Email: true,
                Password: true,
                is_Initial: true,
            }
        });

        if (!doctor) {
            return "Doctor not found";
        }

        return doctor;
    } catch (error) {
        console.error("Error fetching doctor by email:", error);
        return "Failed to fetch doctor";
    }
}

export const changeDoctorPassword = async (email: string, newPassword: string) => {
    try {
        const updatedDoctor = await prisma.doctors.update({
            where: { Email: email },
            data: {
                Password: newPassword,
                is_Initial: false // Set is_Initial to false after password change
            }
        });

        return updatedDoctor;
    } catch (error) {
        console.error("Error changing doctor's password:", error);
        return "Failed to change doctor's password";
    }
}