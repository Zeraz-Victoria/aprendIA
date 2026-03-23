const fs = require('fs');

// 1. Fix InteractiveLessonCard.tsx renderGuidedPractice
let cardFile = 'components/InteractiveLessonCard.tsx';
let cardData = fs.readFileSync(cardFile, 'utf8');

const renderGuidedPracticeTarget = `    const renderGuidedPractice = () => {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-700">
                    <div className="bg-indigo-50 dark:bg-slate-700 p-6 rounded-xl border border-indigo-100 dark:border-slate-600">
                        <div className="prose prose-indigo dark:prose-invert prose-lg max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {(data.content?.practiceProblem?.statement || "").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>`;

const renderGuidedPracticeReplace = `    const renderGuidedPractice = () => {
        const statement = safeParsePromptText(
            data.content?.practiceProblem?.statement ||
            data.content?.evidenceProblem?.statement ||
            (data as any).originalProblemText ||
            data.content?.explanation?.analogy ||
            data.narrative
        );

        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-700">
                    <div className="bg-indigo-50 dark:bg-slate-700 p-6 rounded-xl border border-indigo-100 dark:border-slate-600">
                        <div className="prose prose-indigo dark:prose-invert prose-lg max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {(statement || "Resuelve el siguiente acertijo.").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>`;

cardData = cardData.replace(renderGuidedPracticeTarget, renderGuidedPracticeReplace);
fs.writeFileSync(cardFile, cardData);

// 2. Fix NotebookUploader.tsx extraction
let uploaderFile = 'components/NotebookUploader.tsx';
let uploaderData = fs.readFileSync(uploaderFile, 'utf8');

const uploaderContextTarget = `                    const problemTextStr = parsed.originalProblemText || (parsed.practiceProblem && parsed.practiceProblem.statement) || (parsed.evidenceProblem && parsed.evidenceProblem.statement);`;

const uploaderContextReplace = `                    const problemTextStr = parsed.originalProblemText || (parsed.practiceProblem && parsed.practiceProblem.statement) || (parsed.evidenceProblem && parsed.evidenceProblem.statement) || parsed.narrative || (parsed.content && parsed.content.practiceProblem && parsed.content.practiceProblem.statement);`;

uploaderData = uploaderData.replace(uploaderContextTarget, uploaderContextReplace);
fs.writeFileSync(uploaderFile, uploaderData);

// 3. Fix AdventureMap passing context to NotebookUploader
let mapFile = 'components/AdventureMap.tsx';
let mapData = fs.readFileSync(mapFile, 'utf8');

const mapUploaderTarget = `<NotebookUploader
                    context={JSON.stringify(getDayContent(selectedLevel.id)?.content || getDayContent(selectedLevel.id)?.narrative)}`;
const mapUploaderReplace = `<NotebookUploader
                    context={JSON.stringify(getDayContent(selectedLevel.id))}`;

mapData = mapData.replace(mapUploaderTarget, mapUploaderReplace);
fs.writeFileSync(mapFile, mapData);

// 4. Fix api/student-missions to allow replace, and TeacherDashboard to pass it
let apiMissionsFile = 'app/api/student-missions/route.ts';
let apiMissionsData = fs.readFileSync(apiMissionsFile, 'utf8');
apiMissionsData = apiMissionsData.replace(
    `const { studentId, worldId, days } = body;`,
    `const { studentId, worldId, days, replace } = body;`
);
apiMissionsData = apiMissionsData.replace(
    `const merged = [...existingDays, ...days];`,
    `const merged = replace ? days : [...existingDays, ...days];`
);
fs.writeFileSync(apiMissionsFile, apiMissionsData);

let teacherFile = 'components/TeacherDashboard.tsx';
let teacherData = fs.readFileSync(teacherFile, 'utf8');
teacherData = teacherData.replace(
    `worldId: studentCtx.world.id,
                    days: reviewDays`,
    `worldId: studentCtx.world.id,
                    days: reviewDays,
                    replace: true`
);
fs.writeFileSync(teacherFile, teacherData);

console.log("Replaced files for repeated review missions and student name formatting.");
