const fs = require('fs');

let f = 'components/InteractiveLessonCard.tsx';
let data = fs.readFileSync(f, 'utf8');

// 1. Add SpeechSynthesis State at the top of the component
const targetState = `    const [isDownloading, setIsDownloading] = useState(false);`;
const replaceState = `    const [isDownloading, setIsDownloading] = useState(false);

    // TTS State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
            setSpeechSupported(false);
        }
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleSpeak = (textToSpeak: string) => {
        if (!speechSupported) return;
        
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const cleanText = textToSpeak.replace(/[\\[\\]*#_]/g, '').trim(); // Remove some markdown chars for reading
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-MX'; // Or generic 'es-ES'
        utterance.rate = 0.9;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };`;
data = data.replace(targetState, replaceState);

// 2. Add TTS Button to specific reading locations (like the guided practice statement)
const targetPractice = `                                {(statement || "Resuelve el siguiente acertijo.").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>`;
const replacePractice = `                                {(statement || "Resuelve el siguiente acertijo.").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                            </ReactMarkdown>
                        </div>
                        
                        {speechSupported && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleSpeak((statement || "Resuelve el siguiente acertijo.").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName))}
                                    className={\`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors \${isSpeaking ? 'bg-indigo-200 text-indigo-700 animate-pulse' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}\`}
                                    title="Leer en voz alta"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    {isSpeaking ? "Escuchando..." : "Escuchar"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>`;
data = data.replace(targetPractice, replacePractice);

// 3. Add to the main narrative view
const targetNarrative = `                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {safeParsePromptText(currentChunk || "").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                    </ReactMarkdown>
                </div>
            </div>`;
const replaceNarrative = `                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {safeParsePromptText(currentChunk || "").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName)}
                    </ReactMarkdown>
                </div>
                {speechSupported && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => handleSpeak(safeParsePromptText(currentChunk || "").replace(/\\[NOMBRE_DEL_ESTUDIANTE\\]/gi, studentName))}
                            className={\`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-sm \${isSpeaking ? 'bg-sky-200 text-sky-800 animate-pulse ring-2 ring-sky-400' : 'bg-white text-sky-600 border-2 border-sky-100 hover:bg-sky-50'}\`}
                            title="Leer en voz alta"
                        >
                            <Volume2 className="w-5 h-5" />
                            {isSpeaking ? "Pausar lectura" : "Leer en voz alta"}
                        </button>
                    </div>
                )}
            </div>`;
data = data.replace(targetNarrative, replaceNarrative);

fs.writeFileSync(f, data);
console.log("TTS Patched");
