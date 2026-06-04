"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Edit3, Loader2, ZoomIn, ZoomOut, RotateCw, FlipHorizontal, Trash2, Orbit, Users } from "lucide-react";
import { useLearning } from "@/contexts/LearningContext";

// scale: proportional size relative to room (1.0 = 15% of room width)
const FURNITURE_CATALOG: Record<string, { image: string; label: string; scale: number }> = {
    "furn_desk":         { image: "/furniture/furn_desk.png",         label: "Pupitre",      scale: 1.0 },
    "furn_teacher_desk": { image: "/furniture/furn_teacher_desk.png", label: "Escritorio",   scale: 1.3 },
    "furn_chalkboard":   { image: "/furniture/furn_chalkboard.png",   label: "Pizarrón",    scale: 1.2 },
    "furn_bookshelf":    { image: "/furniture/furn_bookshelf.png",    label: "Librero",      scale: 1.1 },
    "furn_plant":        { image: "/furniture/furn_plant.png",        label: "Planta",       scale: 0.7 },
    "furn_globe":        { image: "/furniture/furn_globe.png",        label: "Globo",        scale: 0.55 },
    "furn_clock":        { image: "/furniture/furn_clock.png",        label: "Reloj",        scale: 0.4 },
    "furn_rug":          { image: "/furniture/furn_rug.png",          label: "Alfombra",     scale: 1.2 },
    "furn_lamp":         { image: "/furniture/furn_lamp.png",         label: "Lámpara",      scale: 0.5 },
    "furn_computer":     { image: "/furniture/furn_computer.png",     label: "Computadora", scale: 1.0 },
    "furn_trashcan":     { image: "/furniture/furn_trashcan.png",     label: "Reciclaje",    scale: 0.55 },
    "furn_backpack":     { image: "/furniture/furn_backpack.png",     label: "Mochila",      scale: 0.5 },
    "furn_notebook":     { image: "/furniture/furn_notebook.png",     label: "Libreta",      scale: 0.5 },
    "furn_pencilcase":   { image: "/furniture/furn_pencilcase.png",   label: "Estuche",      scale: 0.45 },
    "furn_eraser":       { image: "/furniture/furn_eraser.png",       label: "Goma",         scale: 0.3 },
    "furn_ruler":        { image: "/furniture/furn_ruler.png",        label: "Regla",        scale: 0.35 },
    "furn_phone":        { image: "/furniture/furn_phone.png",        label: "Celular",      scale: 0.25 },
    "furn_tablet":       { image: "/furniture/furn_tablet.png",       label: "Tablet",       scale: 0.4 },
    "furn_waterbottle":  { image: "/furniture/furn_waterbottle.png",  label: "Botella",      scale: 0.3 },
};

// Approximate polygon for the isometric floor to prevent walking into the void
const FLOOR_POLYGON = [
    { x: 43, y: 43 }, // Top corner
    { x: 88, y: 62 }, // Right corner
    { x: 46, y: 78 }, // Bottom corner
    { x: 12, y: 62 }, // Left corner
];

