"use client";

import React, { useState, useEffect } from "react";
import { User, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Redirect after mount to avoid hydration mismatch
  useEffect(() => {
    if (mounted && status === "authenticated" && session?.user) {
      const role = (session.user as any)?.role;
      if (role === "SUPERADMIN") router.push("/superadmin");
      else router.push(role === "TEACHER" ? "/teacher" : "/student");
    }
  }, [mounted, status, session, router]);

  // Show a consistent loading state for both server and client
  if (!mounted || status === "loading" || (status === "authenticated" && session?.user)) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <div className="animate-pulse text-indigo-600 font-bold text-xl">Cargando...</div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoggingIn(true);
    setError("");

    // Clear any stale session
    await signOut({ redirect: false });

    const res = await signIn("credentials", {
      name: name.trim(),
      redirect: false,
    });

    if (res?.error) {
      setError("Usuario no encontrado. Verifica tu nombre o pide ayuda a tu profesor.");
      setIsLoggingIn(false);
    }
    // On success, useSession will update and the redirect logic above fires
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#fdf6e3] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 text-amber-900/10 animate-bounce-slow pointer-events-none">
        <Sparkles className="w-32 h-32" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black font-serif text-amber-900 mb-2 tracking-tight drop-shadow-sm">
            Edu<span className="text-indigo-600">Quest</span>
          </h1>
          <p className="text-amber-800/70 font-medium">
            Ingresa tu nombre para comenzar
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">¡Bienvenido!</h2>
            <p className="text-indigo-200 text-sm mt-1">Alumnos, Docentes y Admin</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Tu Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-medium text-slate-800"
                    placeholder="Ej. Jimena, Profe..."
                    autoFocus
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!name.trim() || isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoggingIn ? "Ingresando..." : <>Ingresar <ArrowRight className="w-5 h-5" /></>}
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Pide ayuda a tu profesor si no puedes ingresar.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-amber-900/40 text-sm font-semibold">
        © 2024 EduQuest • Learning Engine
      </footer>
    </main>
  );
}
