import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Check, X, AlertCircle } from "lucide-react";
import { formatDuration } from "../utils/audioHelper";

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob, fileName: string) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setRecordedBlob(null);
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
      }
      setElapsedSeconds(0);
      setIsPlaying(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setErrorMsg(null);
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setElapsedSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error al acceder al micrófono:", err);
      setErrorMsg("No se pudo acceder al micrófono. Por favor verifica los permisos en tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const handleUseRecording = () => {
    if (recordedBlob) {
      const extension = recordedBlob.type.includes("ogg")
        ? "ogg"
        : recordedBlob.type.includes("mp4")
        ? "m4a"
        : "webm";
      const fileName = `grabacion_${new Date().toISOString().slice(0, 10)}_${Math.floor(Date.now() / 1000)}.${extension}`;
      onRecordingComplete(recordedBlob, fileName);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <Mic className="w-5 h-5 text-rose-500" />
            <span>Grabar audio con el micrófono</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-start gap-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          {/* Animated recording icon */}
          <div
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105"
                : recordedBlob
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40" />
            )}
            <Mic className="w-10 h-10 relative z-10" />
          </div>

          <div>
            <span className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {isRecording
                ? "Grabando... habla con claridad hacia tu micrófono"
                : recordedBlob
                ? "Grabación finalizada. Puedes escucharla o usarla"
                : "Presiona iniciar para comenzar a grabar"}
            </p>
          </div>

          {/* Player for recorded audio */}
          {recordedUrl && (
            <div className="w-full flex items-center justify-center gap-3 pt-2">
              <audio
                ref={audioPreviewRef}
                src={recordedUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (!audioPreviewRef.current) return;
                  if (isPlaying) {
                    audioPreviewRef.current.pause();
                    setIsPlaying(false);
                  } else {
                    audioPreviewRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pausar" : "Escuchar audio grabado"}
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {!isRecording && !recordedBlob && (
            <button
              type="button"
              onClick={startRecording}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Mic className="w-4 h-4" />
              Iniciar Grabación
            </button>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Square className="w-4 h-4 fill-white" />
              Detener Grabación
            </button>
          )}

          {recordedBlob && !isRecording && (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Grabar de nuevo
              </button>

              <button
                type="button"
                onClick={handleUseRecording}
                className="flex-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                Usar este audio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
