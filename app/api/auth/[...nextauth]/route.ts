import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Student Name",
            credentials: {
                name: { label: "Nombre", type: "text", placeholder: "Tu nombre (ej. Sofia)" },
                studentCode: { label: "Código Secreto", type: "text", placeholder: "Ej. X7P9K (Opcional para Maestros)" }
            },
            async authorize(credentials) {
                const { name, studentCode } = credentials as any;
                if (!name) return null;

                let user;

                if (studentCode && studentCode.trim() !== '') {
                    // Student login requires a valid unique student code + exact matched name
                    user = await prisma.user.findFirst({
                        where: {
                            name: { equals: name.trim(), mode: 'insensitive' },
                            studentCode: studentCode.trim().toUpperCase(),
                            role: 'STUDENT'
                        }
                    });
                } else {
                    // Teacher or Superadmin login (they don't use class codes currently)
                    user = await prisma.user.findFirst({
                        where: {
                            name: { equals: name.trim(), mode: 'insensitive' },
                            role: { in: ['TEACHER', 'SUPERADMIN'] }
                        }
                    });
                }

                if (user) {
                    // Generate a unique session token for single-device enforcement
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
