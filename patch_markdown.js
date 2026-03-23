const fs = require('fs');
const file = 'components/InteractiveLessonCard.tsx';
let data = fs.readFileSync(file, 'utf8');

// The boss problem text currently uses:
// <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm col-span-12 lg:col-span-8">
//     <p className="text-xl text-slate-800 leading-relaxed font-handwriting">{data.content?.bossFight?.originalProblemText}</p>
// </div>

data = data.replace(
    /<p className="text-xl text-slate-800 leading-relaxed font-handwriting">{data\.content\?\.bossFight\?\.originalProblemText}<\/p>/g,
    `<div className="prose prose-slate dark:prose-invert prose-lg max-w-none text-xl text-slate-800 leading-relaxed font-handwriting">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {data.content?.bossFight?.originalProblemText || ""}
        </ReactMarkdown>
    </div>`
);

// We need to do the same for the hidden PDF layout:
// <p className="text-xl text-slate-800 mb-6">{data.content?.bossFight?.originalProblemText}</p>
data = data.replace(
    /<p className="text-xl text-slate-800 mb-6">{data\.content\?\.bossFight\?\.originalProblemText}<\/p>/g,
    `<div className="prose prose-slate prose-xl max-w-none text-slate-800 mb-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {data.content?.bossFight?.originalProblemText || ""}
        </ReactMarkdown>
    </div>`
);

fs.writeFileSync(file, data);
