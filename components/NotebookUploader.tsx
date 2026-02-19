"use client";

import React, { useState, useRef } from "react";
import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X } from "lucide-react";

type Step = "idle" | "preview" | "analyzing" | "feedback";

interface NotebookUploaderProps {
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

export default function NotebookUploader({ onComplete, onClose }: NotebookUploaderProps) {
  const [step, setStep] = useState<Step>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep("preview");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    setStep("analyzing");
    // Simulate AI delay
    setTimeout(() => {
      // Random mock result for prototype
      const isSuccess = Math.random() > 0.3; 
      setFeedback({
        correct: isSuccess,
        message: isSuccess
          ? "¡Excelente trabajo! Has aplicado correctamente el teorema."
          : "Casi lo tienes. Revisa el paso 2, parece que hay un error de signo.",
      });
      setStep("feedback");
      if (isSuccess) onComplete(true);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500" />
            Escanear Libreta
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[400px]">
          
          {step === "idle" && (
            <div className="text-center space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 bg-slate-50 dark:bg-slate-800 rounded-full border-4 border-dashed border-indigo-300 flex items-center justify-center mx-auto cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group"
              >
                <Camera className="w-16 h-16 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Toma una foto</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm px-8">
                  Asegúrate de que tu procedimiento sea legible y esté bien iluminado.
                </p>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          )}

          {step === "preview" && imagePreview && (
            <div className="w-full space-y-4">
              <div className="relative rounded-xl overflow-hidden shadow-md aspect-[3/4] bg-black">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setStep("idle"); setImagePreview(null); }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retomar
                </button>
                <button 
                  onClick={handleAnalyze}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Analizar
                </button>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full opacity-25"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-4xl">🤖</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 animate-pulse">Analizando procedimiento...</h4>
                <p className="text-slate-500 text-sm">Identificando números y fórmulas</p>
              </div>
            </div>
          )}

          {step === "feedback" && feedback && (
            <div className="text-center space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${feedback.correct ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {feedback.correct ? <CheckCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
              </div>
              
              <div className="space-y-2">
                <h4 className={`text-2xl font-bold ${feedback.correct ? 'text-green-700' : 'text-amber-700'}`}>
                  {feedback.correct ? "¡Correcto!" : "Revisión necesaria"}
                </h4>
                <div className={`p-4 rounded-xl text-left text-sm ${feedback.correct ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                   <p className="font-semibold mb-1">Feedback de la IA:</p>
                   {feedback.message}
                </div>
              </div>

              <button 
                onClick={onClose}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${feedback.correct ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {feedback.correct ? "Continuar Aventura" : "Intentar de nuevo"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
