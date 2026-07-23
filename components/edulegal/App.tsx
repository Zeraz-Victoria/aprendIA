import React, { useState, useEffect } from 'react';
import { IncidentForm } from './components/IncidentForm';
import { ActionPlan } from './components/ActionPlan';
import { DocumentGenerator } from './components/DocumentGenerator';
import { LegalBasis } from './components/LegalBasis';
import { IncidentData, AnalysisResult, RiskLevel } from './types';
import { analyzeIncident } from './services/incidentProcessor';
import { Scale, AlertTriangle, FileText, ArrowLeft, ShieldCheck, Loader2, Sparkles } from 'lucide-react';

interface EduLegalAppProps {
    onBack: () => void;
}

function EduLegalApp({ onBack }: EduLegalAppProps) {
    const [incidentData, setIncidentData] = useState<IncidentData | null>(() => {
        const saved = localStorage.getItem('edulegal_incident');
        return saved ? JSON.parse(saved) : null;
    });
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
        const saved = localStorage.getItem('edulegal_analysis');
        return saved ? JSON.parse(saved) : null;
    });
    const [activeTab, setActiveTab] = useState<'guia' | 'docs' | 'legal'>(() => {
        return (localStorage.getItem('edulegal_tab') as any) || 'guia';
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (incidentData) localStorage.setItem('edulegal_incident', JSON.stringify(incidentData));
        else localStorage.removeItem('edulegal_incident');
    }, [incidentData]);

    useEffect(() => {
        if (analysis) localStorage.setItem('edulegal_analysis', JSON.stringify(analysis));
        else localStorage.removeItem('edulegal_analysis');
    }, [analysis]);

    useEffect(() => {
        localStorage.setItem('edulegal_tab', activeTab);
    }, [activeTab]);

    const handleIncidentSubmit = async (data: IncidentData) => {
        localStorage.setItem('pending_state', data.state);
        setIsLoading(true);
        try {
            const result = await analyzeIncident(data);
            setIncidentData(data);
            setAnalysis(result);
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            alert(`No se pudo completar el análisis: ${errorMessage}\n\nPor favor verifica tu conexión o intenta nuevamente.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setIncidentData(null);
        setAnalysis(null);
        setActiveTab('guia');
        localStorage.removeItem('edulegal_incident');
        localStorage.removeItem('edulegal_analysis');
        localStorage.removeItem('edulegal_tab');
    };

    const selectedState = incidentData?.state || "GENERAL";

    const getRiskColor = (risk: RiskLevel) => {
        switch (risk) {
            case RiskLevel.ALTO: return 'bg-red-100 text-red-700 border-red-200';
            case RiskLevel.MEDIO: return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    return (
        <div className="min-h-screen pb-12 relative bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-green-100 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Back to portal button */}
                        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-700 font-bold transition-colors group mr-2">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="hidden sm:inline">Portal</span>
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="bg-green-600 p-2 rounded-lg text-white ml-2">
                            <Scale size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 leading-tight">EduLegal</h1>
                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
                                ASISTENTE LEGAL / {selectedState}
                            </p>
                        </div>
                    </div>
                    {incidentData && !isLoading && (
                        <button onClick={handleReset} className="text-sm text-slate-500 hover:text-green-700 font-medium flex items-center gap-1">
                            <ArrowLeft size={16} /> Nuevo Reporte
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-white p-6 rounded-full shadow-sm border border-green-100">
                                <Loader2 size={48} className="text-green-600 animate-spin" />
                            </div>
                        </div>
                        <h3 className="mt-8 text-xl font-bold text-slate-800 text-center">Analizando Incidente...</h3>
                        <p className="text-slate-500 mt-2 text-center max-w-md">
                            Consultando protocolos de {localStorage.getItem('pending_state') || 'tu entidad'} y normativa federal.
                        </p>
                    </div>
                ) : !incidentData || !analysis ? (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-500">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full text-green-800 text-xs font-bold mb-4">
                                <Sparkles size={12} /> IMPULSADO POR IA JURÍDICA
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-3">Reporte de Incidente Escolar</h2>
                            <p className="text-slate-600">Completa el formulario para recibir un análisis legal inteligente basado en los protocolos vigentes de tu entidad federativa.</p>
                        </div>
                        <IncidentForm onSubmit={handleIncidentSubmit} />
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Classification Banner */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Diagnóstico IA en {selectedState}</p>
                                <h2 className="text-2xl font-bold text-slate-800">{analysis.classification}</h2>
                            </div>
                            <div className={`px-5 py-3 rounded-xl border ${getRiskColor(analysis.riskLevel)} flex items-center gap-3`}>
                                <AlertTriangle size={24} />
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-80">Nivel de Riesgo</p>
                                    <p className="text-lg font-bold">{analysis.riskLevel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200">
                            <button onClick={() => setActiveTab('guia')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-colors whitespace-nowrap ${activeTab === 'guia' ? 'bg-white text-green-700 border-x border-t border-slate-200 shadow-sm relative top-px' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                <ShieldCheck size={18} /> Guía de Actuación
                            </button>
                            <button onClick={() => setActiveTab('docs')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-colors whitespace-nowrap ${activeTab === 'docs' ? 'bg-white text-green-700 border-x border-t border-slate-200 shadow-sm relative top-px' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                <FileText size={18} /> Documentos Legales
                            </button>
                            <button onClick={() => setActiveTab('legal')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-colors whitespace-nowrap ${activeTab === 'legal' ? 'bg-white text-green-700 border-x border-t border-slate-200 shadow-sm relative top-px' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                <Scale size={18} /> Fundamento
                            </button>
                        </div>

                        <div className="min-h-[400px]">
                            {activeTab === 'guia' && <ActionPlan analysis={analysis} />}
                            {activeTab === 'docs' && <DocumentGenerator data={incidentData} analysis={analysis} />}
                            {activeTab === 'legal' && <LegalBasis analysis={analysis} />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default EduLegalApp;
