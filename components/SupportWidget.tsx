"use client";

import { useState } from "react";
import { MessageCircle, X, Send, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SupportWidget() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Only show for TEACHER and SUPERADMIN — students should not see this
    if (!role || role === 'STUDENT') return null;

    const handleOpen = () => {
        if (!isOpen) {
            setIsOpen(true);
            setStatus("idle");
            setMessage("");
        } else {
            setIsOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setStatus("sending");
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al enviar el mensaje");
            }

            setStatus("success");
            setTimeout(() => {
                setIsOpen(false);
            }, 3000);
        } catch (error: any) {
            setStatus("error");
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* Chat Panel */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#c1ebd5] overflow-hidden flex flex-col mb-4 animate-fade-in-up origin-bottom-right">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-4 text-white flex justify-between items-center shadow-md pb-6 relative">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <span>👋</span> Hola, ¿En qué te ayudamos?
                            </h3>
                            <p className="text-indigo-100 text-xs mt-1">Soporte directo con los desarrolladores</p>
                        </div>
                        <button
                            title="X"
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 bg-[#f0fbf5] relative -mt-4 bg-white rounded-t-2xl shadow-[0_-8px_15px_-5px_rgba(0,0,0,0.1)]">
                        {status === "success" ? (
                            <div className="py-8 text-center animate-fade-in-up flex flex-col items-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h4 className="font-bold text-[#0a2d1d] text-lg">¡Mensaje Enviado!</h4>
                                <p className="text-[#2e9f6c] text-sm mt-2 px-4 leading-relaxed">
                                    Hemos recibido tu mensaje. Lo revisaremos lo más pronto posible para mejorar la plataforma.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <label htmlFor="supportMessage" className="text-sm font-bold text-[#165b3d]">
                                    ¿Encontraste un error o tienes una duda?
                                </label>
                                <div className="relative">
                                    <textarea
                                        id="supportMessage"
                                        placeholder="Describe tu problema o idea aquí..."
                                        className="w-full bg-[#f0fbf5] border border-[#c1ebd5] rounded-xl p-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-[#2e9f6c] focus:bg-white transition-all text-[#165b3d]"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        disabled={status === "sending"}
                                    />
                                    {status === "error" && (
                                        <div className="absolute -bottom-6 left-0 text-red-500 text-xs font-bold animate-shake">
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={!message.trim() || status === "sending"}
                                    className="mt-2 w-full bg-[#0a2d1d] hover:bg-[#0a2d1d] text-white rounded-xl py-3 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {status === "sending" ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Enviar Mensaje <Send className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-[#2e9f6c] text-center mt-1">Sabremos quién eres automáticamente. No necesitas escribir tu correo.</p>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Bubble */}
            <button
                onClick={handleOpen}
                className={`w-14 h-14 bg-[#0a2d1d] hover:bg-[#0a2d1d] text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 border-2 border-white/20 ${isOpen ? 'rotate-90 scale-0 opacity-0 relative z-[-1]' : 'rotate-0 opacity-100'}`}
                style={{ transitionDuration: '300ms' }}
            >
                <MessageCircle className="w-6 h-6" fill="currentColor" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
            </button>
        </div>
    );
}
