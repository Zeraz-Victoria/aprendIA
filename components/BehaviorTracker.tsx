"use client";

import React, { useState, useEffect } from "react";

export default function BehaviorTracker({ students, classroomId, setStudents }: any) {
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    useEffect(() => {
        fetch("/api/behavior/categories")
            .then(r => r.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(e => console.error(e));
    }, []);

    const handleAssignPoints = async (categoryId: string, weight: number) => {
        if (!selectedStudent) return;
        try {
            await fetch("/api/behavior/logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    categoryId,
                    note: ""
                })
            });
            
            // Optimistic update
            if (setStudents) {
                setStudents((prev: any) => prev.map((s: any) => {
                    if (s.id === selectedStudent.id) {
                        return { ...s, gems: (s.gems || 0) + weight };
                    }
                    return s;
                }));
            }

            setSelectedStudent(null);
        } catch (e) {
            console.error(e);
        }
    };

    const visibleStudents = classroomId === "all" ? students : students.filter((s: any) => s.classroomId === classroomId);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#0a2d1d]">Comportamiento (Dojo)</h2>
            </div>
            
            {visibleStudents.length === 0 ? (
                <p className="text-center text-[#2e9f6c] py-10">No hay alumnos en este salón.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {visibleStudents.map((s: any) => (
                        <div 
                            key={s.id} 
                            onClick={() => setSelectedStudent(s)}
                            className="bg-white rounded-2xl p-4 flex flex-col items-center cursor-pointer border-2 border-[#c1ebd5] hover:border-[#2e9f6c] hover:-translate-y-1 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="text-5xl mb-2 bg-[#f0fbf5] w-20 h-20 flex items-center justify-center rounded-full shadow-inner">{s.avatar || '🧑🏻'}</div>
                            <span className="font-bold text-[#0a2d1d] text-center text-sm truncate w-full">{s.name}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full mt-2 border border-emerald-200">
                                {s.gems || 0} pts
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para asignar puntos */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2d1d]/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 p-2 bg-[#c1ebd5] hover:bg-[#2e9f6c] text-[#0a2d1d] rounded-full transition-colors">✖</button>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-2 bg-[#f0fbf5] w-24 h-24 mx-auto flex items-center justify-center rounded-full border-2 border-[#c1ebd5]">{selectedStudent.avatar || '🧑🏻'}</div>
                            <h3 className="text-xl font-bold text-[#0a2d1d]">Retroalimentación</h3>
                            <p className="text-sm font-bold text-[#2e9f6c] uppercase tracking-widest">{selectedStudent.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 text-[10px] font-black uppercase text-[#2e9f6c] tracking-widest text-center my-2">Positivo</div>
                            {categories.filter(c => c.isPositive).map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleAssignPoints(c.id, c.weight)}
                                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex flex-col items-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <span className="text-3xl mb-1">{c.icon}</span>
                                    <span className="text-[10px] font-bold uppercase text-center leading-tight">{c.name}</span>
                                    <span className="bg-emerald-200 text-emerald-800 rounded-full px-2 mt-1 text-[10px] font-black border border-emerald-300">+{c.weight}</span>
                                </button>
                            ))}
                            
                            <div className="col-span-2 text-[10px] font-black uppercase text-[#2e9f6c] tracking-widest text-center mt-4 mb-2">Necesita Mejorar</div>
                            {categories.filter(c => !c.isPositive).map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleAssignPoints(c.id, c.weight)}
                                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 p-3 rounded-xl flex flex-col items-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <span className="text-3xl mb-1">{c.icon}</span>
                                    <span className="text-[10px] font-bold uppercase text-center leading-tight">{c.name}</span>
                                    <span className="bg-rose-200 text-rose-800 rounded-full px-2 mt-1 text-[10px] font-black border border-rose-300">{c.weight}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
