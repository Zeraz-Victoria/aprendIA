const fs = require('fs');

let f = 'components/TeacherDashboard.tsx';
let data = fs.readFileSync(f, 'utf8');

// 1. Add "subscription" to activeTab state (conceptual, activeTab is string)

// 2. Add Sidebar Link
const targetSidebar = `                    <button
                        onClick={() => setActiveTab("insights")}
                        className={\`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all \${activeTab === 'insights' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-teal-50/50 hover:text-teal-600'}\`}
                    >
                        <BrainCircuit className="w-4 h-4" /> Análisis Inteligente
                    </button>
                </nav>`;

const replaceSidebar = `                    <button
                        onClick={() => setActiveTab("insights")}
                        className={\`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all \${activeTab === 'insights' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-teal-50/50 hover:text-teal-600'}\`}
                    >
                        <BrainCircuit className="w-4 h-4" /> Análisis Inteligente
                    </button>
                    <button
                        onClick={() => setActiveTab("subscription")}
                        className={\`w-full text-left px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all \${activeTab === 'subscription' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-purple-50/50 hover:text-purple-600'}\`}
                    >
                        <span>💳</span> Mi Suscripción
                    </button>
                </nav>`;

data = data.replace(targetSidebar, replaceSidebar);

// 3. Add Content View
const targetContent = `                {/* LIBRARY TAB */}
                {activeTab === 'library' && (`;

const replaceContent = `                {/* SUBSCRIPTION TAB */}
                {activeTab === 'subscription' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <header className="mb-8">
                            <h2 className="text-3xl font-black text-slate-800">Mi Plan Actual: {schoolInfo.plan}</h2>
                            <p className="text-slate-500 font-medium">Gestiona tu suscripción y amplía el poder de tu aula virtual.</p>
                            <p className="mt-2 text-sm text-slate-400">Estado: <span className={\`font-bold \${isSuspended ? 'text-red-500' : 'text-green-500'}\`}>{isSuspended ? 'SUSPENDIDA' : 'ACTIVA'}</span></p>
                        </header>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow">
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Plan Intermedio</h3>
                                <p className="text-slate-500 mb-6">Perfecto para profesores con múltiples grupos.</p>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex gap-2 items-center text-slate-700"><span className="text-green-500 font-bold">✓</span> Hasta 50 Alumnos concurrentes</li>
                                    <li className="flex gap-2 items-center text-slate-700"><span className="text-green-500 font-bold">✓</span> Hasta 5 Mapas Activos</li>
                                    <li className="flex gap-2 items-center text-slate-700"><span className="text-green-500 font-bold">✓</span> Análisis Predictivo Básico</li>
                                </ul>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/stripe/checkout', {
                                                method: 'POST', body: JSON.stringify({ plan: 'INTERMEDIATE' })
                                            });
                                            const data = await res.json();
                                            if (data.url) window.location.href = data.url;
                                        } catch (e) {
                                            alert("Error al conectar con pago");
                                        }
                                    }}
                                    className="w-full py-3 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-colors"
                                >
                                    Elegir Plan Intermedio ($9/mes)
                                </button>
                            </div>

                            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl relative overflow-hidden transform hover:scale-105 transition-transform">
                                <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xs px-4 py-1 rounded-bl-xl">MÁS POPULAR</div>
                                <h3 className="text-2xl font-bold text-white mb-2">Plan Premium</h3>
                                <p className="text-slate-400 mb-6">El poder total de la IA para toda la institución.</p>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex gap-2 items-center text-slate-300"><span className="text-yellow-400 font-bold">✓</span> Hasta 100 Alumnos concurrentes</li>
                                    <li className="flex gap-2 items-center text-slate-300"><span className="text-yellow-400 font-bold">✓</span> Hasta 10+ Mapas Activos</li>
                                    <li className="flex gap-2 items-center text-slate-300"><span className="text-yellow-400 font-bold">✓</span> IA Adaptativa y PDF para Padres</li>
                                </ul>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/stripe/checkout', {
                                                method: 'POST', body: JSON.stringify({ plan: 'PREMIUM' })
                                            });
                                            const data = await res.json();
                                            if (data.url) window.location.href = data.url;
                                        } catch (e) {
                                            alert("Error al conectar con pago");
                                        }
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all"
                                >
                                    Elegir Plan Premium ($19/mes)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LIBRARY TAB */}
                {activeTab === 'library' && (`;

data = data.replace(targetContent, replaceContent);

fs.writeFileSync(f, data);
console.log("Stripe patched");
