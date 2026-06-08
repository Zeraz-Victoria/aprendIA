"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Timer, Shuffle, VolumeX, Play, Square, RotateCcw } from "lucide-react";

export default function TeacherToolkit({ students, classroomId }: any) {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    // Randomizer State
    const [randomStudent, setRandomStudent] = useState<any>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    // Timer State
    const [time, setTime] = useState(300); // 5 minutes
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [inputMinutes, setInputMinutes] = useState("5");

    // Noise Meter State
    const [noiseLevel, setNoiseLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const visibleStudents = classroomId === "all" ? students : students.filter((s: any) => s.classroomId === classroomId);

    // --- RANDOMIZER ---
    const handlePickRandom = () => {
        if (!visibleStudents || visibleStudents.length === 0) return;
        setIsSpinning(true);
        setRandomStudent(null);
        
        let counter = 0;
        const interval = setInterval(() => {
            const r = visibleStudents[Math.floor(Math.random() * visibleStudents.length)];
            setRandomStudent(r);
            counter++;
            if (counter > 15) {
                clearInterval(interval);
                setIsSpinning(false);
            }
        }, 100);
    };

    // --- TIMER ---
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && time > 0) {
            interval = setInterval(() => setTime((t) => t - 1), 1000);
        } else if (time === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            // Play sound?
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, time]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- NOISE METER ---
    const startNoiseMeter = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateMeter = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                setNoiseLevel(average);
                requestAnimationFrame(updateMeter);
            };
            updateMeter();
        } catch (e) {
            console.error("Error accessing microphone:", e);
            alert("No se pudo acceder al micrófono.");
        }
    };

    const stopNoiseMeter = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setNoiseLevel(0);
    };

    useEffect(() => {
        if (activeTool === 'noise') {
            startNoiseMeter();
        } else {
            stopNoiseMeter();
        }
        return () => stopNoiseMeter();
    }, [activeTool]);


    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-[#0a2d1d] mb-6">Herramientas de Clase (Toolkit)</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                <button 
                    onClick={() => setActiveTool(activeTool === 'random' ? null : 'random')}
                    className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${activeTool === 'random' ? 'bg-[#0a2d1d] border-[#2e9f6c] text-white shadow-xl scale-105' : 'bg-white border-[#c1ebd5] text-[#0a2d1d] hover:border-[#2e9f6c]'}`}
                >
                    <Shuffle className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Al Azar</span>
                </button>
                <button 
                    onClick={() => setActiveTool(activeTool === 'timer' ? null : 'timer')}
                    className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${activeTool === 'timer' ? 'bg-[#0a2d1d] border-[#2e9f6c] text-white shadow-xl scale-105' : 'bg-white border-[#c1ebd5] text-[#0a2d1d] hover:border-[#2e9f6c]'}`}
                >
                    <Timer className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Temporizador</span>
                </button>
                <button 
                    onClick={() => setActiveTool(activeTool === 'noise' ? null : 'noise')}
                    className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${activeTool === 'noise' ? 'bg-[#0a2d1d] border-[#2e9f6c] text-white shadow-xl scale-105' : 'bg-white border-[#c1ebd5] text-[#0a2d1d] hover:border-[#2e9f6c]'}`}
                >
                    <Mic className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Ruido</span>
                </button>
            </div>

            {/* --- ACTIVE TOOL VIEW --- */}
            <div className="max-w-2xl mx-auto">
                {activeTool === 'random' && (
                    <div className="bg-white rounded-3xl p-10 flex flex-col items-center border-2 border-[#c1ebd5] shadow-xl animate-fade-in text-center">
                        <div className={`w-40 h-40 rounded-full flex items-center justify-center text-8xl mb-6 bg-[#f0fbf5] border-4 border-[#c1ebd5] transition-all duration-300 ${isSpinning ? 'animate-spin scale-110 shadow-2xl shadow-[#2e9f6c]/50' : 'shadow-inner'}`}>
                            {randomStudent?.avatar || '❓'}
                        </div>
                        <h3 className="text-3xl font-black text-[#0a2d1d] mb-8 min-h-[40px]">
                            {randomStudent ? randomStudent.name : '¿Quién será?'}
                        </h3>
                        <button 
                            onClick={handlePickRandom}
                            disabled={isSpinning || visibleStudents.length === 0}
                            className="bg-[#0a2d1d] hover:bg-[#165b3d] disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#0a2d1d]/30 flex items-center gap-2"
                        >
                            <Shuffle className="w-5 h-5" /> Elegir Alumno
                        </button>
                    </div>
                )}

                {activeTool === 'timer' && (
                    <div className="bg-white rounded-3xl p-10 flex flex-col items-center border-2 border-[#c1ebd5] shadow-xl animate-fade-in">
                        <div className={`text-9xl font-black mb-8 font-mono tabular-nums tracking-tighter ${time <= 10 && time > 0 ? 'text-rose-500 animate-pulse' : time === 0 ? 'text-rose-600' : 'text-[#0a2d1d]'}`}>
                            {formatTime(time)}
                        </div>
                        
                        <div className="flex gap-4 mb-8">
                            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95 ${isTimerRunning ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
                                {isTimerRunning ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                            </button>
                            <button onClick={() => { setIsTimerRunning(false); setTime(parseInt(inputMinutes) * 60 || 0); }} className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-lg transition-transform hover:scale-110 active:scale-95">
                                <RotateCcw className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-[#f0fbf5] p-2 rounded-xl">
                            <input 
                                type="number" 
                                value={inputMinutes} 
                                onChange={(e) => setInputMinutes(e.target.value)}
                                className="w-16 bg-white border border-[#c1ebd5] rounded-lg text-center font-bold text-[#0a2d1d] py-1"
                                min="1" max="60"
                            />
                            <span className="text-xs font-bold text-[#2e9f6c] uppercase tracking-widest pr-3">Minutos</span>
                            <button onClick={() => { setTime(parseInt(inputMinutes) * 60 || 0); setIsTimerRunning(false); }} className="bg-[#c1ebd5] hover:bg-[#2e9f6c] hover:text-white text-[#0a2d1d] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors">
                                Establecer
                            </button>
                        </div>
                    </div>
                )}

                {activeTool === 'noise' && (
                    <div className="bg-white rounded-3xl p-10 flex flex-col items-center border-2 border-[#c1ebd5] shadow-xl animate-fade-in text-center">
                        <div className="mb-6 relative w-64 h-64 flex items-center justify-center">
                            {/* Medidor visual */}
                            <div className="absolute inset-0 rounded-full border-8 border-[#f0fbf5]"></div>
                            <div 
                                className="absolute bottom-0 w-full bg-emerald-500 rounded-full transition-all duration-75"
                                style={{
                                    height: `${Math.min(100, noiseLevel * 1.5)}%`,
                                    background: noiseLevel > 80 ? '#ef4444' : noiseLevel > 50 ? '#f59e0b' : '#10b981',
                                    clipPath: 'circle(50% at 50% 50%)' // Para mantener la forma del círculo si se llena
                                }}
                            ></div>
                            {/* Inner circle mask */}
                            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center z-10 shadow-inner">
                                <span className={`text-5xl font-black ${noiseLevel > 80 ? 'text-rose-500' : noiseLevel > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {Math.round(noiseLevel)}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#0a2d1d]">Medidor de Ruido</h3>
                        <p className="text-sm text-[#2e9f6c] mt-2">Pide silencio si el nivel sube demasiado.</p>
                        {noiseLevel > 80 && (
                            <div className="mt-4 bg-rose-100 text-rose-700 px-4 py-2 rounded-xl font-bold text-sm animate-pulse border border-rose-200">
                                ¡Nivel de ruido muy alto! 🤫
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
