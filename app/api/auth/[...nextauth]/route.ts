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
                name: { label: "Nombre", type: "text", placeholder: "Tu nombre (ej. Sofia)" }
            },
            async authorize(credentials) {
                if (!credentials?.name) return null;

                // In a real app we'd verify a password here.
                // For this classroom app, we're just matching the pre-seeded names.
                const user = await prisma.user.findFirst({
                    where: {
                        name: {
                            equals: credentials.name,
                            mode: 'insensitive'
                        }
                    }
                });

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
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
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
