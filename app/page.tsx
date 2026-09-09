"use client";

import React, { useState, useEffect } from "react";
import { User, Key, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getDeviceFingerprint } from "@/lib/fingerprint";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [teacherAuthMode, setTeacherAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-sky-600 font-bold text-xl">Cargando...</div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    if (!name.trim()) return;

    setIsLoggingIn(true);
    setError("");

    // Clear any stale session
    await signOut({ redirect: false });

    const res = await signIn("credentials", {
      name: name.trim(),
      classCode: classCode.trim().toUpperCase(),
      studentCode: studentCode.trim().toUpperCase(),
      password: password.trim(),
      loginRole,
      redirect: false,
    });

    if (res?.error) {
      setError(loginRole === 'STUDENT' ? "Usuario no encontrado. Verifica tu nombre y tu código secreto." : "Credenciales incorrectas.");
      setIsLoggingIn(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (loginRole === "TEACHER" && teacherAuthMode === "REGISTER") {
      if (!password.trim()) {
        setError("La contraseña es requerida para crear tu cuenta.");
        return;
      }
      setIsLoggingIn(true);
      setError("");

      const fingerprint = getDeviceFingerprint();

      try {
        const res = await fetch("/api/auth/register-teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            password: password.trim(),
            fingerprint
          })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Error al crear la cuenta.");
          setIsLoggingIn(false);
          return;
        }

        // Iniciar sesión automáticamente
        await signOut({ redirect: false });
        const loginRes = await signIn("credentials", {
          name: name.trim(),
          password: password.trim(),
          loginRole: "TEACHER",
          redirect: false,
        });

        if (loginRes?.error) {
          setError("Cuenta creada exitosamente. Por favor ingresa tu contraseña.");
          setTeacherAuthMode("LOGIN");
          setIsLoggingIn(false);
        }
      } catch {
        setError("Error de red al conectar con el servidor.");
        setIsLoggingIn(false);
      }
    } else {
      await handleLogin(e);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 text-sky-900/10 animate-bounce-slow pointer-events-none">
        <Sparkles className="w-32 h-32" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black font-serif text-slate-800 mb-2 tracking-tight drop-shadow-sm">
            Aprend<span className="text-sky-600">IA</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Ingresa a tu aula virtual
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 p-8 text-center shadow-inner">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur shadow-sm">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">¡Bienvenido!</h2>
            <p className="text-sky-100 text-sm mt-1">Alumnos, Docentes y Admin</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleFormSubmit} className="space-y-6">

              {/* Role Selection Tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLoginRole("STUDENT")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginRole === "STUDENT" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  🏫 Soy Alumno
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("TEACHER")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginRole === "TEACHER" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  🎓 Soy Maestro
                </button>
              </div>

              {/* Sub-toggle para Maestro */}
              {loginRole === "TEACHER" && (
                <div className="flex bg-sky-50 rounded-lg p-1 border border-sky-100 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => { setTeacherAuthMode("LOGIN"); setError(""); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${teacherAuthMode === "LOGIN" ? "bg-sky-600 text-white shadow-sm" : "text-sky-700 hover:bg-sky-100/50"}`}
                  >
                    Ingresar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTeacherAuthMode("REGISTER"); setError(""); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${teacherAuthMode === "REGISTER" ? "bg-sky-600 text-white shadow-sm" : "text-sky-700 hover:bg-sky-100/50"}`}
                  >
                    ✨ Crear Cuenta (3 Días Gratis)
                  </button>
                </div>
              )}

              {/* Banner Promocional de Registro */}
              {loginRole === "TEACHER" && teacherAuthMode === "REGISTER" && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-fade-in">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 animate-bounce-slow" />
                  <div>
                    <strong className="block text-slate-900">🎁 ¡3 Días Gratis de Plan Medio!</strong>
                    <span>5 Mapas, hasta 50 alumnos y Tutor Gemini IA activados al crear tu cuenta.</span>
                  </div>
                </div>
              )}

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
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition font-medium text-slate-800"
                    placeholder={loginRole === "STUDENT" ? "Ej. Sofía, Diego..." : "Ej. Maestro Carlos"}
                    autoFocus
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {/* Student Codes */}
              {loginRole === "STUDENT" && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Código de Clase
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition font-mono font-bold text-slate-800 tracking-wider uppercase text-sm"
                        placeholder="Opcional"
                        disabled={isLoggingIn}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Código Secreto <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition font-mono font-bold text-slate-800 tracking-wider uppercase text-sm"
                        placeholder="Ej. DA8AXE"
                        disabled={isLoggingIn}
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Password */}
              {loginRole === "TEACHER" && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                    Contraseña <span className="text-xs font-normal text-slate-500">Obligatorio</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition font-medium text-slate-800"
                      placeholder="Tu contraseña..."
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!name.trim() || (loginRole === "STUDENT" && !studentCode.trim()) || (loginRole === "TEACHER" && !password.trim()) || isLoggingIn}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoggingIn
                  ? "Procesando..."
                  : loginRole === "TEACHER" && teacherAuthMode === "REGISTER"
                    ? <>Crear Cuenta y Comenzar Prueba <ArrowRight className="w-5 h-5" /></>
                    : <>Ingresar <ArrowRight className="w-5 h-5" /></>}
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  {loginRole === "STUDENT"
                    ? "Pide el código secreto a tu profesor."
                    : teacherAuthMode === "REGISTER"
                      ? "Crearás tu cuenta con 3 días gratis de prueba (1 cuenta por dispositivo)."
                      : "Ingresa con tu nombre registrado."}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-slate-400 text-sm font-semibold">
        © 2025 AprendIA • Learning Engine
      </footer>
    </main>
  );
}
