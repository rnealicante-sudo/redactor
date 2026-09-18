import React, { useState, useRef, useEffect } from "react";
import { 
  Newspaper, 
  Radio, 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Clock, 
  Tag, 
  Share2,
  Mic2,
  Sliders,
  AlertCircle
} from "lucide-react";
import { NewsArticle } from "../types";
import { downloadBlob } from "../utils/exportHelpers";

interface NewsArticleViewProps {
  article: NewsArticle;
  audioName?: string;
}

export const NewsArticleView: React.FC<NewsArticleViewProps> = ({ article, audioName }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // TTS State
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [useBrowserVoice, setUseBrowserVoice] = useState(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clean up object url on unmount or new audio
  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyFullArticle = () => {
    const fullText = `${article.headline.toUpperCase()}\n${article.subheadline}\n\n${article.dateline} — ${article.leadParagraph}\n\n${article.body.join("\n\n")}\n\n[BOLETÍN DE RADIO 20-30s]\n${article.radioScript20s}`;
    handleCopy(fullText, "fullArticle");
  };

  // Generate TTS using Gemini Backend or fallback
  const handleGenerateTts = async () => {
    setIsGeneratingTts(true);
    setTtsError(null);
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
    setIsPlaying(false);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: article.radioScript20s,
          voice: selectedVoice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || "No se pudo generar la locución con IA.");
      }

      // Decode base64 WAV into a playable Blob URL
      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      setAudioBlobUrl(url);

      // Automatically play once ready
      setTimeout(() => {
        if (audioElementRef.current) {
          audioElementRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 200);

    } catch (err: any) {
      console.warn("Gemini TTS API error, offering browser speech fallback:", err);
      setTtsError(err.message || "Error en el servicio de locución IA. Puedes utilizar la locución del navegador.");
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // Native Browser Speech Synthesis fallback
  const handleSpeakWithBrowser = () => {
    if (!('speechSynthesis' in window)) {
      alert("Tu navegador no soporta síntesis de voz.");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(article.radioScript20s);
    utterance.lang = "es-ES";
    utterance.rate = playbackRate;

    // Try finding a Spanish female voice
    const voices = window.speechSynthesis.getVoices();
    const spanishFemaleVoice = voices.find(v => 
      v.lang.startsWith("es") && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("monica") || v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("helena") || v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("google"))
    ) || voices.find(v => v.lang.startsWith("es"));

    if (spanishFemaleVoice) {
      utterance.voice = spanishFemaleVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const togglePlayAudio = () => {
    if (!audioBlobUrl) {
      handleSpeakWithBrowser();
      return;
    }

    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.error("Playback error", e));
    }
  };

  const handleDownloadLocucion = () => {
    if (!audioBlobUrl) return;
    const a = document.createElement("a");
    a.href = audioBlobUrl;
    a.download = `boletin_locutado_${(article.headline.slice(0, 25)).replace(/[^a-zA-Z0-9]+/g, "_")}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Bar: Press Header Style */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest uppercase bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/20">
                  Agencia de Noticias
                </span>
                <span className="text-xs text-slate-400">
                  Redacción Periodística Profesional
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Crónica Periodística y Boletín de Radio
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyFullArticle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {copiedSection === "fullArticle" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Noticia copiada</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-300" />
                <span>Copiar Noticia Completa</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* ========================================================================= */}
        {/* RADIO / BROADCAST BULLETIN SECTION (20-30s) WITH AI PROFESSIONAL VOICE   */}
        {/* ========================================================================= */}
        <div className="relative rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 shadow-md border border-indigo-500/20 overflow-hidden">
          {/* Decorative background aura */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Title & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/30 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> EN EL AIRE
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Boletín Informativo de Radio (20 a 30 segundos)
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200/70 mt-0.5">
                    Síntesis condensada de alta fidelidad, lista para emisión en radio o podcast informativo.
                  </p>
                </div>
              </div>

              {/* Estimated duration tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-mono self-start sm:self-auto border border-white/10">
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                <span>~25 seg de lectura</span>
              </div>
            </div>

            {/* The 20-30s bulletin text with quotation card */}
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-4 sm:p-5 border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm sm:text-base leading-relaxed text-indigo-50 font-medium italic">
                  "{article.radioScript20s}"
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(article.radioScript20s, "radioScript")}
                  title="Copiar guion de radio"
                  className="shrink-0 p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedSection === "radioScript" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* AI Anchor Voice Generator Controls */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-indigo-200 font-medium flex items-center gap-1.5">
                    <Mic2 className="w-3.5 h-3.5 text-indigo-400" />
                    Voz de Locutora IA:
                  </span>
                  
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    disabled={isGeneratingTts || isPlaying}
                    className="bg-indigo-950/80 border border-indigo-400/40 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="Kore">Kore (Locutora Profesional - Tono Periodístico)</option>
                    <option value="Aoede">Aoede (Locutora Dinámica - Radio Matinal)</option>
                    <option value="Puck">Puck (Locutor Masculino - Informativo)</option>
                    <option value="Fenrir">Fenrir (Locutor Masculino - Institucional)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-generate-tts"
                    onClick={handleGenerateTts}
                    disabled={isGeneratingTts}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingTts ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Locutando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>{audioBlobUrl ? "Re-generar con Locutora IA" : "Locutar con Voz de Locutora IA"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSpeakWithBrowser}
                    title="Reproducción directa con voz del navegador"
                    className="p-2 text-xs bg-white/10 hover:bg-white/20 text-indigo-200 rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {ttsError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center justify-between text-xs text-rose-200 gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{ttsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSpeakWithBrowser}
                    className="underline text-white font-medium hover:text-rose-100 cursor-pointer shrink-0"
                  >
                    Usar voz local
                  </button>
                </div>
              )}

              {/* Audio Player for generated speech */}
              {audioBlobUrl && (
                <div className="mt-4 p-3.5 bg-indigo-950/90 border border-indigo-400/40 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                  <audio
                    ref={audioElementRef}
                    src={audioBlobUrl}
                    onTimeUpdate={() => setCurrentTime(audioElementRef.current?.currentTime || 0)}
                    onLoadedMetadata={() => setDuration(audioElementRef.current?.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-10 h-10 rounded-full bg-white text-indigo-950 flex items-center justify-center hover:bg-indigo-100 transition-transform active:scale-95 shrink-0 cursor-pointer shadow-sm"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex justify-between text-[11px] font-mono text-indigo-300 mb-1">
                      <span>{Math.floor(currentTime)}s</span>
                      <span className="text-white font-semibold">Locución IA ({selectedVoice})</span>
                      <span>{Math.floor(duration || 25)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 25}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        if (audioElementRef.current) audioElementRef.current.currentTime = val;
                      }}
                      className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleDownloadLocucion}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 transition-colors cursor-pointer"
                      title="Descargar audio locutado (.wav)"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Audio .WAV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINT / PRESS ARTICLE LAYOUT (NEWS AGENCY FORMAT)                         */}
        {/* ========================================================================= */}
        <article className="border-t border-slate-200 pt-6 space-y-6">
          {/* Section & Dateline */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-red-50 text-red-700 font-bold uppercase tracking-wider rounded-md border border-red-200 text-[11px]">
                {article.category || "Información General"}
              </span>
              <span className="font-semibold text-slate-700">
                {article.dateline}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Tag className="w-3 h-3" />
              <span>Fuente: Audio original ({audioName || "Archivo"})</span>
            </div>
          </div>

          {/* Headlines */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
              {article.headline}
            </h1>
            {article.subheadline && (
              <h2 className="text-base sm:text-lg text-slate-600 font-normal leading-snug">
                {article.subheadline}
              </h2>
            )}
          </div>

          {/* Lead Paragraph (Entradilla - 5W) */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border-l-4 border-indigo-600 text-slate-900 font-medium text-base sm:text-lg leading-relaxed shadow-2xs">
            <span className="font-bold text-indigo-900 mr-2">{article.dateline} —</span>
            {article.leadParagraph}
          </div>

          {/* Body Paragraphs */}
          <div className="space-y-4 text-slate-700 leading-relaxed text-sm sm:text-base">
            {article.body && article.body.map((para, idx) => (
              <p key={idx} className="text-justify text-slate-800">
                {para}
              </p>
            ))}
          </div>

          {/* Attribution Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Redactado con asistencia periodística de IA de alta fidelidad</span>
            <button
              type="button"
              onClick={handleCopyFullArticle}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar texto de la noticia
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
