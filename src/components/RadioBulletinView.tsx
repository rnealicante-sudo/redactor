import React, { useState, useRef, useEffect } from "react";
import { 
  Radio, 
  Play, 
  Pause, 
  Square,
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Clock, 
  Mic, 
  Volume2, 
  RadioTower,
  Headphones,
  FileDown,
  Info,
  CheckCircle2
} from "lucide-react";
import { NewsArticle } from "../types";
import { downloadFile } from "../utils/formatters";

interface RadioBulletinViewProps {
  article: NewsArticle;
  audioName?: string;
}

export const RadioBulletinView: React.FC<RadioBulletinViewProps> = ({ article, audioName }) => {
  const [copied, setCopied] = useState(false);

  // The 90-second radio script (supports fallback to 60s/20s if legacy)
  const scriptText = article.radioScript90s || article.radioScript60s || article.radioScript20s || "";

  // Voice and TTS engine states
  const [selectedVoice, setSelectedVoice] = useState<string>("Kore");
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(90);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [activeEngine, setActiveEngine] = useState<"browser" | "cloud" | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);

  // Split script into sentences for smooth playback without browser SpeechSynthesis 15s timeout
  const sentences = React.useMemo(() => {
    if (!scriptText.trim()) return [];
    const matches = scriptText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
    return matches && matches.length > 0 ? matches.map((s) => s.trim()) : [scriptText.trim()];
  }, [scriptText]);

  // Browser voices from Spain (es-ES)
  const [availableSpainVoices, setAvailableSpainVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string>("");

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const browserTimerRef = useRef<number | null>(null);
  const activeSentenceRef = useRef<number>(-1);
  const keepAliveIntervalRef = useRef<number | null>(null);
  activeSentenceRef.current = activeSentenceIndex;

  // Word metrics
  const words = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  // Radio standard reading cadence: ~145 words per minute
  const estimatedSeconds = Math.round((words / 145) * 60) || 90;

  // Load available browser voices and filter for Spanish from Spain (es-ES)
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const allVoices = window.speechSynthesis.getVoices();
        const spainVoices = allVoices.filter(
          (v) => v.lang === "es-ES" || v.lang.startsWith("es_ES") || v.name.toLowerCase().includes("spain")
        );
        setAvailableSpainVoices(spainVoices);
        if (spainVoices.length > 0 && !selectedBrowserVoiceUri) {
          // Prefer natural Spanish female voices (Monica, Laura, Helena, Elvira, Google Español)
          const preferred = spainVoices.find(v => 
            v.name.toLowerCase().includes("monica") || 
            v.name.toLowerCase().includes("laura") || 
            v.name.toLowerCase().includes("helena") ||
            v.name.toLowerCase().includes("elvira") ||
            v.name.toLowerCase().includes("google") ||
            v.name.toLowerCase().includes("female")
          );
          setSelectedBrowserVoiceUri(preferred ? preferred.voiceURI : spainVoices[0].voiceURI);
        }
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedBrowserVoiceUri]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (browserTimerRef.current) {
        clearInterval(browserTimerRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, [audioBlobUrl]);

  // Copy script to clipboard
  const handleCopyScript = async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(scriptText);
        success = true;
      }
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = scriptText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download script as clean .txt file
  const handleDownloadScript = () => {
    const filename = `guion_radio_90s_${(audioName || "noticia").replace(/\.[^/.]+$/, "")}.txt`;
    const content = `BOLETÍN INFORMATIVO DE RADIO (90 SEGUNDOS - LOCUCIÓN EN ESPAÑOL)\n` +
      `Emisión recomendada: Estilo RNE / Cadena SER / Onda Cero\n` +
      `Duración estimada: ${estimatedSeconds} segundos (~${words} palabras)\n` +
      `------------------------------------------------------------\n\n` +
      `"${scriptText}"\n\n` +
      `------------------------------------------------------------\n` +
      `Generado con Ayudante de Redacción`;
    downloadFile(content, filename);
  };

  // Stop all browser speech and reset timers
  const stopBrowserSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (browserTimerRef.current) {
      clearInterval(browserTimerRef.current);
      browserTimerRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    setActiveSentenceIndex(-1);
  };

  // Sequential sentence player to avoid Chrome 15s freeze
  const playSentenceAtIndex = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (index >= sentences.length) {
      // Completed all sentences
      setIsPlaying(false);
      stopBrowserSpeech();
      setCurrentTime(estimatedSeconds);
      return;
    }

    setActiveSentenceIndex(index);
    const sentenceText = sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentenceText);
    utterance.lang = "es-ES";
    utterance.rate = playbackRate * 1.02;

    if (selectedBrowserVoiceUri) {
      const chosen = availableSpainVoices.find((v) => v.voiceURI === selectedBrowserVoiceUri);
      if (chosen) utterance.voice = chosen;
    }

    utterance.onend = () => {
      // Advance to next sentence
      playSentenceAtIndex(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") {
        return;
      }
      console.warn("Speech utterance notice:", e);
      // Advance to next sentence so audio doesn't stall
      playSentenceAtIndex(index + 1);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Live Spanish Broadcaster (Browser SpeechSynthesis)
  const handlePlayBrowserTts = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNoticeMessage("Tu navegador no soporta síntesis de voz.");
      return;
    }

    // If currently playing in browser mode, stop it
    if (isPlaying && activeEngine === "browser") {
      stopBrowserSpeech();
      setIsPlaying(false);
      return;
    }

    // Stop previous speech or cloud audio
    stopBrowserSpeech();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    setIsPlaying(true);
    setActiveEngine("browser");
    setCurrentTime(0);
    setDuration(estimatedSeconds);

    // Start elapsed timer for the 90 seconds
    const startTime = Date.now();
    browserTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(Math.min(elapsed, estimatedSeconds));
      if (elapsed >= estimatedSeconds) {
        if (browserTimerRef.current) clearInterval(browserTimerRef.current);
      }
    }, 200);

    // Chrome SpeechSynthesis keep-alive heartbeat
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 4000);

    // Start playing from first sentence
    playSentenceAtIndex(0);
  };

  // Cloud AI TTS synthesis (with automatic seamless fallback)
  const handleGenerateAiTts = async () => {
    setIsGeneratingTts(true);
    setNoticeMessage(null);

    // If cloud audio already generated, just play it
    if (audioBlobUrl) {
      if (audioElementRef.current) {
        window.speechSynthesis.cancel();
        stopBrowserTimer();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.playbackRate = playbackRate;
        audioElementRef.current.play().then(() => {
          setIsPlaying(true);
          setActiveEngine("cloud");
        }).catch(console.error);
        setIsGeneratingTts(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scriptText,
          voice: selectedVoice,
        }),
      });

      const data = await response.json();

      if (data.success && data.audioBase64) {
        // Convert base64 WAV into a playable Blob URL
        const byteCharacters = atob(data.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);

        setAudioBlobUrl(url);
        setActiveEngine("cloud");
        setNoticeMessage("✨ Locución sintetizada con IA generada con éxito. Puedes reproducirla o descargar el archivo WAV.");

        setTimeout(() => {
          if (audioElementRef.current) {
            audioElementRef.current.playbackRate = playbackRate;
            audioElementRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
              console.log("Autoplay prevented:", e);
            });
          }
        }, 150);
      } else {
        // Cloud API quota is full or unavailable - activate direct Spanish radio voice seamlessly!
        setNoticeMessage(
          "🎙️ La cuota diaria de la IA en la nube está completada. Activando la locutora en directo de España para reproducir el boletín de 90s al instante."
        );
        handlePlayBrowserTts();
      }
    } catch (err: any) {
      console.warn("TTS network issue, activating browser voice:", err);
      setNoticeMessage("🎙️ Activando la locutora en directo de España para emitir el boletín sin esperas.");
      handlePlayBrowserTts();
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // Unified Play/Pause toggle
  const togglePlayPause = () => {
    if (activeEngine === "browser") {
      if (isPlaying) {
        if ("speechSynthesis" in window) window.speechSynthesis.pause();
        stopBrowserSpeech();
        setIsPlaying(false);
      } else {
        handlePlayBrowserTts();
      }
      return;
    }

    if (activeEngine === "cloud" && audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.playbackRate = playbackRate;
        audioElementRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
      return;
    }

    // If nothing active yet, start the locutora
    handlePlayBrowserTts();
  };

  // Unified Stop
  const handleStop = () => {
    stopBrowserSpeech();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSentenceIndex(-1);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (activeEngine === "cloud" && audioElementRef.current) {
      audioElementRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (activeEngine === "cloud" && audioElementRef.current) {
      audioElementRef.current.playbackRate = rate;
    }
    if (activeEngine === "browser" && isPlaying) {
      // Re-trigger with new rate
      handlePlayBrowserTts();
    }
  };

  const handleDownloadWav = () => {
    if (!audioBlobUrl) return;
    const link = document.createElement("a");
    link.href = audioBlobUrl;
    link.download = `boletin_radio_90s_${(audioName || "noticia").replace(/\.[^/.]+$/, "")}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <section
      id="radio-bulletin-section"
      className="bg-slate-900 text-slate-100 rounded-2xl border-2 border-indigo-500/40 shadow-xl overflow-hidden"
    >
      {/* Radio Studio Header Bar */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                  <span className={`w-2 h-2 rounded-full bg-red-500 ${isPlaying ? "animate-ping" : "animate-pulse"}`}></span>
                  EN EL AIRE • ON AIR
                </span>
                <span className="text-xs text-indigo-400 font-semibold tracking-wide uppercase font-mono">
                  ESTUDIO DE RADIO ESPAÑOLA
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                4. Boletín Informativo de Radio (90 Segundos)
              </h2>
            </div>
          </div>

          {/* Timing stats & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Duración estimada: <strong className="text-white font-mono">~{estimatedSeconds}s</strong></span>
              <span className="text-slate-600">•</span>
              <span><strong className="text-white font-mono">{words}</strong> palabras</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-medium">Meta: 90s</span>
            </div>

            <button
              type="button"
              onClick={handleCopyScript}
              id="copy-radio-script-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar guion</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadScript}
              id="download-script-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Descargar guion para el atril de locución en formato texto"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Descargar Guion (.txt)</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
          Guion redactado con apertura sonora, desarrollo con datos y declaraciones citadas, y cierre de emisora para locutar con cadencia de radio en España (estilo Radio Nacional de España - RNE, Cadena SER u Onda Cero).
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Teleprompter Card for the Broadcaster */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 sm:p-8 relative shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-3 mb-5">
            <span className="flex items-center gap-2 text-indigo-300 font-bold">
              <Mic className="w-4 h-4 text-red-400 animate-pulse" />
              ATRIL DE LOCUCIÓN RADIOFÓNICA // 90 SEGUNDOS
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Cadencia radio: 140–150 palabras/minuto
            </span>
          </div>

          {/* Teleprompter text */}
          <div className="text-lg sm:text-xl font-sans text-slate-100 leading-relaxed font-normal select-text space-y-3">
            <p className="italic text-indigo-100/95 font-medium whitespace-pre-line leading-relaxed">
              "{scriptText}"
            </p>
          </div>

          {/* Broadcast live waveform indicator when playing */}
          {isPlaying && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>EMITIENDO EN DIRECTO: {activeEngine === "browser" ? "Locutora de España" : "Locutora Neural IA"}</span>
              </div>
              <div className="flex items-end gap-1 h-5">
                {[40, 70, 90, 60, 100, 50, 80, 45, 95, 60, 75, 50, 85, 40].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-indigo-500 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                    }}
                  ></span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Informative notification message when fallback occurs */}
        {noticeMessage && (
          <div className="p-3.5 bg-indigo-950/70 border border-indigo-700/80 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
            <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
            <span className="leading-relaxed">{noticeMessage}</span>
          </div>
        )}

        {/* Master Locution Controller Card */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                <span className="text-base font-bold text-white">
                  Locución del Boletín (90s)
                </span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono font-bold">
                  Sin Errores • Doble Motor
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pulsa el botón de locución para escuchar el boletín con acento y cadencia de España:
              </p>
            </div>

            {/* Quick Actions: Locutar en Directo & Generar WAV */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePlayBrowserTts}
                id="btn-play-browser-live"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {isPlaying && activeEngine === "browser" ? (
                  <>
                    <Pause className="w-4 h-4 text-white" />
                    <span>Pausar Locutora de España</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-white" />
                    <span>Locutar con Voz de España (90s)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateAiTts}
                disabled={isGeneratingTts}
                id="btn-generate-cloud-tts"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 border border-slate-600 transition-all cursor-pointer disabled:opacity-50"
                title="Generar archivo WAV con IA Neural para descarga"
              >
                {isGeneratingTts ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Procesando audio...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{audioBlobUrl ? "Reproducir Audio WAV" : "Sintetizar Audio WAV"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Player Controls (Works for both Live Speech and Audio Player) */}
          <div className="bg-slate-900/90 p-4 sm:p-5 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  id="master-play-pause-btn"
                  className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  id="master-stop-btn"
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700 transition-colors cursor-pointer"
                  title="Detener locución"
                >
                  <Square className="w-4 h-4" />
                </button>

                {/* Progress Bar & Timer */}
                <div className="flex-1 sm:w-72">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span className="font-bold text-indigo-400">{formatSeconds(currentTime)}</span>
                    <span className="text-slate-400">{formatSeconds(duration || estimatedSeconds)} (90s)</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || estimatedSeconds}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Speed & Download Controls */}
              <div className="flex items-center justify-end gap-3 w-full sm:w-auto flex-wrap">
                <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">Velocidad:</span>
                  {[1, 1.1, 1.2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {audioBlobUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadWav}
                    id="btn-download-wav-file"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Descargar WAV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hidden HTML5 audio element for cloud audio */}
            {audioBlobUrl && (
              <audio
                ref={audioElementRef}
                src={audioBlobUrl}
                onTimeUpdate={() => {
                  if (audioElementRef.current) {
                    setCurrentTime(audioElementRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioElementRef.current) {
                    setDuration(audioElementRef.current.duration);
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                }}
                className="hidden"
              />
            )}
          </div>

          {/* Voice options selector */}
          <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <RadioTower className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Voz del sistema para emisión en directo:</span>
            </div>

            {availableSpainVoices.length > 0 ? (
              <select
                value={selectedBrowserVoiceUri}
                onChange={(e) => setSelectedBrowserVoiceUri(e.target.value)}
                className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 max-w-[260px] truncate focus:outline-hidden focus:border-indigo-500"
              >
                {availableSpainVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-500 italic">Voz estándar en español (España)</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
