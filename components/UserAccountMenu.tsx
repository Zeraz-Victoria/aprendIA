"use client";

import React, { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon, Shield, HelpCircle, ExternalLink, ChevronDown, CheckCircle2, AlertTriangle, Sparkles, MessageCircle } from "lucide-react";

interface UserAccountMenuProps {
    schoolInfo?: {
        name?: string;
        subscriptionPlan?: string;
        subscriptionStatus?: string;
        nextPaymentDate?: string | Date;
        maxStudents?: number;
        maxMaps?: number;
        _count?: {
            users?: number;
            worlds?: number;
            classrooms?: number;
        };
    } | null;
    onOpenTutorial?: () => void;
}

export default function UserAccountMenu({ schoolInfo, onOpenTutorial }: UserAccountMenuProps) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const user = session?.user as any;
    const userName = user?.name || "Usuario";
    const userRole = user?.role || "TEACHER";
    const userAvatar = user?.image || user?.avatar || (userRole === 'SUPERADMIN' ? "🛡️" : userRole === 'TEACHER' ? "👨‍🏫" : "🧑‍🎓");

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsConfirmingLogout(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate days remaining in subscription / trial
    let daysRemaining: number | null = null;
    if (schoolInfo?.nextPaymentDate) {
        const diff = new Date(schoolInfo.nextPaymentDate).getTime() - Date.now();
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const planLabel = schoolInfo?.subscriptionPlan === 'PREMIUM'
        ? 'Plan Premium'
        : schoolInfo?.subscriptionPlan === 'INTERMEDIATE'
        ? 'Plan Intermedio'
        : schoolInfo?.subscriptionPlan === 'BASIC'
        ? 'Plan Básico'
        : 'Prueba Gratuita';

    const isSuspended = schoolInfo?.subscriptionStatus === 'SUSPENDED';

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Main Trigger Button: Always clearly visible on PC and Mobile */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all duration-200 cursor-pointer select-none bg-white hover:bg-[#f0fbf5] hover:border-[#2e9f6c] shadow-sm hover:shadow active:scale-98"
                style={{ borderColor: isOpen ? '#2e9f6c' : '#c1ebd5' }}
                aria-label="Menú de cuenta y cerrar sesión"
                title="Mi Cuenta / Cerrar Sesión"
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-xl bg-[#c1ebd5]/50 flex items-center justify-center text-base shrink-0 border border-[#c1ebd5]">
                    {userAvatar}
                </div>

                {/* User Info (Visible on Desktop / Tablets) */}
                <div className="text-left hidden sm:flex flex-col min-w-0">
                    <span className="text-xs font-black text-[#0a2d1d] truncate max-w-[130px] leading-tight">
                        {userName}
                    </span>
                    <span className="text-[10px] font-bold text-[#2e9f6c] flex items-center gap-1 leading-tight">
                        {userRole === 'SUPERADMIN' ? 'Superadmin' : userRole === 'TEACHER' ? 'Profesor' : 'Alumno'}
                        {daysRemaining !== null && daysRemaining <= 3 && (
                            <span className={`w-1.5 h-1.5 rounded-full ${daysRemaining <= 0 || isSuspended ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                        )}
                    </span>
                </div>

                <ChevronDown className={`w-4 h-4 text-[#165b3d] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#2e9f6c]' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute right-0 mt-2.5 w-80 bg-white rounded-3xl shadow-2xl border border-[#c1ebd5] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{ boxShadow: '0 20px 40px -10px rgba(10, 45, 29, 0.18)' }}
                >
                    {/* Header Card */}
                    <div className="p-4 bg-gradient-to-br from-[#0a2d1d] to-[#165b3d] text-white relative overflow-hidden">
                        <div className="absolute top-[-20px] right-[-20px] w-24 h-24 rounded-full bg-[#2e9f6c]/20 blur-xl pointer-events-none" />
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
                                {userAvatar}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-black text-sm text-white truncate leading-tight">
                                    {userName}
                                </h4>
                                <p className="text-[11px] text-[#c1ebd5] font-medium truncate mt-0.5">
                                    {schoolInfo?.name || "AprendIA Suite"}
                                </p>
                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2e9f6c]/30 text-[#c1ebd5] border border-[#2e9f6c]/40">
                                        {planLabel}
                                    </span>
                                    {daysRemaining !== null && (
                                        <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            isSuspended || daysRemaining <= 0
                                                ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                                                : daysRemaining <= 3
                                                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                                                : 'bg-white/15 text-white/90'
                                        }`}>
                                            {isSuspended ? 'Suspendido' : daysRemaining === 0 ? 'Vence hoy' : `${daysRemaining}d restantes`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quota / Usage Stats (if available) */}
                    {schoolInfo && (
                        <div className="px-4 py-3 bg-[#f0fbf5] border-b border-[#c1ebd5]/60">
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#2e9f6c] mb-2 flex items-center justify-between">
                                <span>Capacidad del Plan</span>
                                <span className="font-mono text-[#0a2d1d]">{schoolInfo.subscriptionPlan || 'BASIC'}</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-xl bg-white border border-[#c1ebd5]/50 flex flex-col">
                                    <span className="text-[10px] text-[#2e9f6c] font-bold">Alumnos</span>
                                    <span className="font-black text-[#0a2d1d]">
                                        {schoolInfo._count?.users ?? 0} / {schoolInfo.maxStudents || 25}
                                    </span>
                                </div>
                                <div className="p-2 rounded-xl bg-white border border-[#c1ebd5]/50 flex flex-col">
                                    <span className="text-[10px] text-[#2e9f6c] font-bold">Mapas / Proy.</span>
                                    <span className="font-black text-[#0a2d1d]">
                                        {schoolInfo._count?.worlds ?? 0} / {schoolInfo.maxMaps || 2}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Actions */}
                    <div className="p-2 space-y-1">
                        {onOpenTutorial && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onOpenTutorial();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-[#0a2d1d] hover:bg-[#f0fbf5] hover:text-[#165b3d] rounded-xl transition-colors cursor-pointer text-left"
                            >
                                <Sparkles className="w-4 h-4 text-[#2e9f6c]" />
                                <span>Guía de Primeros Pasos</span>
                            </button>
                        )}

                        <a
                            href="https://wa.me/521234567890?text=Hola,%20necesito%20soporte%20o%20reactivar%20mi%20cuenta%20de%20AprendIA"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-[#0a2d1d] hover:bg-[#f0fbf5] hover:text-[#165b3d] rounded-xl transition-colors cursor-pointer text-left"
                        >
                            <MessageCircle className="w-4 h-4 text-[#2e9f6c]" />
                            <span>Soporte / Ayuda por WhatsApp</span>
                            <ExternalLink className="w-3 h-3 text-[#2e9f6c] ml-auto opacity-70" />
                        </a>
                    </div>

                    {/* Prominent Red Logout Section */}
                    <div className="p-3 border-t border-[#c1ebd5]/60 bg-slate-50/70">
                        {isConfirmingLogout ? (
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-rose-700 text-center">
                                    ¿Deseas cerrar tu sesión ahora?
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingLogout(false)}
                                        className="py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSignOut}
                                        className="py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                                    >
                                        Sí, Salir
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsConfirmingLogout(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all duration-200 shadow-sm cursor-pointer active:scale-98"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Cerrar Sesión</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
