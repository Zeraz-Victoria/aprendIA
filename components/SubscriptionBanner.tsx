"use client";

import React from "react";
import { AlertCircle, Clock, MessageCircle } from "lucide-react";

interface SubscriptionBannerProps {
    daysLeft: number;
    teacherName?: string;
}

export default function SubscriptionBanner({ daysLeft, teacherName = "Docente" }: SubscriptionBannerProps) {
    const buildWhatsappUrl = () => {
        const text = `Hola, mi cuenta en AprendIA vence en ${daysLeft} día(s). Quisiera activar o renovar mi plan para el profesor: ${teacherName}`;
        return `https://wa.me/522723303963?text=${encodeURIComponent(text)}`;
    };

    // Estilos según los días restantes
    const isUrgent = daysLeft === 1;
    const bgGradient = isUrgent
        ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border-red-500"
        : daysLeft === 2
            ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border-amber-500"
            : "bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-800 text-white border-sky-500";

    return (
        <div className={`w-full py-2.5 px-4 shadow-md border-b flex flex-wrap items-center justify-between gap-3 text-sm font-medium ${bgGradient} transition-all`}>
            <div className="flex items-center gap-2.5 mx-auto md:mx-0">
                {isUrgent ? (
                    <AlertCircle className="w-5 h-5 animate-pulse text-yellow-300 flex-shrink-0" />
                ) : (
                    <Clock className="w-5 h-5 text-sky-200 flex-shrink-0" />
                )}
                <span>
                    {isUrgent ? (
                        <>
                            🚨 <strong>¡Atención! Queda solo 1 día de servicio.</strong> Tu cuenta y la de tus alumnos se suspenderán mañana si no la activas.
                        </>
                    ) : daysLeft === 2 ? (
                        <>
                            ⚠️ <strong>Quedan 2 días de tu periodo activo.</strong> Evita interrupciones en tus clases activando tu plan.
                        </>
                    ) : (
                        <>
                            ⚡ <strong>Tu periodo de prueba / plan vence en {daysLeft} días.</strong> Activa tu plan para seguir disfrutando de AprendIA.
                        </>
                    )}
                </span>
            </div>

            <a
                href={buildWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto md:mx-0 bg-white hover:bg-slate-100 text-slate-900 font-bold py-1 px-3.5 rounded-lg text-xs shadow transition-transform active:scale-95 flex items-center gap-1.5 flex-shrink-0"
            >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Activar Plan por WhatsApp</span>
            </a>
        </div>
    );
}
