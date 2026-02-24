"use client";

import React, { useState } from "react";
import { X, Diamond, ShoppingBag, Sparkles, AlertCircle } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

const STORE_ITEMS = [
    { id: "avatar_ninja", name: "Ninja Matemático", type: "Avatar", description: "Un avatar exclusivo de las sombras.", cost: 150, icon: "🥷" },
    { id: "avatar_robot", name: "Mecha-Calculador", type: "Avatar", description: "Precisión al 100%.", cost: 200, icon: "🤖" },
    { id: "badge_gold", name: "Insignia Dorada", type: "Insignia", description: "Brilla en el salón de clases.", cost: 300, icon: "🥇" },
    { id: "theme_dark", name: "Modo Nocturno", type: "Tema", description: "Para aventuras en la oscuridad.", cost: 500, icon: "🌙" },
    { id: "potion_life", name: "Poción Extra", type: "Vida", description: "Una vida extra para tus misiones.", cost: 50, icon: "❤️" },
];

export default function RewardsStore({ onClose }: { onClose: () => void }) {
    const { currentUser, stats, inventory, purchaseItem } = useLearning();
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

    if (!currentUser) return null;

    const studentInventory = inventory[currentUser.id] || [];

    const handlePurchase = (item: typeof STORE_ITEMS[0]) => {
        setPurchaseError(null);
        setPurchaseSuccess(null);

        if (studentInventory.includes(item.id) && item.type !== "Vida") {
            setPurchaseError("Ya tienes este artículo.");
            return;
        }

        const success = purchaseItem(currentUser.id, item.id, item.cost);
        if (success) {
            setPurchaseSuccess(`¡Has comprado: ${item.name}!`);
            setTimeout(() => setPurchaseSuccess(null), 3000);
        } else {
            setPurchaseError("No tienes suficientes gemas.");
            setTimeout(() => setPurchaseError(null), 3000);
        }
    };

    return (
        <div className="p-6 sm:p-8 bg-slate-50 min-h-[60vh] flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                        <ShoppingBag className="text-indigo-600" />
                        Tienda de Recompensas
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Gasta tus gemas en objetos exclusivos.</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold">
                    <Diamond className="fill-blue-500 text-blue-500 w-5 h-5" />
                    {stats.gems} Gemas
                </div>
            </header>

            {purchaseError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" /> {purchaseError}
                </div>
            )}
            {purchaseSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <Sparkles className="w-4 h-4" /> {purchaseSuccess}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-2 pb-6">
                {STORE_ITEMS.map(item => {
                    const isOwned = studentInventory.includes(item.id) && item.type !== "Vida";
                    const canAfford = stats.gems >= item.cost;

                    return (
                        <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="text-4xl mb-3 text-center bg-slate-50 rounded-xl py-6 border border-slate-100">
                                    {item.icon}
                                </div>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-800">{item.name}</h3>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{item.type}</span>
                                </div>
                                <p className="text-slate-500 text-sm mb-4 leading-tight">{item.description}</p>
                            </div>

                            <button
                                onClick={() => handlePurchase(item)}
                                disabled={isOwned || (!canAfford && !isOwned)}
                                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isOwned
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                        : canAfford
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    }`}
                            >
                                {isOwned ? (
                                    "Adquirido"
                                ) : (
                                    <>
                                        <Diamond className={`w-4 h-4 ${canAfford ? 'fill-white text-white' : 'fill-slate-400 text-slate-400'}`} />
                                        {item.cost}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Displaying owned items briefly */}
            {studentInventory.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Tus objetos:</h4>
                    <div className="flex gap-2 flex-wrap">
                        {studentInventory.map(id => {
                            const item = STORE_ITEMS.find(i => i.id === id);
                            return item ? (
                                <span key={id} className="text-xl bg-slate-50 px-2 py-1 border border-slate-100 rounded-lg" title={item.name}>
                                    {item.icon}
                                </span>
                            ) : null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
