const fs = require('fs');

const safeParsePromptText = `
function safeParsePromptText(text: string | undefined): string {
    if (!text) return "";
    try {
        const trimmed = text.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
                if (parsed.originalProblemText) return parsed.originalProblemText;
                if (parsed.statement) return parsed.statement;
                if (parsed.narrative) return parsed.narrative;
                // If it's an array or just has random keys, try to stringify it prettier or just return it
                return JSON.stringify(parsed, null, 2);
            }
        }
    } catch (e) {
        // Not JSON, return as is
    }
    return text;
}
`;

function processFile(file, replaceTarget) {
    let data = fs.readFileSync(file, 'utf8');
    
    // Check if function already exists
    if (!data.includes('function safeParsePromptText')) {
        // Insert after imports
        const importEndIndex = data.lastIndexOf('import ');
        const endOfLine = data.indexOf('\n', importEndIndex);
        data = data.slice(0, endOfLine + 1) + '\n' + safeParsePromptText + '\n' + data.slice(endOfLine + 1);
    }

    // Replace usages
    replaceTarget.forEach(t => {
        data = data.replace(t.from, t.to);
    });

    fs.writeFileSync(file, data);
    console.log(`Updated ${file}`);
}


processFile('components/InteractiveLessonCard.tsx', [
    {
        from: /{data\.content\?\.bossFight\?\.originalProblemText \|\| ""}/g,
        to: '{safeParsePromptText(data.content?.bossFight?.originalProblemText)}'
    }
]);

processFile('components/VisualWorldBuilder.tsx', [
    {
        from: /\{node\.type === 'boss_fight' \? \(node as BossDayContent\)\.originalProblemText : \(node as DayContent\)\.narrative \|\| "Sin historia configurada\."\}/g,
        to: "{node.type === 'boss_fight' ? safeParsePromptText((node as BossDayContent).originalProblemText) : safeParsePromptText((node as DayContent).narrative) || 'Sin historia configurada.'}"
    },
    {
        from: /value=\{\(nodes\[editingNode\] as BossDayContent\)\.originalProblemText\}/g,
        to: "value={safeParsePromptText((nodes[editingNode] as BossDayContent).originalProblemText)}"
    },
    {
        from: /<div className="flex-1 whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 rounded border border-slate-200">\s*\{day\.type === 'boss_fight' \? \(day as BossDayContent\)\.originalProblemText : \(day as DayContent\)\.narrative\}\s*<\/div>/g,
        to: `<div className="flex-1 whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 rounded border border-slate-200">
                                            {day.type === 'boss_fight' ? safeParsePromptText((day as BossDayContent).originalProblemText) : safeParsePromptText((day as DayContent).narrative)}
                                        </div>`
    }
]);
