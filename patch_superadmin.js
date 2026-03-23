const fs = require('fs');

let f = 'app/superadmin/page.tsx';
let data = fs.readFileSync(f, 'utf8');

const target1 = `    if (loading || status === "loading") {`;
const replace1 = `    const handleUpdateSubscription = async (schoolId: string, plan: string, status: string) => {
        try {
            const res = await fetch("/api/superadmin/teachers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, subscriptionPlan: plan, subscriptionStatus: status })
            });
            if (res.ok) fetchTeachers();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading || status === "loading") {`;
data = data.replace(target1, replace1);

const target2 = `                                <div className="text-xs text-slate-500 mb-6 uppercase tracking-wider">
                                    ID: <span className="font-mono text-slate-400">{teacher.id}</span>
                                </div>`;
const replace2 = `                                <div className="text-xs text-slate-500 mb-4 uppercase tracking-wider flex justify-between items-center">
                                    <span>ID: <span className="font-mono text-slate-400">{teacher.id}</span></span>
                                    <span className={\`px-2 py-1 rounded-full text-[10px] font-bold \${teacher.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}\`}>
                                        {teacher.subscriptionStatus}
                                    </span>
                                </div>

                                <div className="mb-6 flex items-center justify-between gap-2">
                                    <select
                                        value={teacher.subscriptionPlan}
                                        onChange={(e) => handleUpdateSubscription(teacher.schoolId, e.target.value, teacher.subscriptionStatus)}
                                        className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none w-full"
                                    >
                                        <option value="BASIC">Básico (1 Mapa)</option>
                                        <option value="INTERMEDIATE">Medio (5 Mapas)</option>
                                        <option value="PREMIUM">Premium (10 Mapas)</option>
                                    </select>
                                    
                                    <button
                                        onClick={() => handleUpdateSubscription(teacher.schoolId, teacher.subscriptionPlan, teacher.subscriptionStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                        className={\`px-3 py-1 text-xs rounded font-bold transition-colors whitespace-nowrap \${teacher.subscriptionStatus === 'ACTIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}\`}
                                    >
                                        {teacher.subscriptionStatus === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                                    </button>
                                </div>`;
data = data.replace(target2, replace2);

fs.writeFileSync(f, data);
console.log("Patched superadmin page");
