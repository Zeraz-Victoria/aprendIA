const fs = require('fs');

let f = 'components/StudentHUD.tsx';
let data = fs.readFileSync(f, 'utf8');

// Imports
data = data.replace('import { Heart, Flame, Diamond, Trophy } from "lucide-react";', 
'import { Heart, Flame, Diamond, Trophy, Users, Sparkles, X } from "lucide-react";\nimport { useEffect, useState } from "react";\nimport { getPusherClient } from "@/lib/pusher";');

// HUD Props and State
const targetStart = `export default function StudentHUD({
    onOpenStore,
    onOpenLeaderboard,
    onOpenProfile
}: {
    onOpenStore?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenProfile?: () => void;
}) {
    const { stats, currentUser } = useLearning();`;

const newStart = `export default function StudentHUD({
    onOpenStore,
    onOpenLeaderboard,
    onOpenProfile
}: {
    onOpenStore?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenProfile?: () => void;
}) {
    const { stats, currentUser, setStats } = useLearning();
    const [showBuffModal, setShowBuffModal] = useState(false);
    const [classmates, setClassmates] = useState<any[]>([]);
    const [incomingBuff, setIncomingBuff] = useState<any | null>(null);
    const [sendingBuffTo, setSendingBuffTo] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        const pusher = getPusherClient();
        const channel = pusher.subscribe('student-' + currentUser.id);

        channel.bind('receive-buff', (data: any) => {
            setIncomingBuff(data);
            setTimeout(() => setIncomingBuff(null), 6000);
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, [currentUser?.id]);

    const fetchClassmates = async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(\`/api/gamification/buffs?studentId=\${currentUser.id}\`);
            const data = await res.json();
            setClassmates(data || []);
        } catch (e) {
            console.error("Failed to fetch classmates", e);
        }
    };

    const handleSendBuff = async (targetId: string) => {
        if (!currentUser?.id || stats.gems < 10) return;
        setSendingBuffTo(targetId);
        
        // Optimistic UI update
        setStats(prev => ({ ...prev, gems: Math.max(0, prev.gems - 10) }));

        try {
            await fetch('/api/gamification/buffs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: currentUser.id, targetId, buffMessage: '¡Tú puedes lograrlo!' })
            });
            setShowBuffModal(false);
        } catch (e) {
            console.error("Failed to send buff", e);
        } finally {
            setSendingBuffTo(null);
        }
    };

    const handleOpenBuffs = () => {
        setShowBuffModal(true);
        fetchClassmates();
    };`;

data = data.replace(targetStart, newStart);

// JSX Insert 1: Classmates button
const targetButton = `                    {/* Leaderboard */}`;
const replaceButton = `                    {/* Motivate Classmates */}
                    <div
                        className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform"
                        onClick={handleOpenBuffs}
                    >
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 fill-purple-400 group-hover:fill-purple-500" />
                    </div>
                    
                    {/* Leaderboard */}`;
data = data.replace(targetButton, replaceButton);


// JSX Insert 2: Modals
const targetEnd = `        </div>
    );
}`;

const replaceEnd = `        </div>

            {/* Incoming Buff Alert */}
            {incomingBuff && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in w-[90%] sm:w-auto">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full py-3 px-6 shadow-[0_0_30px_rgba(147,51,234,0.5)] border-2 border-purple-400 flex items-center gap-4">
                        <span className="text-4xl">{incomingBuff.fromAvatar}</span>
                        <div>
                            <p className="text-purple-100 text-xs font-bold uppercase tracking-wider">{incomingBuff.fromName} te anima:</p>
                            <p className="text-white font-black text-lg">"{incomingBuff.message}"</p>
                        </div>
                        <Sparkles className="w-8 h-8 text-yellow-400 animate-spin-slow" />
                    </div>
                </div>
            )}

            {/* Buffs Modal */}
            {showBuffModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-auto pointer-events-auto">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowBuffModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500 text-xl" /> Enviar Energía
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">Usa tus gemas para animar a tus compañeros de clase.</p>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {classmates.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                            {c.avatar}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{c.name}</p>
                                            {c.status === "needs_help" && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Necesita ayuda</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSendBuff(c.id)}
                                        disabled={stats.gems < 10 || sendingBuffTo === c.id}
                                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-transform active:scale-95"
                                    >
                                        <span>Animar</span>
                                        <span className="text-[10px] flex items-center gap-1 opacity-80"><Diamond className="w-3 h-3 fill-purple-700" /> 10</span>
                                    </button>
                                </div>
                            ))}
                            {classmates.length === 0 && (
                                <div className="text-center text-slate-400 py-4 text-sm font-medium">Buscando compañeros...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
    );
}`;

data = data.replace(targetEnd, replaceEnd);

fs.writeFileSync(f, data);
console.log("HUD patched");