const isInsideFloor = (x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = FLOOR_POLYGON.length - 1; i < FLOOR_POLYGON.length; j = i++) {
        let xi = FLOOR_POLYGON[i].x, yi = FLOOR_POLYGON[i].y;
        let xj = FLOOR_POLYGON[j].x, yj = FLOOR_POLYGON[j].y;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

interface FurnitureItem {
    id?: string;
    itemId: string;
    positionX: number;
    positionY: number;
    positionZ?: number;
    rotation: number;
    ownerId?: string;  // null = shared(teacher), string = personal(student)
}

interface OnlineStudent {
    id: string;
    name: string;
    avatar: string | null;
    avatarX: number;
    avatarY: number;
}

export default function VirtualClassroom({ studentId, onClose }: { studentId: string; onClose: () => void }) {
    const { currentUser, inventory } = useLearning();
    const isOwner = currentUser?.id === studentId;
    const isTeacher = (currentUser as any)?.role === "TEACHER";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [roomRotation, setRoomRotation] = useState(0);
    const [selectedFurnitureIndex, setSelectedFurnitureIndex] = useState<number | null>(null);
    const [dragging, setDragging] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentDeskId, setCurrentDeskId] = useState<string | null>(null);

    // All furniture in the lobby (shared + personal)
    const [sharedFurniture, setSharedFurniture] = useState<FurnitureItem[]>([]);
    const [personalFurniture, setPersonalFurniture] = useState<FurnitureItem[]>([]);

    // Online students
    const [onlineStudents, setOnlineStudents] = useState<OnlineStudent[]>([]);

    // My avatar position
    const [myAvatarPos, setMyAvatarPos] = useState({ x: 70, y: 65 });
    const [draggingAvatar, setDraggingAvatar] = useState(false);
    const [avatarDragOffset, setAvatarDragOffset] = useState({ x: 0, y: 0 });

    const roomRef = useRef<HTMLDivElement>(null);
    const BASE_ITEM_SIZE = 15;

    // All renderable furniture combined
    const allFurniture = [...sharedFurniture, ...personalFurniture];

    // My personal furniture (for editing)
    const myFurniture = personalFurniture.filter(f => f.ownerId === currentUser?.id);

    const isEditingRef = useRef(isEditing);
    useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

    // ── Fetch lobby data with AbortController ──
    const fetchLobby = useCallback(async (signal?: AbortSignal) => {
        if (document.visibilityState === 'hidden') return;
        try {
            const res = await fetch(`/api/gamification/classroom-lobby?t=${Date.now()}`, { 
                cache: 'no-store',
                signal
            });
            if (!res.ok) return;
            const data = await res.json();

            setOnlineStudents(data.students || []);
            setSharedFurniture((data.sharedFurniture || []).map((f: any) => ({
                ...f, ownerId: undefined
            })));
            
            // Logic to prevent overwriting local edits during polling
            setPersonalFurniture((prev) => {
                if (isEditingRef.current) {
                    // While editing, we only want to see OTHER students' furniture updates
                    const othersItems = (data.personalFurniture || []).filter((f: any) => f.ownerId !== currentUser?.id);
                    const myLocalItems = prev.filter((f: any) => f.ownerId === currentUser?.id);
                    return [...othersItems, ...myLocalItems];
                }
                return data.personalFurniture || [];
            });

            // Set my avatar position from the server on first load
            const me = (data.students || []).find((s: OnlineStudent) => s.id === currentUser?.id);
            if (me && loading) {
                setMyAvatarPos({ x: me.avatarX, y: me.avatarY });
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Lobby fetch error:", err);
            }
        }
    }, [currentUser?.id, loading]);

    // Initial load + polling every 3s
    useEffect(() => {
        const controller = new AbortController();
        
        fetchLobby(controller.signal).then(() => setLoading(false));
        
        const interval = setInterval(() => fetchLobby(controller.signal), 3000);
        
        // Pause polling when tab is hidden to save RAM/CPU
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchLobby(controller.signal);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            controller.abort();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchLobby]);

    // Handle student taps for messaging
    const handleStudentClick = (studentId: string, studentName: string | null) => {
        if (isEditing) return;
        window.dispatchEvent(new CustomEvent('open-buff-modal', { 
            detail: { studentId, studentName: studentName || 'Estudiante' }
        }));
    };

    // Heartbeat: update my position every 3s (keeps me "online")
    // Optimization: only POST if position changed or every 10s as a fallback
    const lastSavedPos = useRef(myAvatarPos);
    const lastHeartbeatTime = useRef(Date.now());
    const currentPosRef = useRef(myAvatarPos);

    // Sync ref with state for use inside interval
    useEffect(() => {
        currentPosRef.current = myAvatarPos;
    }, [myAvatarPos]);

    useEffect(() => {
        if (!currentUser?.id) return;

        const heartbeat = setInterval(() => {
            const now = Date.now();
            const pos = currentPosRef.current;
            const moved = Math.abs(pos.x - lastSavedPos.current.x) > 0.5 || 
                          Math.abs(pos.y - lastSavedPos.current.y) > 0.5;
            const timeElapsed = now - lastHeartbeatTime.current > 10000;

            if (moved || timeElapsed) {
                fetch('/api/gamification/classroom-lobby', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatarX: pos.x, avatarY: pos.y }),
                    priority: 'low'
                }).catch(() => {});
                
                lastSavedPos.current = pos;
                lastHeartbeatTime.current = now;
            }
        }, 3000);

        return () => clearInterval(heartbeat);
    }, [currentUser?.id]); // Only start once, internal ref handles state sync

    // ── Save personal furniture (student's own items) ──
    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`/api/gamification/room`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    theme: "basic_room",
                    placements: myFurniture.map(f => ({
                        itemId: f.itemId,
                        positionX: f.positionX,
                        positionY: f.positionY,
                        positionZ: f.positionZ || 0,
                        rotation: f.rotation
                    }))
                })
            });
            // Save avatar position
            await fetch('/api/gamification/classroom-lobby', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatarX: myAvatarPos.x, avatarY: myAvatarPos.y })
            });
            setIsEditing(false);
            setSelectedFurnitureIndex(null);
            fetchLobby();
        } catch (error) {
            console.error("Failed to save room", error);
        }
        setSaving(false);
    };

    // ── Inventory counts (student's own items only) ──
    const ownedItems = isOwner ? (inventory[currentUser.id] || []).filter(item => item.startsWith("furn_")) : [];
    const ownedCounts: Record<string, number> = {};
    ownedItems.forEach(id => { ownedCounts[id] = (ownedCounts[id] || 0) + 1; });
    const placedCounts: Record<string, number> = {};
    myFurniture.forEach(f => { placedCounts[f.itemId] = (placedCounts[f.itemId] || 0) + 1; });
    const availableCount = (itemId: string) => (ownedCounts[itemId] || 0) - (placedCounts[itemId] || 0);
    const uniqueOwnedItemIds = Object.keys(ownedCounts);

    // Move the player's avatar directly to coordinates (Tap-to-Move/Sit)
    const moveTo = useCallback((clientX: number, clientY: number) => {
        if (!roomRef.current) return;
        const rect = roomRef.current.getBoundingClientRect();
        
        // Convert screen coordinates to percentage coordinates without adjusting for zoom manually
        // because rect.width and rect.height already account for the scaled size.
        const xPercent = ((clientX - rect.left) / rect.width) * 100;
        const yPercent = ((clientY - rect.top) / rect.height) * 100;
        
        let best: any = null;

        // Check proximity to all sitting-capable furniture
        allFurniture.forEach(f => {
            const isSeat = f.itemId === 'furn_desk' || f.itemId === 'furn_teacher_desk';
            if (!isSeat) return;
            const dx = xPercent - f.positionX;
            const dy = yPercent - f.positionY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Snap to desk if clicked close enough (within 10% map distance relative to standard click bounds)
            if (dist < 16 && (!best || dist < best.dist)) {
                // Position avatar precisely on the chair seat and capture the desk ID for orientation
                // Adjusted offset: moved X towards negative to shift the avatar left visually
                best = { dist, x: f.positionX - 0.5, y: f.positionY + 1.5, deskId: f.id };
            }
        });

        if (best) {
            // Keep bounds for the sitting position (should be safe anyway)
            setMyAvatarPos({ x: best.x, y: best.y });
            setCurrentDeskId(best.deskId || null);
        } else {
            // Ignore clicks that are outside the isometric floor boundaries
            if (!isInsideFloor(xPercent, yPercent)) return;

            setMyAvatarPos({ 
                x: xPercent, 
                y: yPercent 
            });
            setCurrentDeskId(null);
        }
    }, [allFurniture]);

    // Handle floor clicks for Tap-To-Move
    const onFloorClick = (e: React.MouseEvent) => {
        if (isEditing) return; // Ignore if in build mode
        // Only trigger if clicking directly on the floor container, not on UI/furniture that propagates
        if ((e.target as HTMLElement).closest('[data-furniture]') || (e.target as HTMLElement).closest('[data-avatar]')) return;
        moveTo(e.clientX, e.clientY);
    };

    // ── Sitting detection ──
    const SNAP_DISTANCE = 15;
    const currentDesk = allFurniture.find(f => f.id === currentDeskId);
    const isSitting = currentDesk !== undefined;

    // Check if another student is sitting at a desk
    const isStudentSitting = (student: OnlineStudent) => {
        return allFurniture.some(f => {
            if (f.itemId !== 'furn_desk') return false;
            const dx = student.avatarX - f.positionX;
            const dy = student.avatarY - f.positionY;
            return Math.sqrt(dx * dx + dy * dy) < SNAP_DISTANCE;
        });
    };

    // ── Add personal item ──
    const addItemToRoom = (itemId: string) => {
        if (availableCount(itemId) <= 0) return;
        setPersonalFurniture(prev => [...prev, {
            itemId,
            positionX: 35 + Math.random() * 25,
            positionY: 45 + Math.random() * 25,
            positionZ: 0,
            rotation: 0,
            ownerId: currentUser?.id
        }]);
    };

    const rotateSelected = () => {
        if (selectedFurnitureIndex === null) return;
        const idx = selectedFurnitureIndex - sharedFurniture.length;
        if (idx < 0) return; // can't edit shared items
        setPersonalFurniture(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], rotation: (next[idx].rotation + 90) % 360 };
            return next;
        });
    };

    const flipSelected = () => {
        if (selectedFurnitureIndex === null) return;
        const idx = selectedFurnitureIndex - sharedFurniture.length;
        if (idx < 0) return;
        setPersonalFurniture(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], positionZ: next[idx].positionZ === 1 ? 0 : 1 };
            return next;
        });
    };

    const deleteSelected = () => {
        if (selectedFurnitureIndex === null) return;
        const idx = selectedFurnitureIndex - sharedFurniture.length;
        if (idx < 0) return;
        setPersonalFurniture(prev => prev.filter((_, i) => i !== idx));
        setSelectedFurnitureIndex(null);
    };

    // ── Coordinate helpers ──
    const getPosPct = useCallback((clientX: number, clientY: number) => {
        if (!roomRef.current) return { x: 50, y: 50 };
        const rect = roomRef.current.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100 / zoom,
            y: ((clientY - rect.top) / rect.height) * 100 / zoom,
        };
    }, [zoom]);

    // Furniture drag
    const onPointerDown = useCallback((e: React.PointerEvent, globalIndex: number) => {
        if (!isEditing) return;
        const localIdx = globalIndex - sharedFurniture.length;
        if (localIdx < 0) return; // can't drag shared items
        e.preventDefault();
        e.stopPropagation();
        setSelectedFurnitureIndex(globalIndex);
        setDragging(localIdx);
        const pos = getPosPct(e.clientX, e.clientY);
        const item = personalFurniture[localIdx];
        if (item) setDragOffset({ x: pos.x - item.positionX, y: pos.y - item.positionY });
    }, [isEditing, sharedFurniture.length, personalFurniture, getPosPct]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const pos = getPosPct(e.clientX, e.clientY);
        if (dragging !== null) {
            e.preventDefault();
            setPersonalFurniture(prev => {
                const next = [...prev];
                next[dragging] = {
                    ...next[dragging],
                    positionX: Math.max(0, Math.min(85, pos.x - dragOffset.x)),
                    positionY: Math.max(0, Math.min(85, pos.y - dragOffset.y)),
                };
                return next;
            });
        }
    }, [dragging, dragOffset, getPosPct]);

    const onPointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    const onRoomClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-furniture]') || (e.target as HTMLElement).closest('[data-avatar]')) return;
        setSelectedFurnitureIndex(null);
    }, []);

    const otherStudents = onlineStudents.filter(s => s.id !== currentUser?.id);

    return (
        <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col sm:flex-row relative max-h-[90vh]"
             style={{ background: '#0f0f2e' }}>

            <button onClick={onClose}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white/80 rounded-full hover:bg-black/70 transition z-30 backdrop-blur-sm">
                <X className="w-5 h-5" />
            </button>

            {/* ── SIDEBAR ── */}
            {isOwner && isEditing && (
                <div className="w-full sm:w-56 p-3 flex flex-col border-b sm:border-b-0 sm:border-r border-white/5 overflow-y-auto max-h-[25vh] sm:max-h-none"
                     style={{ background: '#161638' }}>
                    <h3 className="text-xs font-bold text-white/90 mb-1">🎒 Mis Objetos</h3>
                    <p className="text-[7px] text-white/30 mb-2">Coloca tus objetos en el salón compartido. Arrastra para mover.</p>

                    <div className="grid grid-cols-3 gap-1">
                        {uniqueOwnedItemIds.map(itemId => {
                            const info = FURNITURE_CATALOG[itemId];
                            const avail = availableCount(itemId);
                            return (
                                <button
                                    key={itemId}
                                    onClick={() => addItemToRoom(itemId)}
                                    disabled={avail <= 0}
                                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all border p-0.5 overflow-hidden relative
                                        ${avail > 0 ? 'bg-white/5 border-white/10 hover:border-[#73a4db]/50 hover:bg-[#346297]/10' : 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'}`}
                                >
                                    <img src={info?.image} alt={info?.label} className="w-10 h-10 object-contain" />
                                    <span className="text-[6px] text-white/50 font-bold truncate w-full text-center">{info?.label}</span>
                                    <span className={`absolute top-0.5 right-0.5 text-[7px] font-bold px-1 rounded-full ${avail > 0 ? 'bg-emerald-500/80 text-white' : 'bg-red-500/60 text-white'}`}>
                                        {avail}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {uniqueOwnedItemIds.length === 0 && (
                        <div className="text-center p-2 bg-white/5 rounded-lg mt-2">
                            <p className="text-[9px] text-white/40">¡Compra muebles en la tienda 💎!</p>
                        </div>
                    )}

                    {selectedFurnitureIndex !== null && selectedFurnitureIndex >= sharedFurniture.length && (
                        <div className="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-[8px] text-white/40 mb-1.5 font-bold uppercase tracking-wider">Mi mueble</p>
                            <div className="grid grid-cols-3 gap-1">
                                <button onClick={rotateSelected} className="flex items-center justify-center gap-0.5 bg-[#1c3a60]/60 hover:bg-[#346297]/60 text-white px-1.5 py-1.5 rounded-lg text-[8px] font-bold transition">
                                    <RotateCw className="w-3 h-3" /> Girar
                                </button>
                                <button onClick={flipSelected} className="flex items-center justify-center gap-0.5 bg-violet-600/60 hover:bg-violet-500/60 text-white px-1.5 py-1.5 rounded-lg text-[8px] font-bold transition">
                                    <FlipHorizontal className="w-3 h-3" /> Voltear
                                </button>
                                <button onClick={deleteSelected} className="flex items-center justify-center gap-0.5 bg-red-600/60 hover:bg-red-500/60 text-white px-1.5 py-1.5 rounded-lg text-[8px] font-bold transition">
                                    <Trash2 className="w-3 h-3" /> Quitar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── ROOM VIEW ── */}
            <div className="flex-1 relative overflow-hidden min-h-[450px] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-2 z-10 relative">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-black text-white/90 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
                            🏫 Salón de Clase
                        </h2>
                        <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            <Users className="w-3 h-3" />
                            <span>{onlineStudents.length} en línea</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
                            className="p-1 bg-black/40 text-white/60 rounded-lg hover:bg-black/60 transition">
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[8px] text-white/30 font-mono w-7 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
                            className="p-1 bg-black/40 text-white/60 rounded-lg hover:bg-black/60 transition">
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        {isOwner && (
                            <>
                                {!isEditing ? (
                                    <button onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-1 bg-[#1c3a60]/70 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] ml-1">
                                        <Edit3 className="w-3 h-3" /> Mis Objetos
                                    </button>
                                ) : (
                                    <button onClick={handleSave} disabled={saving}
                                        className="flex items-center gap-1 bg-emerald-600/70 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] ml-1">
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Guardar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center overflow-auto p-2"
                         onPointerMove={onPointerMove}
                         onPointerUp={onPointerUp}
                         onPointerLeave={onPointerUp}>

                        {/* Interaction Grid Plane */}
                        <div
                            ref={roomRef}
                            className="relative select-none pointer-events-auto cursor-pointer"
                            style={{
                                transform: `scale(${zoom}) rotate(${roomRotation}deg)`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.3s ease',
                            }}
                            onClick={onFloorClick}
                        >
                            {/* Background */}
                            <img src="/furniture/classroom_bg.png" alt="Salón" className="w-[520px] h-auto rounded-xl" draggable={false} />

                            {/* ── Shared furniture (teacher-placed, not editable by students) ── */}
                            {sharedFurniture.map((f, i) => {
                                const info = FURNITURE_CATALOG[f.itemId];
                                if (!info) return null;
                                return (
                                    <div key={`shared-${i}`} className="absolute pointer-events-none"
                                        style={{
                                            left: `${f.positionX}%`, top: `${f.positionY}%`,
                                            width: `${BASE_ITEM_SIZE * info.scale}%`, height: `${BASE_ITEM_SIZE * info.scale}%`,
                                            zIndex: 10 + Math.round(f.positionY),
                                        }}>
                                        <img src={info.image} alt={info.label}
                                            className="w-full h-full object-contain"
                                            style={{
                                                transform: `rotate(${f.rotation}deg) scaleX(${f.positionZ === 1 ? -1 : 1})`,
                                                transformOrigin: 'center center',
                                                filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.4))',
                                            }}
                                            draggable={false} />
                                    </div>
                                );
                            })}

                            {/* ── Personal furniture (student-placed, editable by owner) ── */}
                            {personalFurniture.map((f, i) => {
                                const info = FURNITURE_CATALOG[f.itemId];
                                if (!info) return null;
                                const globalIdx = sharedFurniture.length + i;
                                const isSelected = selectedFurnitureIndex === globalIdx;
                                const isMine = f.ownerId === currentUser?.id;

                                return (
                                    <div key={`personal-${i}`}
                                        data-furniture="true"
                                        onPointerDown={(e) => isMine ? onPointerDown(e, globalIdx) : undefined}
                                        onClick={(e) => { e.stopPropagation(); if (isEditing && isMine) setSelectedFurnitureIndex(globalIdx); }}
                                        className={`absolute touch-none ${isEditing && isMine ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                        style={{
                                            left: `${f.positionX}%`, top: `${f.positionY}%`,
                                            width: `${BASE_ITEM_SIZE * info.scale}%`, height: `${BASE_ITEM_SIZE * info.scale}%`,
                                            zIndex: 10 + Math.round(f.positionY),
                                            transition: dragging === i ? 'none' : 'box-shadow 0.2s',
                                        }}>
                                        <img src={info.image} alt={info.label}
                                            className="w-full h-full object-contain pointer-events-none"
                                            style={{
                                                transform: `rotate(${f.rotation}deg) scaleX(${f.positionZ === 1 ? -1 : 1})`,
                                                transformOrigin: 'center center',
                                                filter: `drop-shadow(2px 4px 4px rgba(0,0,0,0.4))${isSelected ? ' drop-shadow(0 0 8px rgba(56,189,248,0.7))' : ''}`,
                                                transition: 'transform 0.3s ease',
                                            }}
                                            draggable={false} />
                                        {/* Invisible overlay for tap-to-sit / select interaction to block floor clicks */}
                                        <div 
                                            className="absolute inset-0 z-10 cursor-pointer" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isEditing) {
                                                    // Built mode managed via drag events
                                                } else {
                                                    // Interaction mode: tap to move/sit
                                                    moveTo(e.clientX, e.clientY);
                                                }
                                            }} 
                                        />
                                        {isSelected && isEditing && (
                                            <div className="absolute inset-0 border-2 border-[#73a4db] rounded-lg border-dashed animate-pulse pointer-events-none" />
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Other students' avatars ── */}
                            {otherStudents.map(student => {
                                const sitting = isStudentSitting(student);
                                return (
                                    <div key={student.id}
                                        className="absolute flex flex-col items-center cursor-pointer group"
                                        onClick={() => handleStudentClick(student.id, student.name)}
                                        style={{
                                            left: `${student.avatarX}%`,
                                            top: `${student.avatarY}%`,
                                            zIndex: 40 + Math.round(student.avatarY),
                                            transition: 'left 1s ease, top 1s ease',
                                        }}>
                                        <img
                                            src={sitting ? '/furniture/avatar_student_sitting_back.png' : '/furniture/avatar_student.png'}
                                            alt={student.name || 'Estudiante'}
                                            className="w-[55px] h-auto group-hover:scale-110 transition-transform pointer-events-none"
                                            style={{ 
                                                filter: 'drop-shadow(2px 3px 5px rgba(0,0,0,0.4)) hue-rotate(180deg) brightness(1.1)',
                                                // Default sitting avatar faces top-left. scaleX(-1) makes it face top-right (blackboard).
                                                transform: sitting ? 'scaleX(-1)' : 'none' 
                                            }}
                                            draggable={false}
                                        />
                                        <span className="text-[7px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full mt-0.5 shadow whitespace-nowrap">
                                            {student.name}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* ── My avatar (draggable replaced by tap-to-move) ── */}
                            <div
                                data-avatar="true"
                                className="absolute flex flex-col items-center pointer-events-none"
                                style={{
                                    left: `${myAvatarPos.x}%`,
                                    top: `${myAvatarPos.y}%`,
                                    zIndex: 40 + Math.round(myAvatarPos.y),
                                    transition: draggingAvatar ? 'none' : 'left 0.3s ease, top 0.3s ease',
                                }}
                            >
                                <img
                                    src={isSitting ? '/furniture/avatar_student_sitting_back.png' : '/furniture/avatar_student.png'}
                                    alt={currentUser?.name || 'Yo'}
                                    className={`${isSitting ? 'w-[65px]' : 'w-[60px]'} h-auto hover:scale-105 transition-all pointer-events-none`}
                                    style={{ 
                                        filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))',
                                        // Match desk orientation, default to scaleX(-1) to face the top-right blackboard
                                        transform: isSitting ? (currentDesk?.positionZ === 1 ? 'none' : 'scaleX(-1)') : 'none'
                                    }}
                                    draggable={false}
                                />
                                <span className="text-[7px] font-bold text-white bg-fuchsia-600/80 px-1.5 py-0.5 rounded-full mt-0.5 shadow whitespace-nowrap">
                                    {currentUser?.name} (Tú)
                                </span>
                                {isSitting && (
                                    <span className="text-[6px] text-emerald-300 font-bold uppercase tracking-wider mt-0.5 drop-shadow-sm">📖 Estudiando</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-1.5 flex flex-col items-center gap-1 border-t border-white/5">
                    <div className="flex items-center gap-2 w-full max-w-xs">
                        <Orbit className="w-3 h-3 text-white/30" />
                        <input type="range" min={-45} max={45} value={roomRotation}
                            onChange={(e) => setRoomRotation(Number(e.target.value))}
                            className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#73a4db]" />
                        <button onClick={() => setRoomRotation(0)} className="text-[7px] text-white/30 hover:text-white/60 transition">Reset</button>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-white/25 font-medium">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {onlineStudents.length} alumnos</span>
                        <span>🪑 {allFurniture.length} muebles</span>
                        {otherStudents.length > 0 && (
                            <span className="text-emerald-400/50">
                                {otherStudents.map(s => s.name).join(', ')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
