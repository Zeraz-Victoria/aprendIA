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
            <div className="bg-white dark:bg-[#0a2d1d] rounded-3xl w-full max-w-sm p-6 flex flex-col items-center justify-center space-y-4 shadow-2xl border-4 border-[#c1ebd5] dark:border-[#165b3d] animate-in zoom-in-95">
                <div className="w-16 h-16 bg-[#c1ebd5] dark:bg-[#0a2d1d] rounded-full flex items-center justify-center mb-2">
                    <span className="text-3xl">👨‍🏫</span>
                </div>
                <h4 className="font-bold text-lg text-[#165b3d] dark:text-slate-200">Autorización Docente</h4>
                <p className="text-sm text-center text-[#2e9f6c] mb-2">
                    Pide a tu maestro que ingrese su PIN para autorizarte y guardar tu avance.
                </p>

                {errorMessage && (
                    <div className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl w-full text-center border border-red-200 dark:border-red-800 animate-shake">
                        {errorMessage}
                    </div>
                )}

                <input
                    type="password"
                    className="mt-2 p-3 rounded-xl border-2 border-[#c1ebd5] dark:border-[#165b3d] bg-[#f0fbf5] dark:bg-[#0a2d1d] text-center text-3xl tracking-[0.5em] focus:border-[#165b3d] outline-none w-full font-mono shadow-inner transition-colors"
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
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-[#165b3d] bg-[#c1ebd5] dark:bg-[#0a2d1d] dark:text-[#2e9f6c] hover:bg-[#c1ebd5] dark:hover:bg-[#165b3d] transition-colors disabled:opacity-50"
                    >
                        Regresar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!password.trim() || isLoading}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-[#0a2d1d] hover:bg-[#0a2d1d] transition-colors shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading && <Clock className="w-5 h-5 animate-spin" />}
                        {isLoading ? "Validando..." : "Autorizar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
