const fs = require('fs');

let tFile = 'components/TeacherDashboard.tsx';
let tData = fs.readFileSync(tFile, 'utf8');

const tTarget = `    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 flex">`;

const tReplace = `    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 flex">
            {isSuspended && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white text-center py-3 font-bold shadow-lg flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    CUENTA SUSPENDIDA. NO PUEDE CREAR MAPAS NI ALUMNOS HASTA QUE SE REGULARICE SU SUSCRIPCIÓN.
                </div>
            )}`;

tData = tData.replace(tTarget, tReplace);
fs.writeFileSync(tFile, tData);

console.log("TeacherDashboard Banner patched successfully");
