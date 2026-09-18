import React, { useState } from "react";
import { 
  FileAudio, 
  Sparkles, 
  RotateCcw, 
  AlertCircle, 
  FileText, 
  Share2, 
  Check,
  Newspaper,
  Radio,
  ListFilter,
  Download,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  X
} from "lucide-react";
import { AudioProcessingResult } from "./types";
import { AudioUploader } from "./components/AudioUploader";
import { TranscriptionView } from "./components/TranscriptionView";
import { SummaryCard } from "./components/SummaryCard";
import { NewspaperArticleView } from "./components/NewspaperArticleView";
import { RadioBulletinView } from "./components/RadioBulletinView";
import { ShareBar } from "./components/ShareBar";
import { fileToBase64, convertAudioToWav } from "./utils/audioHelper";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "summary" | "transcription" | "newspaper" | "radio">("all");
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  const handleSelectFile = (file: File | Blob, name: string) => {
    setSelectedFile(file);
    setFileName(name);
    setFileSize(file.size);
    setErrorMessage(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileName("");
    setFileSize(0);
    setErrorMessage(null);
  };

  const handleResetAll = () => {
    setSelectedFile(null);
    setFileName("");
    setFileSize(0);
    setResult(null);
    setErrorMessage(null);
    setActiveTab("all");
  };

  const handleProcessAudio = async (customInstructions: string) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep("Analizando formato de audio...");

    try {
      let fileToSend: File | Blob = selectedFile;
      let effectiveMime = selectedFile.type || "";
      let effectiveName = fileName || "audio.mp3";

      // If format is obscure (WMA, AMR, CAF, M4R, etc.), pre-convert to standard PCM WAV
      const ext = (effectiveName.split(".").pop() || "").toLowerCase();
      const obscureFormats = ["wma", "caf", "amr", "m4r", "mid", "midi"];
      if (obscureFormats.includes(ext)) {
        try {
          setProcessingStep("Optimizando códec de audio a WAV estándar...");
          fileToSend = await convertAudioToWav(selectedFile);
          effectiveMime = "audio/wav";
          effectiveName = effectiveName.replace(/\.[^/.]+$/, "") + ".wav";
        } catch (convErr) {
          console.warn("Pre-conversion note:", convErr);
        }
      }

      setProcessingStep("Codificando archivo de audio...");
      const base64Data = await fileToBase64(fileToSend);
      setProcessingStep("Generando resumen, transcripción, noticia y boletín de radio...");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: effectiveMime,
          fileName: effectiveName,
          customInstructions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // If the server rejected the format, transcode to standard WAV in browser and retry
        if (fileToSend === selectedFile) {
          try {
            setProcessingStep("Adaptando formato a WAV compatible y reintentando...");
            const wavBlob = await convertAudioToWav(selectedFile);
            const wavBase64 = await fileToBase64(wavBlob);

            const retryResponse = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: wavBase64,
                mimeType: "audio/wav",
                fileName: effectiveName.replace(/\.[^/.]+$/, "") + ".wav",
                customInstructions,
              }),
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok && retryData.success) {
              setProcessingStep("Finalizando transcripción y redacción...");
              setResult(retryData.data);
              return;
            }
          } catch (retryErr) {
            console.warn("WAV fallback conversion also failed:", retryErr);
          }
        }

        throw new Error(data.error || "Ocurrió un error al procesar el audio.");
      }

      setProcessingStep("Finalizando transcripción y redacción...");
      setResult(data.data);
    } catch (err: any) {
      console.error("Error:", err);
      setErrorMessage(err.message || "Error al procesar el archivo. Por favor verifica el formato.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs ring-2 ring-slate-900/10">
              <Newspaper className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  Ayudante de Redacción
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Mesa Editorial & Radio
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                1. Resumen minutado • 2. Transcripción con hablantes • 3. Crónica de prensa • 4. Boletín de radio (90s - España)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-export-single-file"
              onClick={() => setShowGitHubModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition-colors border border-indigo-200 cursor-pointer"
              title="Descargar index.html único para GitHub Pages o uso local"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">1 Archivo (GitHub / Local)</span>
              <span className="sm:hidden">GitHub</span>
            </button>

            {result && (
              <button
                type="button"
                id="btn-new-audio"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nuevo Audio</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No se pudo procesar el audio</p>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-8 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>

            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Procesando y redactando en orden informativo
              </h3>
              <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                {processingStep || "Generando resumen, transcripción, noticia y boletín de radio..."}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Estructurando: 1. Resumen y puntos clave • 2. Transcripción detallada • 3. Noticia periodística de periódico • 4. Boletín de radio de 90s
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Resumen y puntos clave
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Transcripción palabra por palabra
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Noticia estilo periódico
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Boletín radio 90s (locutora de España)
              </span>
            </div>
          </div>
        )}

        {/* View 1: Uploader View (when no result yet) */}
        {!result && (
          <div className="space-y-6">
            <AudioUploader
              selectedFile={selectedFile}
              fileName={fileName}
              fileSize={fileSize}
              onSelectFile={handleSelectFile}
              onClearFile={handleClearFile}
              onProcessAudio={handleProcessAudio}
              isProcessing={isProcessing}
            />

            {/* Feature preview cards showing the 4 steps in requested order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">1. Resumen y Puntos Clave</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Síntesis ejecutiva concisa y puntos destacados esenciales para una comprensión inmediata.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">2. Transcripción Detallada</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Texto íntegro palabra por palabra con diferenciación de hablantes, buscador y copiado.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">3. Noticia de Periódico</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Formato de prensa escrita con titular de impacto, entradilla, columnas y maquetación de diario.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">4. Boletín Radio (90s)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Guion de 90 segundos con locutora de radio de España (estilo RNE / SER), reproductor y descarga WAV.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Results View (when result is ready) */}
        {result && (
          <div className="space-y-8">
            {/* View Navigation Tabs in the exact requested order */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>Vista Completa (En Orden)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "summary"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>1. Resumen y Puntos Clave</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("transcription")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "transcription"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>2. Transcripción Detallada</span>
              </button>

              {result.newsArticle && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("newspaper")}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "newspaper"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <Newspaper className="w-4 h-4 text-stone-700" />
                    <span>3. Noticia Periodística (Periódico)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("radio")}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "radio"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <Radio className="w-4 h-4 text-indigo-500" />
                    <span>4. Boletín Radio (90s - España)</span>
                  </button>
                </>
              )}
            </div>

            {/* SECTIONS IN STRICT USER ORDER */}
            <div className="space-y-8">
              {/* 1. RESUMEN Y PUNTOS CLAVE (PRIMERO) */}
              {(activeTab === "summary" || activeTab === "all") && (
                <SummaryCard
                  summary={result.summary}
                  keyPoints={result.keyPoints}
                />
              )}

              {/* 2. TRANSCRIPCIÓN DETALLADA (LUEGO) */}
              {(activeTab === "transcription" || activeTab === "all") && (
                <TranscriptionView
                  transcription={result.fullTranscription}
                  audioName={result.audioName}
                />
              )}

              {/* 3. NOTICIA PERIODÍSTICA COMO SI FUERAS UN PERIÓDICO (LUEGO) */}
              {(activeTab === "newspaper" || activeTab === "all") && result.newsArticle && (
                <NewspaperArticleView
                  article={result.newsArticle}
                  audioName={result.audioName}
                  processedAt={result.processedAt}
                />
              )}

              {/* 4. BOLETÍN DE RADIO CON UN RESUMEN DE UNOS 60 SEGUNDOS CON VOZ DE LOCUTORA DE RADIO ESPAÑOLA DE ESPAÑA */}
              {(activeTab === "radio" || activeTab === "all") && result.newsArticle && (
                <RadioBulletinView
                  article={result.newsArticle}
                  audioName={result.audioName}
                />
              )}
            </div>

            {/* 5. BAJA ABAJO DE PODER COMPARTIR DESCARGAR Y COMPARTIR */}
            <div className="pt-4 border-t-2 border-slate-200">
              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Exportación y Distribución
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Descargar y Compartir
                </h3>
              </div>
              <ShareBar result={result} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5 text-amber-500" />
            Ayudante de Redacción
          </span>
          <span>1. Resumen minutado • 2. Transcripción • 3. Noticia de Periódico • 4. Boletín Radio (90s - Locutora España) • 5. Descargar y Compartir</span>
        </div>
      </footer>

      {/* Modal: Despliegue en GitHub y Archivo Único Local */}
      {showGitHubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                  🚀
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Archivo Único Autónomo para GitHub y Local
                  </h3>
                  <p className="text-xs text-slate-500">
                    Todo incluido en un solo archivo index.html listo para GitHub Pages o doble clic
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGitHubModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span>💡</span> ¿Por qué no se veía antes en GitHub?
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Los proyectos estándar en desarrollo apuntan a archivos TypeScript (.tsx) que los navegadores no pueden ejecutar en bruto sin compilar. Hemos empaquetado <strong>toda la aplicación en un único archivo index.html</strong> autónomo con estilos, interfaz y locutora nativa de España.
                </p>
                <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Se ha eliminado por completo la opción de grabar voz y cualquier permiso de micrófono.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Cómo publicarlo en GitHub Pages en 2 pasos:
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
                  <li>
                    Descarga el archivo con el botón de abajo y súbelo a la <strong>raíz</strong> de tu repositorio de GitHub.
                  </li>
                  <li>
                    En tu repositorio ve a <strong>Settings → Pages → Source</strong> (Branch: <code>main</code> o <code>master</code>, carpeta: <code>/(root)</code>) y pulsa <strong>Save</strong>.
                  </li>
                  <li>
                    ¡En 30 segundos estará publicado y visible en <code>https://tu-usuario.github.io/tu-repo/</code>!
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Cómo abrirlo en tu ordenador (modo local):
                </h4>
                <p className="text-xs text-slate-600">
                  Simplemente haz <strong>doble clic</strong> en el archivo <code>index.html</code> descargado. Se abrirá al instante en Chrome, Edge, Firefox o Safari sin necesidad de instalar nada.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <a
                href="/api/download-single-html"
                download="index.html"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar index.html (Archivo Único)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowGitHubModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

