"use client";

import React, { useState } from "react";
import { X, Diamond, ShoppingBag, Sparkles, AlertCircle } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

const STORE_ITEMS = [
    { id: "avatar_ninja", name: "Ninja Asesino", type: "Avatar", description: "Sigilo mortal para evadir los problemas.", cost: 350, icon: "🥷" },
    { id: "avatar_alien", name: "Invasor Matemático", type: "Avatar", description: "Lógico, frío y del espacio exterior.", cost: 450, icon: "👽" },
    { id: "avatar_wizard", name: "Hechicero Arcano", type: "Avatar", description: "Domina la magia de los algoritmos.", cost: 600, icon: "🧙‍♂️" },
    { id: "avatar_robot", name: "Cyborg Cuántico", type: "Avatar", description: "Calcula respuestas a la velocidad de la luz.", cost: 850, icon: "🤖" },
    { id: "avatar_astronaut", name: "Viajero Estelar", type: "Avatar", description: "Explora las galaxias del conocimiento.", cost: 1200, icon: "👨‍🚀" },
    { id: "frame_fire", name: "Aura de Fuego", type: "Marco", description: "Envuelve tu foto de perfil en llamas intensas.", cost: 400, icon: "🔥" },
    { id: "frame_ice", name: "Borde Glacial", type: "Marco", description: "Congela a tu competencia bajo cero.", cost: 400, icon: "❄️" },
    { id: "frame_lightning", name: "Rayo Púrpura", type: "Marco", description: "Desprende chispas de brillantez pura.", cost: 700, icon: "⚡" },
    { id: "shield_protect", name: "Escudo Protector", type: "Equipamiento", description: "Te salva de perder una vida y mantiene tu racha.", cost: 250, icon: "🛡️" },
    { id: "potion_life", name: "Poción Extra", type: "Vida", description: "Suma corazones extra al instante.", cost: 150, icon: "❤️" },
    // Salón Virtual – Muebles de salón de clase cartoon
    { id: "furn_desk",         name: "Pupitre Escolar",      type: "Mueble", description: "El clásico pupitre naranja con silla.", cost: 400,  icon: "🪑" },
    { id: "furn_teacher_desk", name: "Escritorio del Profe",  type: "Mueble", description: "Un escritorio de madera con cajones.", cost: 800,  icon: "🗄️" },
    { id: "furn_chalkboard",   name: "Pizarrón Verde",       type: "Mueble", description: "Escribe tus fórmulas favoritas.", cost: 1000, icon: "📝" },
    { id: "furn_bookshelf",    name: "Librero de Madera",    type: "Mueble", description: "Lleno de libros de aventuras.", cost: 900,  icon: "📚" },
    { id: "furn_plant",        name: "Planta Decorativa",    type: "Mueble", description: "Dale vida verde a tu salón.", cost: 300,  icon: "🌿" },
    { id: "furn_globe",        name: "Globo Terráqueo",      type: "Mueble", description: "Explora los continentes.", cost: 700,  icon: "🌍" },
    { id: "furn_clock",        name: "Reloj de Pared",       type: "Mueble", description: "Siempre puntual.", cost: 500,  icon: "🕐" },
    { id: "furn_rug",          name: "Alfombra Educativa",   type: "Mueble", description: "Para sentarse a leer cuentos.", cost: 600,  icon: "🟣" },
    { id: "furn_lamp",         name: "Lámpara de Estudio",   type: "Mueble", description: "Ilumina tus ideas.", cost: 400,  icon: "💡" },
    { id: "furn_computer",     name: "Computadora Escolar",  type: "Mueble", description: "Tecnología para aprender.", cost: 1500, icon: "🖥️" },
    { id: "furn_trashcan",     name: "Bote de Reciclaje",    type: "Mueble", description: "Cuida el medio ambiente.", cost: 200,  icon: "♻️" },
    { id: "furn_backpack",     name: "Mochila Escolar",      type: "Mueble", description: "Guarda tus útiles.", cost: 350,  icon: "🎒" },
    // Útiles escolares
    { id: "furn_notebook",     name: "Libreta de Apuntes",   type: "Mueble", description: "Anota todo lo importante.", cost: 200,  icon: "📓" },
    { id: "furn_pencilcase",   name: "Estuche de Lápices",   type: "Mueble", description: "Lápices, colores y plumas.", cost: 250,  icon: "✏️" },
    { id: "furn_eraser",       name: "Goma de Borrar",       type: "Mueble", description: "Borra tus errores.", cost: 100,  icon: "🧹" },
    { id: "furn_ruler",        name: "Regla",                type: "Mueble", description: "Mide con precisión.", cost: 100,  icon: "📏" },
    { id: "furn_phone",        name: "Celular",              type: "Mueble", description: "Mantente conectado.", cost: 800,  icon: "📱" },
    { id: "furn_tablet",       name: "Tablet",               type: "Mueble", description: "Tu compañera digital.", cost: 1200, icon: "📲" },
    { id: "furn_waterbottle",  name: "Botella de Agua",      type: "Mueble", description: "Hidrátate.", cost: 150,  icon: "🫗" },
];

