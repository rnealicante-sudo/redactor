import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileAudio, 
  Mic, 
  Sparkles, 
  Play, 
  Pause, 
  Trash2,
  CheckCircle2,
  Info
} from "lucide-react";
import { formatFileSize, formatDuration, createDemoMeetingAudio, getAudioFormatLabel } from "../utils/audioHelper";

interface AudioUploaderProps {
  selectedFile: File | Blob | null;
  fileName: string;
  fileSize: number;
  onSelectFile: (file: File | Blob, name: string) => void;
  onClearFile: () => void;
  onProcessAudio: (customInstructions: string) => void;
  isProcessing: boolean;
  onOpenRecorder: () => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  fileName,
  fileSize,
  onSelectFile,
  onClearFile,
  onProcessAudio,
  isProcessing,
  onOpenRecorder,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [playbackSupported, setPlaybackSupported] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Update audio URL when file changes
  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackSupported(true);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackSupported(true);
    }
  }, [selectedFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onSelectFile(file, file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onSelectFile(file, file.name);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Audio playback not supported for this codec in browser:", e);
        setPlaybackSupported(false);
        setIsPlaying(false);
      });
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const { blob, fileName: demoName } = await createDemoMeetingAudio();
      onSelectFile(blob, demoName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const formatLabel = getAudioFormatLabel(fileName, selectedFile?.type);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-indigo-600" />
            Cargar o Grabar Audio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compatible con <strong className="text-slate-700">cualquier formato de audio</strong>: MP3, WAV, M4A, AAC, OGG, FLAC, WMA, OPUS, AMR, AIFF, WebM y videos con audio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-recorder"
            onClick={onOpenRecorder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-rose-500" />
            Grabar voz
          </button>

          <button
            type="button"
            id="btn-load-demo"
            onClick={handleLoadDemo}
            disabled={isLoadingDemo || isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            {isLoadingDemo ? "Generando..." : "Audio de muestra"}
          </button>
        </div>
      </div>

      {!selectedFile ? (
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.webm,.flac,.wma,.amr,.aif,.aiff,.opus,.3gp,.3g2,.caf,.mp4,.mov,.mkv,.avi,.mpga,.m4r,.mid,.midi"
            onChange={handleFileInput}
            className="hidden"
            id="audio-file-input"
          />

          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>

          <p className="text-base font-semibold text-slate-800">
            Arrastra tu archivo de <span className="text-indigo-600">audio o voz aquí</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            o haz clic para seleccionar cualquier archivo de audio de tu dispositivo.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto">
            {["MP3", "WAV", "M4A", "AAC", "OGG", "FLAC", "OPUS", "WMA", "AMR", "WebM", "AIFF", "MP4/Video"].map((fmt) => (
              <span key={fmt} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File summary bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate" title={fileName}>
                    {fileName}
                  </p>
                  <span className="shrink-0 text-[10px] font-bold tracking-wider text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">
                    {formatLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  {fileSize > 0 && <span>{formatFileSize(fileSize)}</span>}
                  {duration > 0 && <span>• {formatDuration(duration)}</span>}
                  <span className="text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Listo para procesar
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-remove-file"
              onClick={onClearFile}
              disabled={isProcessing}
              title="Eliminar archivo"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Audio player preview */}
          {audioUrl && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setPlaybackSupported(false)}
                className="hidden"
              />

              {playbackSupported ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title={isPlaying ? "Pausar" : "Reproducir"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-600 py-1">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    El formato <strong>{formatLabel}</strong> es 100% compatible para transcripción y resumen con IA. (La previsualización en este navegador no admite reproducción directa).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Optional context instruction */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="custom-instructions" className="block text-xs font-semibold text-slate-700">
                Instrucciones editoriales o contexto (opcional)
              </label>
              <span className="text-[11px] text-slate-400">Ayuda a enfocar el titular y los puntos clave</span>
            </div>
            <input
              id="custom-instructions"
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Rueda de prensa oficial, declaraciones del portavoz, entrevista exclusiva..."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
            />
            {/* Editorial Quick Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 font-medium">Sugerencias:</span>
              {[
                "Rueda de prensa",
                "Declaraciones oficiales",
                "Entrevista exclusiva",
                "Pleno municipal",
                "Crónica de sucesos",
                "Debate / Mesa redonda"
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCustomPrompt((prev) => (prev ? `${prev}, ${tag.toLowerCase()}` : tag))}
                  className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit action button */}
          <button
            type="button"
            id="btn-process-audio"
            onClick={() => onProcessAudio(customPrompt)}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Redactando contenidos y boletín con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Redactar Contenidos y Boletín con IA</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
