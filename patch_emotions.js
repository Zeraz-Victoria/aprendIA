const fs = require('fs');

let f = 'components/TeacherDashboard.tsx';
let data = fs.readFileSync(f, 'utf8');

const targetEmotion = `                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-5 h-5 text-teal-500" /> Rendimiento por Alumno
                                </h3>`;

const replaceEmotion = `                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-5 h-5 text-teal-500" /> Rendimiento y Emociones
                                        </h3>
                                        <p className="text-xs text-slate-400">🌐 Global — Todos los mapas activos</p>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Motivado</div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Dudoso</div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Frustrado</div>
                                    </div>
                                </div>`;

data = data.replace(targetEmotion, replaceEmotion);

// Remove the standalone line that was duplicate rendered previously
data = data.replace(/<p className="text-xs text-slate-400 mb-4">🌐 Global — Todos los mapas activos<\/p>/g, "");

fs.writeFileSync(f, data);
console.log("Emotions patched");
