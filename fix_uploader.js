const fs = require('fs');

const file = 'components/NotebookUploader.tsx';
let data = fs.readFileSync(file, 'utf8');

// Add markdown imports
if (!data.includes('import ReactMarkdown')) {
    const importEndIndex = data.lastIndexOf('import ');
    const endOfLine = data.indexOf('\n', importEndIndex);
    
    const markdownImports = `\nimport ReactMarkdown from "react-markdown";\nimport remarkGfm from "remark-gfm";\nimport { ImageIcon, Sparkles } from "lucide-react";\n\nfunction fixImageUrl(src: string): string {\n    if (src.includes("pollinations.ai")) {\n        let prompt = "";\n        if (src.includes("/p/")) {\n            prompt = src.split("/p/")[1]?.split("?")[0]?.replace(/\\\\+/g, " ") || "";\n        } else if (src.includes("/prompt/")) {\n            prompt = decodeURIComponent(src.split("/prompt/")[1]?.split("?")[0] || "");\n        }\n        if (prompt) {\n            return \`https://image.pollinations.ai/prompt/\${encodeURIComponent(prompt)}?width=800&height=400&nologo=true\`;\n        }\n    }\n    return src;\n}\n\nfunction PollinationsImage({ src, alt }: { src?: string; alt?: string }) {\n    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");\n    const fixedSrc = src ? fixImageUrl(src) : "";\n\n    return status === "error" || !fixedSrc ? (\n        <div className="w-full rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-dashed border-indigo-200 p-6 text-center my-4">\n            <ImageIcon className="w-12 h-12 text-indigo-300 mx-auto mb-3" />\n            <p className="text-indigo-600 font-medium text-sm italic">{alt || "Ilustración"}</p>\n        </div>\n    ) : (\n        <div className="my-4 relative">\n            {status === "loading" && (\n                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 rounded-xl animate-pulse">\n                    <Sparkles className="w-8 h-8 text-indigo-300 animate-spin" />\n                </div>\n            )}\n            <img\n                src={fixedSrc}\n                alt={alt || "Ilustración"}\n                className="w-full rounded-xl shadow-md border border-indigo-100"\n                loading="lazy"\n                onLoad={() => setStatus("loaded")}\n                onError={() => setStatus("error")}\n            />\n        </div>\n    );\n}\n\nconst markdownComponents: any = {\n    img: ({ src, alt }: { src?: string; alt?: string }) => (\n        <PollinationsImage src={src} alt={alt} />\n    ),\n};\n`;
    
    data = data.slice(0, endOfLine + 1) + markdownImports + data.slice(endOfLine + 1);
}

// Replace the parsed problem logic
const targetString = `                    const activeProblem = parsed.evidenceProblem || parsed.practiceProblem;

                    if (activeProblem) {
                      return (
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{(activeProblem.statement || "").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}</p>
                        </div>
                      );
                    }`;

const replacementString = `                    const problemTextStr = parsed.originalProblemText || (parsed.practiceProblem && parsed.practiceProblem.statement) || (parsed.evidenceProblem && parsed.evidenceProblem.statement);

                    if (problemTextStr && typeof problemTextStr === 'string') {
                      return (
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {problemTextStr.replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                          </ReactMarkdown>
                        </div>
                      );
                    }`;

data = data.replace(targetString, replacementString);

// Also fallback text wrap formatting
const targetFallbackText = `                    // Fallback to stringified JSON if pattern doesn't match
                    return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(parsed, null, 2)}</pre>;
                  } catch (e) {
                    // Fallback to raw text if it's not JSON
                    let rawText = context;
                    try {
                      if (context.startsWith('"') && context.endsWith('"')) rawText = JSON.parse(context);
                    } catch (e2) { }
                    return <p className="whitespace-pre-wrap">{rawText}</p>;
                  }`;

const replacementFallbackText = `                    // Fallback to stringified JSON if pattern doesn't match
                    return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(parsed, null, 2)}</pre>;
                  } catch (e) {
                    // Fallback to raw text if it's not JSON
                    let rawText = context;
                    try {
                      if (context.startsWith('"') && context.endsWith('"')) rawText = JSON.parse(context);
                    } catch (e2) { }
                    return (
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {rawText.replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                    );
                  }`;

data = data.replace(targetFallbackText, replacementFallbackText);

fs.writeFileSync(file, data);
