"use client";

import React, { useState, useEffect } from "react";
import { User, Key, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && status === "authenticated" && session?.user) {
      const role = (session.user as any)?.role;
      if (role === "SUPERADMIN") router.push("/superadmin");
      else router.push(role === "TEACHER" ? "/teacher" : "/student");
    }
  }, [mounted, status, session, router]);

  if (!mounted || status === "loading" || (status === "authenticated" && session?.user)) {
    return (
      <div style={{ background: '#f0f5fb' }} className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#cbe0f6] border-t-[#346297] animate-spin" />
          <p style={{ color: '#346297' }} className="font-semibold text-sm tracking-wide">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoggingIn(true);
    setError("");

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

  return (
    <main
      style={{ background: 'linear-gradient(160deg, #f0f5fb 0%, #cbe0f6 50%, #a2c4ec 100%)' }}
      className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden"
    >
      {/* Background decorative circles */}
      <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #73a4db, transparent)' }} />
      <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #346297, transparent)' }} />
      <div className="absolute bottom-10 right-16 pointer-events-none opacity-20">
        <Sparkles style={{ color: '#1c3a60' }} className="w-28 h-28 animate-bounce-slow" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ boxShadow: '0 25px 60px rgba(28, 58, 96,0.18)' }}>
          
          {/* Header */}
          <div
            style={{ background: 'linear-gradient(135deg, #1c3a60 0%, #346297 100%)' }}
            className="p-8 text-center relative overflow-hidden"
          >
            {/* Geometric decorations */}
            <div className="absolute top-[-20px] right-[-20px] w-28 h-28 rounded-full opacity-10" style={{ background: '#73a4db' }} />
            <div className="absolute bottom-[-10px] left-[-10px] w-16 h-16 rounded-full opacity-10" style={{ background: '#cbe0f6' }} />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-sm">
                Aprend<span style={{ color: '#cbe0f6' }}>IA</span>
              </h1>
              <p style={{ color: 'rgba(203, 224, 246,0.85)' }} className="font-medium text-sm">
                Ingresa a tu aula virtual
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8" style={{ background: '#ffffff' }}>
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Role Tabs */}
              <div className="flex rounded-2xl p-1.5 gap-1" style={{ background: '#cbe0f6' }}>
                <button
                  type="button"
                  onClick={() => setLoginRole("STUDENT")}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200"
                  style={loginRole === "STUDENT"
                    ? { background: '#1c3a60', color: 'white', boxShadow: '0 4px 12px rgba(28, 58, 96,0.3)' }
                    : { background: 'transparent', color: '#346297' }
                  }
                >
                  🧑‍🎓 Soy Alumno
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole("TEACHER")}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200"
                  style={loginRole === "TEACHER"
                    ? { background: '#1c3a60', color: 'white', boxShadow: '0 4px 12px rgba(28, 58, 96,0.3)' }
                    : { background: 'transparent', color: '#346297' }
                  }
                >
                  🎓 Soy Maestro
                </button>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1c3a60' }}>
                  Tu Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#73a4db' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition font-medium"
                    style={{
                      background: '#f0f5fb',
                      border: '1.5px solid #cbe0f6',
                      color: '#1c3a60',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#73a4db'; e.target.style.boxShadow = '0 0 0 3px rgba(115, 164, 219,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = '#cbe0f6'; e.target.style.boxShadow = 'none'; }}
                    placeholder={loginRole === "STUDENT" ? "Ej. Sofía, Diego..." : "Ej. Maestro Carlos"}
                    autoFocus
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {/* Student Codes */}
              {loginRole === "STUDENT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1c3a60' }}>
                      Código de Clase
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#73a4db' }} />
                      <input
                        type="text"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3 py-3 rounded-xl outline-none transition font-mono font-bold tracking-wider uppercase text-sm"
                        style={{ background: '#f0f5fb', border: '1.5px solid #cbe0f6', color: '#1c3a60' }}
                        onFocus={e => { e.target.style.borderColor = '#73a4db'; e.target.style.boxShadow = '0 0 0 3px rgba(115, 164, 219,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#cbe0f6'; e.target.style.boxShadow = 'none'; }}
                        placeholder="Opcional"
                        disabled={isLoggingIn}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1c3a60' }}>
                      Código Secreto <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#73a4db' }} />
                      <input
                        type="text"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3 py-3 rounded-xl outline-none transition font-mono font-bold tracking-wider uppercase text-sm"
                        style={{ background: '#f0f5fb', border: '1.5px solid #cbe0f6', color: '#1c3a60' }}
                        onFocus={e => { e.target.style.borderColor = '#73a4db'; e.target.style.boxShadow = '0 0 0 3px rgba(115, 164, 219,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = '#cbe0f6'; e.target.style.boxShadow = 'none'; }}
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
                <div>
                  <label className="block text-sm font-bold mb-2 flex justify-between" style={{ color: '#1c3a60' }}>
                    Contraseña <span className="text-xs font-normal" style={{ color: '#73a4db' }}>Obligatorio</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#73a4db' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition font-medium"
                      style={{ background: '#f0f5fb', border: '1.5px solid #cbe0f6', color: '#1c3a60' }}
                      onFocus={e => { e.target.style.borderColor = '#73a4db'; e.target.style.boxShadow = '0 0 0 3px rgba(115, 164, 219,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = '#cbe0f6'; e.target.style.boxShadow = 'none'; }}
                      placeholder="Tu contraseña..."
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl text-center border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!name.trim() || (loginRole === "STUDENT" && !studentCode.trim()) || (loginRole === "TEACHER" && !password.trim()) || isLoggingIn}
                className="w-full font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #1c3a60 0%, #346297 100%)',
                  boxShadow: '0 8px 24px rgba(28, 58, 96,0.35)',
                }}
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>Ingresar <ArrowRight className="w-5 h-5" /></>
                )}
              </button>

              <div className="text-center">
                <p className="text-xs" style={{ color: '#73a4db' }}>
                  {loginRole === "STUDENT" ? "Pide el código secreto a tu profesor." : "Ingresa con tu nombre registrado."}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-sm font-semibold" style={{ color: '#73a4db' }}>
        © 2025 AprendIA • Learning Engine
      </footer>
    </main>
  );
}