export default function RewardsStore({ onClose }: { onClose: () => void }) {
    const { currentUser, stats, inventory, purchaseItem } = useLearning();
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

    if (!currentUser) return null;

    const studentInventory = inventory[currentUser.id] || [];

    const handlePurchase = async (item: typeof STORE_ITEMS[0]) => {
        setPurchaseError(null);
        setPurchaseSuccess(null);

        const isFurniture = item.type === "Mueble";
        const isConsumable = item.type === "Vida";
        if (studentInventory.includes(item.id) && !isFurniture && !isConsumable) {
            setPurchaseError("Ya tienes este artículo.");
            return;
        }

        const success = await purchaseItem(currentUser.id, item.id, item.cost);
        if (success) {
            setPurchaseSuccess(`¡Has comprado: ${item.name}!`);
            setTimeout(() => setPurchaseSuccess(null), 3000);
        } else {
            setPurchaseError("No tienes suficientes gemas.");
            setTimeout(() => setPurchaseError(null), 3000);
        }
    };

    return (
        <div className="p-6 sm:p-8 bg-[#f0fbf5] min-h-[60vh] flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-[#0a2d1d]">
                        <ShoppingBag className="text-[#0a2d1d]" />
                        Tienda de Recompensas
                    </h2>
                    <p className="text-[#2e9f6c] text-sm mt-1">Gasta tus gemas en objetos exclusivos.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#c1ebd5] text-blue-800 px-4 py-2 rounded-full font-bold">
                    <Diamond className="fill-blue-500 text-[#165b3d] w-5 h-5" />
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
                    const isFurniture = item.type === "Mueble";
                    const isConsumable = item.type === "Vida";
                    const ownedCount = studentInventory.filter(id => id === item.id).length;
                    const isOwned = ownedCount > 0 && !isFurniture && !isConsumable;
                    const canAfford = stats.gems >= item.cost;

                    return (
                        <div key={item.id} className="bg-white rounded-2xl p-5 border border-[#c1ebd5] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="text-4xl mb-3 text-center bg-[#f0fbf5] rounded-xl py-6 border border-[#c1ebd5] relative">
                                    {item.icon}
                                    {isFurniture && ownedCount > 0 && (
                                        <span className="absolute top-2 right-2 bg-[#0a2d1d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            x{ownedCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-[#0a2d1d]">{item.name}</h3>
                                    <span className="text-xs bg-[#c1ebd5] text-[#2e9f6c] px-2 py-1 rounded-full">{item.type}</span>
                                </div>
                                <p className="text-[#2e9f6c] text-sm mb-4 leading-tight">{item.description}</p>
                            </div>

                            <button
                                onClick={() => handlePurchase(item)}
                                disabled={isOwned || !canAfford}
                                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isOwned
                                    ? "bg-[#c1ebd5] text-[#2e9f6c] cursor-not-allowed"
                                    : canAfford
                                        ? "bg-[#0a2d1d] hover:bg-[#0a2d1d] text-white shadow-md shadow-[#c1ebd5]"
                                        : "bg-[#c1ebd5] text-[#2e9f6c] cursor-not-allowed"
                                    }`}
                            >
                                {isOwned ? (
                                    "Adquirido"
                                ) : (
                                    <>
                                        <Diamond className={`w-4 h-4 ${canAfford ? 'fill-white text-white' : 'fill-slate-400 text-[#2e9f6c]'}`} />
                                        {item.cost} {isFurniture && ownedCount > 0 ? `(+1 más)` : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Displaying owned items briefly */}
            {studentInventory.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-[#c1ebd5] shadow-sm">
                    <h4 className="text-sm font-bold text-[#165b3d] mb-2">Tus objetos:</h4>
                    <div className="flex gap-2 flex-wrap">
                        {studentInventory.map(id => {
                            const item = STORE_ITEMS.find(i => i.id === id);
                            return item ? (
                                <span key={id} className="text-xl bg-[#f0fbf5] px-2 py-1 border border-[#c1ebd5] rounded-lg" title={item.name}>
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
