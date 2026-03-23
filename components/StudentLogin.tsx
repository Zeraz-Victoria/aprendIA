"use client";

import React, { useState } from "react";
import { User, ArrowRight, BookOpen } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useLearning } from "@/contexts/LearningContext";

export default function StudentLogin() {
    const { login } = useLearning();
    const [name, setName] = useState("");
    const [studentCode, setStudentCode] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Sign out any previous session first
        await signOut({ redirect: false });

        const res = await signIn("credentials", {
            name,
            studentCode,
            redirect: false,
        });

        if (res?.error) {
            setError("Credenciales incorrectas. Verifica tu nombre o pide tu código secreto a tu profesor.");
        } else {
            setError("");
        }
    };

    return (
        <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-teal-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                        <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">¡Bienvenido a la Aventura!</h1>
                    <p className="text-teal-200">Ingresa a tu cuenta para continuar tu viaje.</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Tu Nombre de Aventura
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium text-slate-800"
                                    placeholder="Ej. Sofia"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Tu Código Secreto (6 letras)
                            </label>
                            <div className="relative">
                                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium text-slate-800 uppercase tracking-widest"
                                    placeholder="Ej. X7P9K2"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            Comenzar Aventura <ArrowRight className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            <p className="text-xs text-slate-400">
                                Pide ayuda a tu profesor si olvidaste tu código.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
