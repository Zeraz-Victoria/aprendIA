"use client";

import React, { useState } from "react";
import { User, ArrowRight, BookOpen, Key } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useLearning } from "@/contexts/LearningContext";

export default function StudentLogin() {
    const { login } = useLearning();
    const [name, setName] = useState("");
    const [studentCode, setStudentCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Sign out any previous session first
        await signOut({ redirect: false });

        const res = await signIn("credentials", {
            name,
            studentCode,
            redirect: false,
        });

        if (res?.error) {
            setError("Credenciales incorrectas. Verifica tu nombre o pide tu código secreto a tu profesor.");
            setIsLoading(false);
        } else {
            setError("");
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #f0fbf5 0%, #c1ebd5 50%, #7fd6ad 100%)' }}
        >
            {/* Decorative circles */}
            <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full opacity-25"
                style={{ background: 'radial-gradient(circle, #2e9f6c, transparent)' }} />
            <div className="absolute bottom-[-40px] left-[-40px] w-56 h-56 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #165b3d, transparent)' }} />

            <div className="bg-white max-w-md w-full rounded-3xl overflow-hidden relative z-10"
                style={{ boxShadow: '0 25px 60px rgba(10, 45, 29,0.2)' }}>
                
                {/* Header */}
                <div
                    className="p-10 text-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0a2d1d 0%, #165b3d 100%)' }}
                >
                    <div className="absolute top-[-20px] left-[-20px] w-32 h-32 rounded-full opacity-10" style={{ background: '#c1ebd5' }} />
                    <div className="absolute bottom-[-15px] right-[-15px] w-24 h-24 rounded-full opacity-10" style={{ background: '#2e9f6c' }} />

                    <div className="relative z-10">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.25)',
                            }}
                        >
                            <BookOpen className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                            ¡Bienvenido a la <span style={{ color: '#c1ebd5' }}>Aventura!</span>
                        </h1>
                        <p style={{ color: 'rgba(203, 224, 246,0.8)' }} className="text-sm font-medium">
                            Ingresa a tu cuenta para continuar tu viaje.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8" style={{ background: '#ffffff' }}>
                    <form onSubmit={handleLogin} className="space-y-5">
                        
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: '#0a2d1d' }}>
                                Tu Nombre de Aventura
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#2e9f6c' }} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition font-medium"
                                    style={{ background: '#f0fbf5', border: '1.5px solid #c1ebd5', color: '#0a2d1d' }}
                                    onFocus={e => { e.target.style.borderColor = '#2e9f6c'; e.target.style.boxShadow = '0 0 0 3px rgba(46, 159, 108,0.15)'; }}
                                    onBlur={e => { e.target.style.borderColor = '#c1ebd5'; e.target.style.boxShadow = 'none'; }}
                                    placeholder="Ej. Sofía"
                                    required
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Secret Code */}
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: '#0a2d1d' }}>
                                Tu Código Secreto <span style={{ color: '#2e9f6c' }}>(6 letras)</span>
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#2e9f6c' }} />
                                <input
                                    type="text"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition font-mono font-bold uppercase tracking-widest"
                                    style={{ background: '#f0fbf5', border: '1.5px solid #c1ebd5', color: '#0a2d1d' }}
                                    onFocus={e => { e.target.style.borderColor = '#2e9f6c'; e.target.style.boxShadow = '0 0 0 3px rgba(46, 159, 108,0.15)'; }}
                                    onBlur={e => { e.target.style.borderColor = '#c1ebd5'; e.target.style.boxShadow = 'none'; }}
                                    placeholder="Ej. X7P9K2"
                                    maxLength={6}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl text-center border border-red-100">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(135deg, #0a2d1d 0%, #165b3d 100%)',
                                boxShadow: '0 8px 24px rgba(10, 45, 29,0.35)',
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                <>Comenzar Aventura <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>

                        <div className="text-center">
                            <p className="text-xs" style={{ color: '#2e9f6c' }}>
                                Pide ayuda a tu profesor si olvidaste tu código.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
