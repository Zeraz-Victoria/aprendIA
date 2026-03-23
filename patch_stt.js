const fs = require('fs');

let f = 'components/NotebookUploader.tsx';
let data = fs.readFileSync(f, 'utf8');

// 1. Add SpeechRecognition State & Lucide Icon imports
const targetImports = `import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X } from "lucide-react";`;
const replaceImports = `import { Camera, RefreshCw, Upload, CheckCircle, AlertCircle, X, Mic } from "lucide-react";`;
data = data.replace(targetImports, replaceImports);

// 2. Add STT State and Logic
const targetState = `  const [textEvidence, setTextEvidence] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);`;

const replaceState = `  const [textEvidence, setTextEvidence] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX'; // Or 'es-ES'
      
      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Append to existing text if it's a final result, otherwise just update with interim
        if (finalTranscript) {
           setTextEvidence(prev => prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript + ' ');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      setRecognitionSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Small trick to append a space before dictating more
      setTextEvidence(prev => prev.length > 0 && !prev.endsWith(' ') ? prev + ' ' : prev);
      recognitionRef.current.start();
    }
  };`;
data = data.replace(targetState, replaceState);

// 3. Add the mic button to the idle menu
const targetMenu = `                <div
                  onClick={() => setStep("text_input")}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-emerald-300 cursor-pointer hover:bg-emerald-50 transition-colors group"
                >
                  <span className="text-5xl mb-3">📝</span>
                  <span className="font-bold text-slate-600 text-center">Escribir</span>
                </div>
              </div>`;
const replaceMenu = `                <div
                  onClick={() => setStep("text_input")}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-4 border-dashed border-emerald-300 cursor-pointer hover:bg-emerald-50 transition-colors group"
                >
                  <span className="text-5xl mb-3">📝</span>
                  <span className="font-bold text-slate-600 text-center">Escribir</span>
                </div>
              </div>

              {recognitionSupported && (
                <div
                  onClick={() => {
                     setStep("text_input");
                     setTimeout(() => {
                         if (!isListening && recognitionRef.current) {
                             recognitionRef.current.start();
                         }
                     }, 300);
                  }}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-sky-50 dark:bg-sky-900/30 rounded-2xl border-2 border-sky-300 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors group"
                >
                  <div className="bg-sky-200 dark:bg-sky-800 p-2 rounded-full text-sky-600 dark:text-sky-300 group-hover:scale-110 transition-transform">
                      <Mic className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sky-700 dark:text-sky-300 text-lg">Dictar por Voz</span>
                </div>
              )}`;
data = data.replace(targetMenu, replaceMenu);

// 4. Add the Dictation Controls into the text_input view
const targetTextInput = `              <textarea
                className="flex-1 w-full p-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-400 outline-none resize-none font-medium text-slate-700 bg-slate-50/50"
                placeholder="Ejemplo: Para encontrar el área del cuadrado primero multipliqué..."
                value={textEvidence}
                onChange={e => setTextEvidence(e.target.value)}
              />
              <div className="flex gap-3">`;

const replaceTextInput = `              <div className="relative flex-1">
                  <textarea
                    className="w-full h-full p-4 pb-16 rounded-2xl border-2 border-indigo-100 focus:border-indigo-400 outline-none resize-none font-medium text-slate-700 bg-slate-50/50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    placeholder="Escribe o dicta tu respuesta..."
                    value={textEvidence}
                    onChange={e => setTextEvidence(e.target.value)}
                  />
                  {recognitionSupported && (
                      <button
                          onClick={toggleListening}
                          className={\`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-md transition-all \${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-300'}\`}
                      >
                          <Mic className="w-5 h-5" />
                          {isListening ? "Escuchando..." : "Dictar"}
                      </button>
                  )}
              </div>
              
              <div className="flex gap-3">`;
data = data.replace(targetTextInput, replaceTextInput);


fs.writeFileSync(f, data);
console.log("STT Patched");
