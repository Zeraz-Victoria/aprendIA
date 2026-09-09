"use client";

import React from "react";
import { Sparkles, Check, MessageCircle, AlertTriangle } from "lucide-react";

interface SubscriptionLockModalProps {
    teacherName?: string;
    reason?: string;
}

export default function SubscriptionLockModal({ teacherName = "Docente", reason }: SubscriptionLockModalProps) {
    const buildWhatsappUrl = (planName: string, price: string) => {
        const text = `Hola, me gustaría activar el ${planName} ($${price} MXN/mes) en AprendIA para la cuenta del profesor: ${teacherName}`;
        return `https://wa.me/522723303963?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-amber-200 my-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        ¡Tu periodo de prueba de 3 días ha finalizado!
                    </h2>
                    <p className="text-slate-600 mt-2 font-medium max-w-xl mx-auto">
                        {reason || "Para continuar utilizando los mapas de aventura, la inteligencia artificial de Gemini y el acceso de tus alumnos, activa uno de nuestros planes."}
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Plan Básico */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between hover:border-emerald-400 transition-all hover:shadow-lg">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-2xl">🌱</span>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                                    Básico
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Plan Básico</h3>
                            <div className="text-3xl font-black text-slate-900 mb-4">
                                $99 <span className="text-sm font-normal text-slate-500">/ mes</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 mb-6 font-medium">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>1 Mapa de aventura</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>Hasta 25 alumnos</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>Acceso a Tutor Gemini IA</span>
                                </li>
                            </ul>
                        </div>
                        <a
                            href={buildWhatsappUrl("Plan Básico", "99")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold py-3 px-4 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" /> Activar Plan
                        </a>
                    </div>

                    {/* Plan Medio (Destacado) */}
                    <div className="bg-gradient-to-b from-sky-50 to-white rounded-2xl p-6 border-2 border-sky-500 flex flex-col justify-between shadow-xl relative transform md:-translate-y-2">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> El Favorito
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3 mt-1">
                                <span className="text-2xl">🚀</span>
                                <span className="bg-sky-100 text-sky-800 text-xs font-bold px-3 py-1 rounded-full">
                                    Recomendado
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Plan Medio</h3>
                            <div className="text-3xl font-black text-slate-900 mb-4">
                                $149 <span className="text-sm font-normal text-slate-500">/ mes</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 mb-6 font-medium">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <span className="font-bold text-slate-800">5 Mapas de aventura</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <span className="font-bold text-slate-800">Hasta 50 alumnos</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <span>Ideal para separar por materias</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <span>Tutor Gemini IA ilimitado</span>
                                </li>
                            </ul>
                        </div>
                        <a
                            href={buildWhatsappUrl("Plan Medio", "149")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white text-center font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-5 h-5" /> Activar Plan Medio
                        </a>
                    </div>

                    {/* Plan Premium */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between hover:border-amber-400 transition-all hover:shadow-lg">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-2xl">👑</span>
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                                    Premium
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Plan Premium</h3>
                            <div className="text-3xl font-black text-slate-900 mb-4">
                                $199 <span className="text-sm font-normal text-slate-500">/ mes</span>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-600 mb-6 font-medium">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span>10 Mapas de aventura</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span>Hasta 80 alumnos</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span>Control total múltiples grupos</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <span>Soporte prioritario</span>
                                </li>
                            </ul>
                        </div>
                        <a
                            href={buildWhatsappUrl("Plan Premium", "199")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-center font-bold py-3 px-4 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" /> Activar Plan Premium
                        </a>
                    </div>
                </div>

                {/* Footer message */}
                <div className="text-center text-xs text-slate-500 font-medium bg-slate-100 p-4 rounded-xl">
                    📞 ¿Tienes dudas? Envíanos un mensaje directo a WhatsApp al <strong>272 330 3963</strong> (Orizaba, Veracruz) para apoyarte de inmediato.
                </div>
            </div>
        </div>
    );
}
