import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Student Name",
            credentials: {
                name: { label: "Nombre", type: "text", placeholder: "Tu nombre (ej. Sofia)" },
                accessCode: { label: "Código de Clase", type: "text", placeholder: "Ej. X7P9K (Opcional para Maestros)" }
            },
            async authorize(credentials) {
                const { name, accessCode } = credentials as any;
                if (!name) return null;

                let user;

                if (accessCode && accessCode.trim() !== '') {
                    // Student login requires a valid class code
                    const classroom = await prisma.classroom.findUnique({
                        where: { accessCode: accessCode.trim().toUpperCase() }
                    });

                    if (!classroom) return null; // Invalid code

                    user = await prisma.user.findFirst({
                        where: {
                            name: { equals: name.trim(), mode: 'insensitive' },
                            classroomId: classroom.id,
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
                    // Any object returned will be saved in `user` property of the JWT
                    return user as any;
                } else {
                    // If you return null then an error will be displayed advising the user to check their details.
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
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).schoolId = token.schoolId as string | undefined;
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
