"use client";

import { useState, useEffect } from "react";
import { MessageCircle, CheckCircle, Clock, ShieldAlert, Send, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface Ticket {
    id: string;
    message: string;
    adminReply: string | null;
    status: "OPEN" | "RESOLVED";
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
        email: string;
        avatar: string;
        school?: { name: string };
    };
}

export default function SupportDashboard() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showResolved, setShowResolved] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/support');
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    const handleReplyAndResolve = async (id: string) => {
        if (!replyText.trim()) return;
        setSending(true);
        try {
            await fetch('/api/support', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: "RESOLVED", adminReply: replyText.trim() })
            });
            setTickets(prev => prev.map(t =>
                t.id === id ? { ...t, status: "RESOLVED", adminReply: replyText.trim() } : t
            ));
            setReplyingTo(null);
            setReplyText("");
        } catch (error) {
            console.error("Error resolving ticket:", error);
        } finally {
            setSending(false);
        }
    };

    const markResolved = async (id: string) => {
        try {
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "RESOLVED" } : t));
            await fetch('/api/support', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: "RESOLVED" })
            });
        } catch (error) {
            console.error("Error resolving ticket:", error);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse text-lg">Cargando tickets de soporte...</div>;

    const openTickets = tickets.filter(t => t.status === "OPEN");
    const resolvedTickets = tickets.filter(t => t.status === "RESOLVED");

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/superadmin')} className="p-2 hover:bg-slate-700 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <MessageCircle className="w-6 h-6 text-indigo-400" />
                        <h1 className="text-lg sm:text-xl font-bold">Buzón de Soporte</h1>
                        {openTickets.length > 0 && (
                            <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-1 rounded-full font-bold border border-red-500/30">
                                {openTickets.length} pendiente{openTickets.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <button onClick={fetchTickets} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg transition font-medium">
                        🔄
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
                {tickets.length === 0 ? (
                    <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl p-16 text-center">
                        <ShieldAlert className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h2 className="text-xl font-bold text-slate-400">Buzón Vacío</h2>
                        <p className="text-slate-500 mt-2">No hay mensajes de soporte por el momento.</p>
                    </div>
                ) : (
                    <>
                        {/* Open Tickets */}
                        {openTickets.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 px-1">
                                    <Clock className="w-4 h-4" /> Pendientes ({openTickets.length})
                                </h2>
                                {openTickets.map(ticket => (
                                    <div key={ticket.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                        {/* Ticket Header */}
                                        <div className="p-4 flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl shrink-0 border border-slate-600">
                                                {ticket.sender.avatar && !ticket.sender.avatar.startsWith('http') ? ticket.sender.avatar : '👤'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-white text-sm">{ticket.sender.name || "Anónimo"}</span>
                                                    <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">{ticket.sender.role}</span>
                                                    {ticket.sender.school?.name && (
                                                        <span className="text-[10px] text-slate-500">• {ticket.sender.school.name}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div className="px-4 pb-3">
                                            <div className="bg-slate-900/60 p-3 rounded-lg text-sm text-slate-300 whitespace-pre-wrap border border-slate-700/50">
                                                {ticket.message}
                                            </div>
                                        </div>

                                        {/* Reply Area */}
                                        {replyingTo === ticket.id ? (
                                            <div className="px-4 pb-4 space-y-3">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Escribe tu respuesta al usuario..."
                                                    className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 resize-none"
                                                    rows={3}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                                                        className="px-3 py-2 text-sm text-slate-400 hover:text-white transition"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleReplyAndResolve(ticket.id)}
                                                        disabled={!replyText.trim() || sending}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition"
                                                    >
                                                        <Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Responder y Resolver'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 pb-4 flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setReplyingTo(ticket.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-sm font-bold transition border border-indigo-500/30"
                                                >
                                                    <Send className="w-4 h-4" /> Responder
                                                </button>
                                                <button
                                                    onClick={() => markResolved(ticket.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-sm font-bold transition border border-emerald-500/30"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Resolver sin responder
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Resolved Toggle */}
                        {resolvedTickets.length > 0 && (
                            <div className="pt-4">
                                <button
                                    onClick={() => setShowResolved(!showResolved)}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition py-2 border-t border-slate-700/50"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {showResolved ? 'Ocultar' : 'Ver'} resueltos ({resolvedTickets.length})
                                    {showResolved ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {showResolved && (
                                    <div className="space-y-3 mt-3 opacity-60">
                                        {resolvedTickets.map(ticket => (
                                            <div key={ticket.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-base shrink-0">
                                                        {ticket.sender.avatar && !ticket.sender.avatar.startsWith('http') ? ticket.sender.avatar : '👤'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-bold text-slate-400 text-sm">{ticket.sender.name}</span>
                                                        <span className="text-xs text-slate-600 ml-2">
                                                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                                                        </span>
                                                    </div>
                                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                                </div>
                                                <p className="text-sm text-slate-500 pl-11">{ticket.message}</p>
                                                {ticket.adminReply && (
                                                    <div className="ml-11 bg-indigo-900/30 border border-indigo-500/20 rounded-lg p-3">
                                                        <p className="text-xs text-indigo-400 font-bold mb-1">Tu respuesta:</p>
                                                        <p className="text-sm text-indigo-200">{ticket.adminReply}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
