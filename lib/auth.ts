import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    // NO usar PrismaAdapter con strategy:"jwt" + CredentialsProvider — combinación inválida
    providers: [
        CredentialsProvider({
            name: "Student Name",
            credentials: {
                name: { label: "Nombre", type: "text", placeholder: "Tu nombre (ej. Sofia)" },
                classCode: { label: "Código de Clase", type: "text", placeholder: "Ej. X7P9K" },
                studentCode: { label: "Código Secreto", type: "text", placeholder: "Ej. DA8AXE" },
                password: { label: "Contraseña", type: "password" },
                loginRole: { label: "Role", type: "text" }
            },
            async authorize(credentials) {
                const { name, classCode, studentCode, password, loginRole } = credentials as any;
                if (!name) return null;

                let user;

                if (loginRole === 'STUDENT') {
                    const whereClause: any = {
                        name: { equals: name.trim(), mode: 'insensitive' },
                        studentCode: studentCode ? studentCode.trim().toUpperCase() : '',
                        role: 'STUDENT'
                    };

                    if (classCode && classCode.trim() !== '') {
                        const classroom = await prisma.classroom.findUnique({
                            where: { accessCode: classCode.trim().toUpperCase() }
                        });
                        if (classroom) {
                            whereClause.classroomId = classroom.id;
                        }
                    }

                    user = await prisma.user.findFirst({ where: whereClause });

                } else if (loginRole === 'TEACHER' || loginRole === 'PARENT') {
                    if (!password) return null;

                    const candidate = await prisma.user.findFirst({
                        where: {
                            name: { equals: name.trim(), mode: 'insensitive' },
                            role: loginRole === 'TEACHER' ? { in: ['TEACHER', 'SUPERADMIN'] } : 'PARENT'
                        }
                    });

                    if (!candidate || !candidate.password) return null;

                    // Soporte para contraseñas hasheadas (bcrypt) y texto plano legacy
                    let passwordValid = false;
                    if (candidate.password.startsWith('$2')) {
                        // Contraseña hasheada con bcrypt
                        passwordValid = await bcrypt.compare(password.trim(), candidate.password);
                    } else {
                        // Legacy: comparación directa (migrar a bcrypt al próximo login)
                        passwordValid = candidate.password === password.trim();
                        if (passwordValid) {
                            // Migrar automáticamente a bcrypt
                            const hashed = await bcrypt.hash(password.trim(), 10);
                            await prisma.user.update({
                                where: { id: candidate.id },
                                data: { password: hashed }
                            });
                        }
                    }

                    if (!passwordValid) return null;
                    user = candidate;
                }

                if (user) {
                    const sessionToken = crypto.randomUUID();
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { activeSessionToken: sessionToken }
                    });
                    return { ...user, activeSessionToken: sessionToken } as any;
                } else {
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.schoolId = (user as any).schoolId;
                token.sessionToken = (user as any).activeSessionToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).schoolId = token.schoolId as string | undefined;
                (session.user as any).sessionToken = token.sessionToken as string | undefined;
            }
            return session;
        }
    },
    pages: {
        signIn: '/',
    },
    debug: process.env.NODE_ENV === "development",
};
