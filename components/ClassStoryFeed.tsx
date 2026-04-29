"use client";

import React, { useState, useEffect } from "react";
import { Send, Image as ImageIcon, Heart } from "lucide-react";

export default function ClassStoryFeed({ classroomId, isTeacher = false }: { classroomId?: string, isTeacher?: boolean }) {
    const [posts, setPosts] = useState<any[]>([]);
    const [newPost, setNewPost] = useState("");

    useEffect(() => {
        fetch("/api/class-story")
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Si se pasa classroomId, podemos filtrar en front (o idealmente en back)
                    const filtered = classroomId && classroomId !== 'all' 
                        ? data.filter(p => !p.classroomId || p.classroomId === classroomId)
                        : data;
                    setPosts(filtered);
                }
            });
    }, [classroomId]);

    const handlePost = async () => {
        if (!newPost.trim()) return;
        const res = await fetch("/api/class-story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newPost, classroomId: classroomId === 'all' ? null : classroomId })
        });
        if (res.ok) {
            const post = await res.json();
            setPosts([post, ...posts]);
            setNewPost("");
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-6">
            {isTeacher && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EADFF0] mb-8">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-[#F8EDFB] rounded-full flex items-center justify-center text-xl shrink-0 border border-[#EADFF0]">🧑🏻‍🏫</div>
                        <div className="flex-1">
                            <textarea 
                                value={newPost}
                                onChange={e => setNewPost(e.target.value)}
                                placeholder="¿Qué está pasando en el salón?"
                                className="w-full bg-slate-50 border border-[#EADFF0] rounded-xl p-4 text-[#522566] font-medium focus:outline-none focus:ring-2 focus:ring-[#AD74C3] resize-none"
                                rows={3}
                            />
                            <div className="flex justify-between items-center mt-3">
                                <button className="text-[#AD74C3] hover:bg-[#F8EDFB] p-2 rounded-lg transition-colors flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Foto</span>
                                </button>
                                <button 
                                    onClick={handlePost}
                                    disabled={!newPost.trim()}
                                    className="bg-[#522566] hover:bg-[#7A3A8E] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-[#522566]/20"
                                >
                                    <Send className="w-4 h-4" /> Publicar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-3xl p-6 shadow-md border border-[#EADFF0] hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-[#F8EDFB] rounded-full flex items-center justify-center text-2xl border border-[#EADFF0] shadow-inner">
                                {post.teacher?.avatar || '🧑🏻‍🏫'}
                            </div>
                            <div>
                                <h4 className="font-bold text-[#522566] text-lg">{post.teacher?.name || 'Profesor'}</h4>
                                <p className="text-[10px] text-[#AD74C3] font-black tracking-widest uppercase">{new Date(post.createdAt).toLocaleDateString()} a las {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <p className="text-[#522566] mb-4 whitespace-pre-wrap font-medium leading-relaxed">{post.content}</p>
                        {post.imageUrl && (
                            <img src={post.imageUrl} alt="Class activity" className="rounded-2xl w-full object-cover mb-4 max-h-96 border border-[#EADFF0]" />
                        )}
                        <div className="pt-4 border-t border-[#EADFF0] flex items-center gap-4">
                            <button className="flex items-center gap-1.5 text-[#AD74C3] hover:text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                                <Heart className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Me gusta</span>
                            </button>
                        </div>
                    </div>
                ))}
                {posts.length === 0 && (
                    <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-3xl border border-[#EADFF0] border-dashed">
                        <div className="text-6xl mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">📸</div>
                        <h3 className="text-[#522566] font-black text-xl">Aún no hay publicaciones</h3>
                        <p className="text-sm text-[#AD74C3] font-bold mt-2">Comparte lo que ocurre en el salón para que los padres lo vean.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
