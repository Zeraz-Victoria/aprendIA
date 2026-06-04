import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface TeacherUnlockModalProps {
    studentId: string;
    worldId: string;
    levelId: number;
    evidenceType: string;
    context?: string;
    narrative?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TeacherUnlockModal({
    studentId,
    worldId,
    levelId,
    evidenceType,
    context,
    narrative,
    onClose,
    onSuccess
}: TeacherUnlockModalProps) {
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async () => {
        if (!password.trim()) return;
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response = await fetch('/api/evidence/bypass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    worldId,
                    levelId,
                    password,
                    context,
                    narrative,
                    evidenceType
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "PIN de maestro incorrecto");
            }

            // Success!
            onSuccess();
        } catch (e: any) {
            setErrorMessage(e.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1c3a60] rounded-3xl w-full max-w-sm p-6 flex flex-col items-center justify-center space-y-4 shadow-2xl border-4 border-[#cbe0f6] dark:border-[#346297] animate-in zoom-in-95">
                <div className="w-16 h-16 bg-[#cbe0f6] dark:bg-[#1c3a60] rounded-full flex items-center justify-center mb-2">
                    <span className="text-3xl">👨‍🏫</span>
                </div>
                <h4 className="font-bold text-lg text-[#346297] dark:text-slate-200">Autorización Docente</h4>
                <p className="text-sm text-center text-[#73a4db] mb-2">
                    Pide a tu maestro que ingrese su PIN para autorizarte y guardar tu avance.
                </p>

                {errorMessage && (
                    <div className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl w-full text-center border border-red-200 dark:border-red-800 animate-shake">
                        {errorMessage}
                    </div>
                )}

                <input
                    type="password"
                    className="mt-2 p-3 rounded-xl border-2 border-[#cbe0f6] dark:border-[#346297] bg-[#f0f5fb] dark:bg-[#1c3a60] text-center text-3xl tracking-[0.5em] focus:border-[#346297] outline-none w-full font-mono shadow-inner transition-colors"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="****"
                    maxLength={4}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    disabled={isLoading}
                    autoFocus
                />

                <div className="flex gap-3 w-full mt-6">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-[#346297] bg-[#cbe0f6] dark:bg-[#1c3a60] dark:text-[#73a4db] hover:bg-[#cbe0f6] dark:hover:bg-[#346297] transition-colors disabled:opacity-50"
                    >
                        Regresar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!password.trim() || isLoading}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-[#1c3a60] hover:bg-[#1c3a60] transition-colors shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading && <Clock className="w-5 h-5 animate-spin" />}
                        {isLoading ? "Validando..." : "Autorizar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
