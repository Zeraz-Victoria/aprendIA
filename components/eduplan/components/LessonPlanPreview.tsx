
import React, { useState } from 'react';
import { LessonPlan, SecuenciaDidactica } from '../types';
import {
  Download,
  Clock,
  CheckCircle2,
  Loader2,
  Layers,
  User,
  ClipboardList,
  School,
  ShieldCheck,
  Zap,
  Briefcase,
  FileText,
  Target,
  Search,
  BookOpen,
  MapPin,
  Flame,
  Plus,
  Compass,
  Link as LinkIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  ShadingType
} from 'docx';

interface Props {
  plan: LessonPlan;
}

const LessonPlanPreview: React.FC<Props> = ({ plan }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const safeArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];
  const safeStr = (val: any, fallback: string = 'N/A') => (val && val !== 'undefined') ? String(val) : fallback;

  const exportToWord = async () => {
    setIsExportingWord(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: safeStr(plan.encabezado?.proyecto).toUpperCase(),
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `DOCENTE: ${safeStr(plan.encabezado?.docente)}`, bold: true }),
                new TextRun({ text: ` | GRADO: ${safeStr(plan.encabezado?.grado)} | FASE: ${safeStr(plan.encabezado?.fase)}`, bold: true }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            new Paragraph({ text: "ESTRUCTURA CURRICULAR", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CAMPOS FORMATIVOS", bold: true })] })], shading: { fill: "F1F5F9", type: ShadingType.CLEAR } }),
                    new TableCell({ children: [new Paragraph({ text: safeArray(plan.estructura_curricular?.campos_formativos).join(", ") })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "EJES ARTICULADORES", bold: true })] })], shading: { fill: "F1F5F9", type: ShadingType.CLEAR } }),
                    new TableCell({ children: [new Paragraph({ text: safeArray(plan.estructura_curricular?.ejes_articuladores).join(", ") })] }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: "VINCULACIÓN CURRICULAR", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 100 } }),
            ...safeArray(plan.estructura_curricular?.vinculacion).flatMap(v => [
              new Paragraph({ children: [new TextRun({ text: `Campo: ${v.campo}`, bold: true })], spacing: { before: 100 } }),
              new Paragraph({ children: [new TextRun({ text: `Contenido: ${v.contenido}`, italics: true })] }),
              ...safeArray(v.pdas).map(p => new Paragraph({ text: `• ${p}`, indent: { left: 400 } })),
            ]),

            new Paragraph({ text: "ESTRUCTURA CURRICULAR", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Campos Formativos", bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: safeArray(plan.estructura_curricular?.campos_formativos).join(", ") })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ejes Articuladores", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: safeArray(plan.estructura_curricular?.ejes_articuladores).join(", ") })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Propósito", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: safeStr(plan.estructura_curricular?.proposito) })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Diagnóstico", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: safeStr(plan.diagnostico_pedagogico) })] }),
                  ],
                }),
              ],
            }),

            new Paragraph({ text: "VINCULACIÓN CURRICULAR", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
            ...safeArray(plan.estructura_curricular?.vinculacion).map(v => new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: safeStr(v.campo).toUpperCase(), bold: true, color: "FFFFFF" })] })], shading: { fill: "1e293b", type: ShadingType.CLEAR } })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({ children: [new TextRun({ text: safeStr(v.contenido), bold: true })], spacing: { after: 100 } }),
                        ...safeArray(v.pdas).map(pda => new Paragraph({ text: `• ${pda}`, spacing: { before: 50 } })),
                        new Paragraph({ text: "" }) // Spacer
                      ]
                    })
                  ]
                })
              ]
            })),

            new Paragraph({ text: "SECUENCIA DIDÁCTICA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
            ...safeArray(plan.secuencia_didactica).flatMap((fase, fIdx) => [
              new Paragraph({ children: [new TextRun({ text: `FASE ${fIdx + 1}: ${safeStr(fase.fase_nombre).toUpperCase()}`, bold: true, size: 28 })], spacing: { before: 200, after: 200 } }),
              ...safeArray(fase.sesiones).map(sesion => new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `SESIÓN ${sesion.numero}: ${safeStr(sesion.titulo).toUpperCase()} (${sesion.duracion})`, bold: true, color: "FFFFFF" })] })], shading: { fill: "334155", type: ShadingType.CLEAR } })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: "INICIO", bold: true, color: "4f46e5" })], spacing: { before: 100 } }),
                          ...safeArray(sesion.inicio).map(a => new Paragraph({ text: `• ${a}` })),
                          new Paragraph({ children: [new TextRun({ text: "DESARROLLO", bold: true, color: "3b82f6" })], spacing: { before: 100 } }),
                          ...safeArray(sesion.desarrollo).map(a => new Paragraph({ text: `• ${a}` })),
                          new Paragraph({ children: [new TextRun({ text: "CIERRE", bold: true, color: "10b981" })], spacing: { before: 100 } }),
                          ...safeArray(sesion.cierre).map(a => new Paragraph({ text: `• ${a}` })),
                        ]
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Recursos: ", bold: true }), new TextRun({ text: safeArray(sesion.recursos).join(", ") }), new TextRun({ text: " | Evidencia: ", bold: true }), new TextRun({ text: safeStr(sesion.evidencia) })] })], shading: { fill: "f8fafc", type: ShadingType.CLEAR } })
                    ]
                  })
                ]
              }))
            ]),

            new Paragraph({ text: "EVALUACIÓN", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Técnica", bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: safeStr(plan.evaluacion_formativa?.tecnica) })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Instrumento", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: safeStr(plan.evaluacion_formativa?.instrumento) })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Evidencia", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: safeStr(plan.evaluacion_formativa?.evidencia_proceso) })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Criterios", bold: true })] })] }),
                    new TableCell({ children: safeArray(plan.evaluacion_formativa?.criterios).map(c => new Paragraph({ text: `• ${c}` })) }),
                  ],
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Planeacion_NEM_${safeStr(plan.encabezado?.proyecto).replace(/\s+/g, '_')}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar Word:", err);
    } finally {
      setIsExportingWord(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor: [number, number, number] = [79, 70, 229];
      const secondaryColor: [number, number, number] = [30, 41, 59];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const titleLines = doc.splitTextToSize(safeStr(plan.encabezado?.proyecto).toUpperCase(), contentWidth);
      doc.text(titleLines, margin, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`DOCENTE: ${safeStr(plan.encabezado?.docente)}`, margin, 35);
      doc.text(`GRADO: ${safeStr(plan.encabezado?.grado)} | FASE: ${safeStr(plan.encabezado?.fase)}`, margin, 40);

      let currentY = 55;

      autoTable(doc, {
        startY: currentY,
        head: [['ESTRUCTURA CURRICULAR', 'DETALLES']],
        body: [
          ['CAMPOS FORMATIVOS', safeArray(plan.estructura_curricular?.campos_formativos).join(', ')],
          ['EJES ARTICULADORES', safeArray(plan.estructura_curricular?.ejes_articuladores).join(', ')],
          ['PROPÓSITO', safeStr(plan.estructura_curricular?.proposito)],
          ['DIAGNÓSTICO', safeStr(plan.diagnostico_pedagogico)],
        ] as any,
        theme: 'grid',
        headStyles: { fillColor: primaryColor as any, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', fillColor: [249, 250, 251] } },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;

      autoTable(doc, {
        startY: currentY,
        head: [['CAMPO', 'CONTENIDOS Y PDA']],
        body: safeArray(plan.estructura_curricular?.vinculacion).map(v => [
          v.campo,
          `${v.contenido}\n\nPDA:\n${safeArray(v.pdas).map(p => '• ' + p).join('\n')}`
        ]) as any,
        theme: 'grid',
        headStyles: { fillColor: secondaryColor as any, fontSize: 9 },
        styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;

      safeArray(plan.secuencia_didactica).forEach((fase, fIdx) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFillColor(71, 85, 105);
        doc.rect(margin, currentY, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`FASE ${fIdx + 1}: ${safeStr(fase.fase_nombre).toUpperCase()}`, margin + 5, currentY + 5);
        currentY += 12;

        safeArray(fase.sesiones).forEach((sesion) => {
          autoTable(doc, {
            startY: currentY,
            head: [[`SESIÓN ${sesion.numero}: ${safeStr(sesion.titulo).toUpperCase()} (${sesion.duracion})`]],
            body: [
              [`INICIO:\n${safeArray(sesion.inicio).map(a => '• ' + a).join('\n')}`],
              [`DESARROLLO:\n${safeArray(sesion.desarrollo).map(a => '• ' + a).join('\n')}`],
              [`CIERRE:\n${safeArray(sesion.cierre).map(a => '• ' + a).join('\n')}`],
              [`RECURSOS: ${safeArray(sesion.recursos).join(', ')} | EVIDENCIA: ${sesion.evidencia}`]
            ] as any,
            theme: 'grid',
            headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
            styles: { fontSize: 7.5, overflow: 'linebreak', cellPadding: 3 },
            margin: { left: margin, right: margin }
          });
          currentY = (doc as any).lastAutoTable.finalY + 6;
          if (currentY > 260) { doc.addPage(); currentY = 20; }
        });
      });

      if (currentY > 230) { doc.addPage(); currentY = 20; }
      autoTable(doc, {
        startY: currentY,
        head: [['EVALUACIÓN FORMATIVA']],
        body: [
          [`TÉCNICA: ${safeStr(plan.evaluacion_formativa?.tecnica)}`],
          [`INSTRUMENTO: ${safeStr(plan.evaluacion_formativa?.instrumento)}`],
          [`EVIDENCIA: ${safeStr(plan.evaluacion_formativa?.evidencia_proceso)}`],
          [`CRITERIOS:\n${safeArray(plan.evaluacion_formativa?.criterios).map(c => '• ' + c).join('\n')}`]
        ] as any,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 4 },
        margin: { left: margin, right: margin }
      });

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado por EduPlanAI | Página ${i} de ${totalPages}`, margin, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`EduPlanAI_${safeStr(plan.encabezado?.proyecto).replace(/\s+/g, '_')}.pdf`);
    } catch (err) { console.error(err); } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-12 sm:space-y-20">
      <div className="bg-white/40 backdrop-blur-md rounded-[3rem] p-8 sm:p-12 border border-white/80 shadow-premium relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-10">
          <div className="space-y-6 flex-1">
            <h2 className="text-4xl sm:text-6xl font-display font-black text-slate-900 leading-[1.1] tracking-tight">
              {plan.encabezado?.proyecto}
            </h2>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Docente</p>
                  <p className="text-sm font-black text-slate-800">{plan.encabezado?.docente}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grado / Fase</p>
                  <p className="text-sm font-black text-slate-800">{plan.encabezado?.grado} • {plan.encabezado?.fase}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-3 shrink-0 self-end md:self-auto">
            <button onClick={exportToPDF} disabled={isExporting} className="bg-slate-900 hover:bg-brand-600 text-white px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl group hover:-translate-y-1 active:scale-95 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">PDF</span>
            </button>
            <button onClick={exportToWord} disabled={isExportingWord} className="bg-white hover:bg-indigo-50 text-brand-600 px-8 py-5 rounded-2xl flex items-center justify-center gap-3 border border-brand-100 transition-all shadow-lg hover:-translate-y-1 active:scale-95 disabled:opacity-50">
              {isExportingWord ? <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> : <FileText className="w-5 h-5" />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Word</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/60 backdrop-blur rounded-[2.5rem] p-10 border border-white/80 shadow-premium">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Layers size={20} className="text-brand-500" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Campos Formativos</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {safeArray(plan.estructura_curricular?.campos_formativos).map((c, i) => (
                <span key={i} className="bg-brand-50 text-brand-700 px-6 py-3 rounded-2xl text-sm font-black border border-brand-100">{c}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-brand-600 rounded-[2.5rem] p-10 text-white shadow-2xl h-full">
            <div className="flex items-center gap-4 mb-6">
              <ShieldCheck className="w-6 h-6 text-white" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em]">Ejes Articuladores</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {safeArray(plan.estructura_curricular?.ejes_articuladores).map((e, i) => (
                <span key={i} className="text-[9px] font-black bg-white/10 px-4 py-2 rounded-xl border border-white/10">{e}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-center text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 flex items-center justify-center gap-3">
          <BookOpen className="w-4 h-4 text-indigo-600" /> Estructura Curricular y Vinculación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <h5 className="text-xl font-display font-black text-slate-900 leading-tight">Elementos Base</h5>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campos Formativos</p>
                <div className="flex flex-wrap gap-2">
                  {safeArray(plan.estructura_curricular?.campos_formativos).map((c, i) => (
                    <span key={i} className="bg-slate-50 px-3 py-1 rounded-full text-xs font-bold text-slate-600 border border-slate-100">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ejes Articuladores</p>
                <div className="flex flex-wrap gap-2">
                  {safeArray(plan.estructura_curricular?.ejes_articuladores).map((e, i) => (
                    <span key={i} className="bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold text-emerald-600 border border-emerald-100">{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <h5 className="text-xl font-display font-black text-slate-900 leading-tight">Diagnóstico y Propósito</h5>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Propósito</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed text-center">{plan.estructura_curricular?.proposito}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico Pedagógico</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-4">{plan.diagnostico_pedagogico}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {safeArray(plan.estructura_curricular?.vinculacion).map((item, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium flex flex-col space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{item.campo}</p>
                  <h5 className="text-xl font-display font-black text-slate-900 leading-tight">{item.contenido}</h5>
                </div>
              </div>
              <div className="space-y-3">
                {safeArray(item.pdas).map((pda, pIdx) => (
                  <div key={pIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[13px] font-medium text-slate-600 leading-relaxed flex gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {pda}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-16">
        <h3 className="text-center text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 flex items-center justify-center gap-3">
          <Flame className="w-4 h-4 text-brand-600" /> Secuencia Didáctica por Sesiones
        </h3>
        <div className="grid grid-cols-1 gap-12">
          {safeArray(plan.secuencia_didactica).map((fase, i) => (
            <div key={i} className="space-y-8">
              <div className="flex items-center gap-6 px-4">
                <span className="text-4xl font-display font-black text-brand-500 opacity-20">{i + 1}</span>
                <h4 className="text-2xl font-display font-black text-slate-900 tracking-tight uppercase">{fase.fase_nombre}</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
              </div>

              <div className="space-y-6">
                {safeArray(fase.sesiones).map((sesion, j) => (
                  <div key={j} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden">
                    <div className="bg-slate-950/2 p-6 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-sm">
                          {sesion.numero}
                        </div>
                        <h6 className="text-lg font-black text-slate-900 uppercase tracking-tight">{sesion.titulo}</h6>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock size={14} className="text-brand-500" /> {sesion.duracion}
                      </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Inicio</span>
                        </div>
                        <div className="space-y-3 pl-3">
                          {safeArray(sesion.inicio).map((act, k) => (
                            <div key={k} className="text-sm font-medium text-slate-600 leading-relaxed flex gap-2">
                              <span className="text-indigo-200 mt-1">•</span> {act}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 border-y lg:border-y-0 lg:border-x border-slate-100 py-6 lg:py-0 lg:px-8">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Desarrollo</span>
                        </div>
                        <div className="space-y-3 pl-3">
                          {safeArray(sesion.desarrollo).map((act, k) => (
                            <div key={k} className="text-sm font-medium text-slate-600 leading-relaxed flex gap-2">
                              <span className="text-blue-200 mt-1">•</span> {act}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cierre</span>
                        </div>
                        <div className="space-y-3 pl-3">
                          {safeArray(sesion.cierre).map((act, k) => (
                            <div key={k} className="text-sm font-medium text-slate-600 leading-relaxed flex gap-2">
                              <span className="text-emerald-200 mt-1">•</span> {act}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Briefcase size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recursos:</span>
                        <p className="text-xs font-bold text-slate-600">{safeArray(sesion.recursos).join(", ")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Target size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidencia:</span>
                        <p className="text-xs font-bold text-emerald-600">{sesion.evidencia}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-950 rounded-[4rem] p-10 sm:p-20 text-white shadow-2xl space-y-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <h3 className="text-4xl sm:text-5xl font-display font-black tracking-tight">Evaluación Formativa</h3>
          <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center gap-4">
            <ClipboardList className="w-8 h-8 text-brand-500" />
            <span className="text-lg font-black uppercase tracking-widest">PROCESUAL</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.4em]">Técnica</p>
            <p className="text-xl font-bold">{plan.evaluacion_formativa?.tecnica}</p>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Instrumento</p>
            <p className="text-xl font-bold">{plan.evaluacion_formativa?.instrumento}</p>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.4em]">Producto Final</p>
            <p className="text-xl font-bold">{plan.evaluacion_formativa?.evidencia_proceso}</p>
          </div>
          <div className="space-y-6">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em]">Criterios</p>
            <div className="space-y-3">
              {safeArray(plan.evaluacion_formativa?.criterios).map((c, i) => (
                <p key={i} className="text-sm font-medium italic text-slate-400 leading-relaxed flex gap-2"><span className="text-amber-500">•</span> {c}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanPreview;
