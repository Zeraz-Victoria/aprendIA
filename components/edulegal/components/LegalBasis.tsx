import React from 'react';
import { AnalysisResult } from '../types';
import { LEGAL_FRAMEWORK } from '../constants';
import { BookOpen, Scale, FileCheck, Library } from 'lucide-react';

interface Props {
  analysis: AnalysisResult;
}

export const LegalBasis: React.FC<Props> = ({ analysis }) => {
  const selectedState = analysis.consideredDocuments[0] || "General";

  // Filtrar la base de conocimiento para mostrar solo lo relevante
  const filteredFramework = Object.entries(LEGAL_FRAMEWORK).filter(([key, name]) => {
    // Siempre mostrar leyes federales (no tienen prefijo de estado específico en su mayoría, 
    // pero podemos basarnos en si contienen "Veracruz" o no para este prototipo)
    const isVeracruz = name.includes('Veracruz') || key === 'L303' || key === 'LEEV' || key === 'L573' || key === 'CPV' || key === 'PROTOCOLO_SEV';

    if (selectedState === 'Veracruz') return true;

    // Si es otro estado, solo mostramos las que NO sean de Veracruz (asumimos federales)
    return !isVeracruz;
  });

  return (
    <div className="space-y-6">

      {/* Sección de Normativa Considerada para este caso */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-slate-800 font-bold flex items-center gap-2">
            <FileCheck size={20} className="text-blue-600" />
            Normativa Aplicada al Caso
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            El sistema ha seleccionado el siguiente marco jurídico de {selectedState} y Federal:
          </p>
        </div>
        <div className="p-6">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.consideredDocuments.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                <div className="min-w-[6px] h-[6px] rounded-full bg-blue-500 mt-2"></div>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sección de Artículos Específicos */}
      <div className="bg-green-50/50 rounded-xl p-6 border border-green-100">
        <h3 className="text-green-800 font-bold flex items-center gap-2 mb-4">
          <Scale size={20} /> Fundamentación Específica
        </h3>
        <div className="space-y-4">
          {analysis.legalBasis.map((ref, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
              <div className="flex items-start gap-3">
                <BookOpen className="text-green-600 mt-1 shrink-0" size={18} />
                <div>
                  <h4 className="font-semibold text-slate-800">{ref.document}</h4>
                  <p className="text-green-700 font-medium text-sm mt-1">{ref.article}</p>
                  <p className="text-slate-600 text-sm mt-2">{ref.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Base de Datos Completa Filtrada */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mt-8 opacity-90 hover:opacity-100 transition-opacity">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-100/50">
          <h3 className="text-slate-700 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Library size={18} />
            Acervo Normativo: {selectedState} / Federal
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Leyes y protocolos disponibles para consulta en este estado:
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-2">
            {filteredFramework.map(([key, name]) => (
              <div key={key} className="flex items-start gap-3 text-xs md:text-sm text-slate-500 p-2 hover:bg-white hover:text-slate-800 rounded border border-transparent hover:border-slate-200 transition-colors">
                <span className="font-mono font-bold text-slate-400 min-w-[60px] text-right">{key}</span>
                <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 p-4 text-center border-t border-slate-100 mt-4">
        Nota: Este análisis utiliza la normativa vigente de {selectedState === 'Veracruz' ? 'el Estado de Veracruz' : selectedState} y Federal.
        Para efectos legales vinculantes, consulte el Diario Oficial de la Federación y la Gaceta Oficial correspondiente.
      </div>
    </div>
  );
};