"use client";

import { useState, useEffect } from "react";
import { MessageCircle, CheckCircle, Clock, Trash2, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Ticket {
    id: string;
    message: string;
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
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchTickets();
    }, []);

    const markResolved = async (id: string) => {
        try {
            setTickets(tickets.map(t => t.id === id ? { ...t, status: "RESOLVED" } : t));
            await fetch('/api/support', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: "RESOLVED" })
            });
        } catch (error) {
            console.error("Error resolving ticket:", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando tickets de soporte...</div>;

    const openTickets = tickets.filter(t => t.status === "OPEN");
    const resolvedTickets = tickets.filter(t => t.status === "RESOLVED");

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <MessageCircle className="w-8 h-8 text-indigo-600" />
                        Buzón de Soporte
                        <span className="bg-indigo-100 text-indigo-700 text-sm py-1 px-3 rounded-full font-bold">
                            {openTickets.length} Abiertos
                        </span>
                    </h1>
                    <p className="text-slate-500 mt-2">Mensajes enviados por usuarios desde el Widget Global.</p>
                </div>
                <button onClick={fetchTickets} className="text-sm font-bold bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm transition">
                    🔄 Actualizar
                </button>
            </header>

            {tickets.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400">
                    <ShieldAlert className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-500">Buzón Vacío</h2>
                    <p>No hay mensajes de soporte por el momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* OPEN TICKETS */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold flex flex-col sm:flex-row items-baseline gap-2 text-slate-800 border-b pb-2">
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> Pendientes</span>
                        </h2>
                        {openTickets.length === 0 && <p className="text-sm text-slate-400 italic">No hay tickets pendientes.</p>}

                        {openTickets.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} onResolve={() => markResolved(ticket.id)} />
                        ))}
                    </div>

                    {/* RESOLVED TICKETS */}
                    <div className="space-y-4 opacity-75">
                        <h2 className="text-xl font-bold flex flex-col sm:flex-row items-baseline gap-2 text-slate-800 border-b pb-2">
                            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Resueltos</span>
                        </h2>
                        {resolvedTickets.length === 0 && <p className="text-sm text-slate-400 italic">No hay tickets resueltos aún.</p>}

                        {resolvedTickets.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TicketCard({ ticket, onResolve }: { ticket: Ticket; onResolve?: () => void }) {
    return (
        <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${ticket.status === 'RESOLVED' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden border">
                        {ticket.sender.avatar ? (
                            ticket.sender.avatar.startsWith('http') ? <img src={ticket.sender.avatar} className="w-full h-full object-cover" /> : ticket.sender.avatar
                        ) : '👤'}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 leading-none">{ticket.sender.name || "Usuario Anónimo"}</h4>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                            <span className="bg-slate-100 border px-1.5 py-0.5 rounded text-[10px] uppercase">{ticket.sender.role}</span>
                            {ticket.sender.email && <span>• {ticket.sender.email}</span>}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm whitespace-pre-wrap border border-slate-100 mb-4">
                "{ticket.message}"
            </div>

            {ticket.status === 'OPEN' && onResolve && (
                <div className="flex justify-end">
                    <button
                        onClick={onResolve}
                        className="bg-green-100 hover:bg-green-200 text-green-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                    >
                        <CheckCircle className="w-4 h-4" /> Marcar Resuelto
                    </button>
                </div>
            )}
        </div>
    );
}
