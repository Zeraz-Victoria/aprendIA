const fs = require('fs');

let f = 'components/TeacherDashboard.tsx';
let data = fs.readFileSync(f, 'utf8');

// 1. Parent Report Button Injection (Find the AI report buttons)
const targetAiReport = `                                            <button
                                                onClick={async () => {
                                                    setIsGeneratingReport(true);
                                                    try {
                                                        const res = await fetch('/api/ai/generate-report', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ studentId: s?.id, studentName: s?.name })
                                                        });
                                                        const data = await res.json();
                                                        setAiReport(data.report);
                                                    } catch (e) {
                                                        setAiReport('Error al generar el reporte.');
                                                    }
                                                    setIsGeneratingReport(false);
                                                }}
                                                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                                            >
                                                <BrainCircuit className="w-4 h-4" /> Generar Reporte Completo con IA
                                            </button>
                                        </>`;

const replaceAiReport = `                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        setIsGeneratingReport(true);
                                                        try {
                                                            const res = await fetch('/api/ai/generate-report', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ studentId: s?.id, studentName: s?.name, reportType: 'teacher' })
                                                            });
                                                            const data = await res.json();
                                                            setAiReport(data.report);
                                                        } catch (e) {
                                                            setAiReport('Error al generar el reporte.');
                                                        }
                                                        setIsGeneratingReport(false);
                                                    }}
                                                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                >
                                                    <BrainCircuit className="w-4 h-4" /> Generar Reporte para Docente (IA)
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setIsGeneratingReport(true);
                                                        try {
                                                            const res = await fetch('/api/ai/generate-report', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ studentId: s?.id, studentName: s?.name, reportType: 'parent' })
                                                            });
                                                            const data = await res.json();
                                                            
                                                            // Generate PDF logic here conceptually
                                                            const doc = new jsPDF();
                                                            doc.setFont("helvetica", "bold");
                                                            doc.setFontSize(20);
                                                            doc.text("Reporte para Padres", 105, 20, { align: "center" });
                                                            
                                                            doc.setFont("helvetica", "normal");
                                                            doc.setFontSize(12);
                                                            const splitTitle = doc.splitTextToSize(data.title || "Reporte de Desempeño", 180);
                                                            doc.text(splitTitle, 20, 40);
                                                            
                                                            let y = 50;
                                                            if (Array.isArray(data.paragraphs)) {
                                                                data.paragraphs.forEach(p => {
                                                                    const lines = doc.splitTextToSize(p, 170);
                                                                    doc.text(lines, 20, y);
                                                                    y += (lines.length * 7) + 5;
                                                                });
                                                            } else {
                                                                const lines = doc.splitTextToSize(data.report || "", 170);
                                                                doc.text(lines, 20, y);
                                                                y += (lines.length * 7) + 5;
                                                            }
                                                            
                                                            if (data.homeActivity) {
                                                                doc.setFont("helvetica", "bold");
                                                                doc.text("Actividad sugerida en casa:", 20, y);
                                                                y += 10;
                                                                doc.setFont("helvetica", "normal");
                                                                const lines = doc.splitTextToSize(data.homeActivity, 170);
                                                                doc.text(lines, 20, y);
                                                            }
                                                            
                                                            doc.save(\`Reporte_\${s?.name.replace(/\\s+/g, '_')}.pdf\`);

                                                        } catch (e) {
                                                            console.error("PDF Generate Error", e);
                                                            alert('Error al generar el PDF para padres.');
                                                        }
                                                        setIsGeneratingReport(false);
                                                    }}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                >
                                                    <FileText className="w-4 h-4" /> Exportar Reporte para Padres (PDF)
                                                </button>
                                            </div>
                                        </>`;

data = data.replace(targetAiReport, replaceAiReport);


// 2. Add Emotion Trends Graphic below the Global Performance
const targetTrends = `                            {/* AI General Trends -> Dynamic Student Trends */}
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-teal-100">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-5 h-5 text-teal-500" /> Rendimiento por Alumno
                                </h3>`;

const replaceTrends = `                            {/* AI General Trends -> Dynamic Student Trends */}
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-teal-100 flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-5 h-5 text-teal-500" /> Rendimiento por Alumno
                                </h3>`;

data = data.replace(targetTrends, replaceTrends);

fs.writeFileSync(f, data);
console.log("Teacher dashboard patched");
