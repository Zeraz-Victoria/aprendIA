import React, { useState } from 'react';
import { IncidentData, AnalysisResult, RiskLevel } from '../types';
import { Copy, FileText, Download, CheckSquare, AlertCircle } from 'lucide-react';

interface Props {
  data: IncidentData;
  analysis: AnalysisResult;
}

export const DocumentGenerator: React.FC<Props> = ({ data, analysis }) => {
  const [activeDoc, setActiveDoc] = useState<string>('acta');

  // Helper to format legal docs list for text injection
  const formattedLegalList = analysis.consideredDocuments.map(d => `- ${d}`).join('\n');

  // Helpers for new fields
  const formattedMeasures = analysis.disciplinaryMeasures?.map((m, i) => `${i + 1}.- ${m.toUpperCase()}`).join('\n') || 'PENDIENTE DE DETERMINAR POR CONSEJO TÉCNICO.';
  const formattedAgreements = analysis.finalAgreements?.map((a, i) => `${i + 1}.- ${a.toUpperCase()}`).join('\n') || '___________________________________________________________________';

  const getActaContent = () => {
    const stateName = data.state.toUpperCase();
    return `
SECRETARÍA DE EDUCACIÓN DE ${stateName}
SUBSECRETARÍA DE EDUCACIÓN BÁSICA
DIRECCIÓN GENERAL DE EDUCACIÓN [NIVEL]
ESCUELA: ___________________________________
CLAVE: __________________ ZONA: ______ SECTOR: ______

ACTA CIRCUNSTANCIADA DE HECHOS

EN LA LOCALIDAD DE [CIUDAD/MUNICIPIO], ESTADO DE ${stateName}, SIENDO LAS ${data.time} HORAS DEL DÍA ${data.date}, REUNIDOS EN EL LOCAL QUE OCUPA LA DIRECCIÓN DE ESTE CENTRO EDUCATIVO.

---------------------------------- I. INTERVINIENTES ----------------------------------
ESTANDO PRESENTES PARA DAR FE DE LOS HECHOS:
1. POR LA AUTORIDAD EDUCATIVA: [NOMBRE DEL DIRECTOR/DOCENTE]
2. PADRE/MADRE/TUTOR: [NOMBRE DEL TUTOR]
3. ALUMNO(A): [NOMBRE DEL ALUMNO]
4. TESTIGOS DE ASISTENCIA: __________________________________________________

------------------------------------- II. HECHOS -------------------------------------
EL C. ${data.reporter.toUpperCase()}, EN SU CARÁCTER DE ${data.reporter}, HACE CONSTAR QUE EN EL ÁREA DE ${data.location.toUpperCase()}:

${data.description.toUpperCase()}

--------------------------- III. FUNDAMENTACIÓN Y MOTIVACIÓN ---------------------------
CONSIDERANDO LA NARRATIVA ANTERIOR, Y CON FUNDAMENTO EN EL ARTÍCULO 3° DE LA CONSTITUCIÓN POLÍTICA DE LOS ESTADOS UNIDOS MEXICANOS, LA LEY DE EDUCACIÓN DE ${stateName}, LA LEY GENERAL DE LOS DERECHOS DE NNA, Y ESPECÍFICAMENTE:

${formattedLegalList}

SE DETERMINA QUE LA CONDUCTA ENCUADRA EN LA TIPOLOGÍA: ${analysis.classification.toUpperCase()}
CON UN NIVEL DE RIESGO: ${analysis.riskLevel.toUpperCase()}.

-------------------------- IV. MEDIDAS Y SANCIONES FORMATIVAS --------------------------
CON BASE EN LOS ACUERDOS DE CONVIVENCIA ESCOLAR Y APLICANDO EL PRINCIPIO DE PROPORCIONALIDAD, SE DETERMINAN LAS SIGUIENTES MEDIDAS DISCIPLINARIAS:

${formattedMeasures}

------------------------------ V. ACUERDOS Y COMPROMISOS ------------------------------
PRIMERO.- SE SALVAGUARDA EN TODO MOMENTO LA INTEGRIDAD FÍSICA Y PSICOLÓGICA DE LOS MENORES INVOLUCRADOS, EVITANDO CUALQUIER TIPO DE REVICTIMIZACIÓN.

SEGUNDO.- ${analysis.riskLevel === RiskLevel.ALTO ? `SE ACTIVA EL PROTOCOLO DE CANALIZACIÓN A INSTANCIAS EXTERNAS DE MANERA INMEDIATA CONFORME AL PROTOCOLO DE ${stateName}.` : 'LAS PARTES INVOLUCRADAS ASUMEN LOS SIGUIENTES COMPROMISOS ESPECÍFICOS:'}

${formattedAgreements}

NO HABIENDO OTRO ASUNTO QUE TRATAR, SE LEVANTA LA PRESENTE ACTA SIENDO LAS ____ HORAS DEL DÍA DE SU INICIO, FIRMANDO AL CALCE Y AL MARGEN LOS QUE EN ELLA INTERVINIERON PARA SU DEBIDA CONSTANCIA LEGAL.

_____________________________               _____________________________
    DIRECTOR(A) ESCOLAR                          PADRE, MADRE O TUTOR

_____________________________               _____________________________
      DOCENTE DE GRUPO                           TESTIGO DE ASISTENCIA
    `.trim();
  };

  const getCitatorioContent = () => {
    const stateName = data.state;
    return `
SECRETARÍA DE EDUCACIÓN DE ${stateName.toUpperCase()}
ESCUELA [NOMBRE DE LA ESCUELA]
CLAVE: [CCT]

ASUNTO: CITATORIO URGENTE
FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}

C. PADRE DE FAMILIA, MADRE O TUTOR:
P R E S E N T E

Con fundamento en el Reglamento de Asociaciones de Padres de Familia y la Ley de Educación de ${stateName}, que establece la corresponsabilidad de los padres en el proceso educativo (Art. 31 Constitucional), se le solicita atentamente presentarse en la Dirección de esta escuela.

FECHA DE CITA: _______________________
HORA: _______________________

MOTIVO: Tratar asunto relacionado con la situación académica y conductual de su hijo(a), referente a un reporte de: ${analysis.classification.toUpperCase()}.

IMPORTANTE: Su asistencia es indispensable para garantizar el Interés Superior del Menor y dar seguimiento a los protocolos de actuación escolar. De no asistir, se asentará en el expediente del alumno para los fines administrativos y legales a que haya lugar.

ATENTAMENTE

_____________________________
DIRECTOR(A) DEL PLANTEL
SELLO OFICIAL
    `.trim();
  };

  const getCanalizacionContent = () => {
    const stateName = data.state.toUpperCase();
    return `
SECRETARÍA DE EDUCACIÓN DE ${stateName}
ESCUELA [NOMBRE DE LA ESCUELA]
CLAVE: [CCT] | ZONA: [ZONA]

OFICIO No. ___________/202X
ASUNTO: SE SOLICITA INTERVENCIÓN Y CANALIZACIÓN

A LA AUTORIDAD COMPETENTE
(FISCALÍA GENERAL DEL ESTADO / PROCURADURÍA DE PROTECCIÓN DE NNA / DIF MUNICIPAL):
P R E S E N T E

El que suscribe, Director(a) de la Escuela [NOMBRE], con clave [CCT], ubicada en [DIRECCIÓN], solicita su valiosa intervención para la atención del alumno(a) [NOMBRE DEL ALUMNO], con base en los siguientes:

H E C H O S
El día ${data.date}, se presentó una situación tipificada como ${analysis.classification.toUpperCase()} (NIVEL DE RIESGO: ${analysis.riskLevel}), consistente en:

${data.description}

FUNDAMENTACIÓN JURÍDICA
La presente solicitud obedece al cumplimiento de la obligación de notificación establecida en:
- Ley General de los Derechos de Niñas, Niños y Adolescentes (Art. 120).
- Ley de Educación de ${data.state} (Artículos aplicables).
- Protocolos de Convivencia Escolar de la Entidad Federativa.

Por lo anterior, solicito se dicten las MEDIDAS DE PROTECCIÓN necesarias y se brinde la atención psicológica, jurídica o médica que el caso amerite.

ATENTAMENTE

_____________________________
DIRECTOR(A) DEL PLANTEL
(Nombre, Firma y Sello)

c.c.p. Supervisión Escolar de Zona.
c.c.p. Expediente del Alumno.
    `.trim();
  };

  const renderContent = () => {
    switch (activeDoc) {
      case 'acta': return getActaContent();
      case 'citatorio': return getCitatorioContent();
      case 'canalizacion': return getCanalizacionContent();
      default: return '';
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(renderContent());
    alert('Documento copiado al portapapeles. Listo para pegar en Word y completar datos faltantes.');
  };

  const needsCanalization = analysis.riskLevel === RiskLevel.ALTO || !!analysis.canalizationBody;

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* Sidebar de Documentos Recomendados */}
      <div className="w-full lg:w-1/3 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <CheckSquare className="text-green-600" /> Documentos Oficiales
        </h3>
        <p className="text-xs text-slate-500 mb-2">Formatos alineados a la Normativa SEV</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setActiveDoc('acta')}
            className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${activeDoc === 'acta' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-green-300'}`}
          >
            Acta Circunstanciada <span className="opacity-80 text-xs bg-black/10 px-2 py-0.5 rounded">Obligatorio</span>
          </button>

          <button
            onClick={() => setActiveDoc('citatorio')}
            className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeDoc === 'citatorio' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-green-300'}`}
          >
            Citatorio Oficial a Padres
          </button>

          {needsCanalization && (
            <button
              onClick={() => setActiveDoc('canalizacion')}
              className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${activeDoc === 'canalizacion' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}
            >
              Oficio de Canalización <AlertCircle size={14} />
            </button>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800 leading-relaxed">
          <strong>Aviso Legal:</strong> Estos formatos están basados en los anexos de los protocolos vigentes. Recuerde llenar los campos subrayados (____) con los datos específicos de su centro de trabajo.
        </div>
      </div>

      {/* Visor de Documento */}
      <div className="w-full lg:w-2/3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
            <span className="font-semibold text-slate-700 uppercase text-sm tracking-wide">
              Vista Previa: {activeDoc === 'acta' ? 'Acta Circunstanciada' : activeDoc === 'canalizacion' ? 'Oficio de Canalización' : 'Citatorio'}
            </span>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} title="Copiar texto" className="p-2 hover:bg-white rounded text-slate-500 hover:text-green-700 transition-colors flex gap-2 items-center text-xs font-medium">
                <Copy size={16} /> Copiar
              </button>
            </div>
          </div>

          <div className="p-8 bg-white overflow-y-auto max-h-[600px] border-b-8 border-slate-100">
            <div className="font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed text-slate-800 select-all p-4 border border-dashed border-slate-200 rounded">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};