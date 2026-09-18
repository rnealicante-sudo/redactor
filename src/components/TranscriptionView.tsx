import React, { useState, useMemo } from "react";
import { Copy, Check, Search, AlignLeft, Download, MessageSquare, HelpCircle, Eye } from "lucide-react";
import { downloadFile } from "../utils/formatters";

interface TranscriptionViewProps {
  transcription: string;
  audioName?: string;
}

interface ParsedBlock {
  id: string;
  speaker?: string;
  timestamp?: string;
  content: string;
  isQuestion: boolean;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcription,
  audioName,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"dialogue" | "raw">("dialogue");

  /**
   * Process transcription into structured dialogue blocks:
   * 1. Breaks lines when speaker changes (e.g. Hablante 1:, Entrevistador:, Periodista:)
   * 2. Breaks lines when a question is asked (¿...? or ? )
   * 3. Marks questions so they can be rendered in bold
   */
  const parsedBlocks = useMemo<ParsedBlock[]>(() => {
    if (!transcription) return [];

    let text = transcription;

    // 1. Normalize line breaks on speaker switches mid-text:
    // e.g. "Fin de frase. Hablante 2: Hola" -> "Fin de frase.\n\nHablante 2: Hola"
    text = text.replace(
      /([.!?])\s+((?:\[\d{1,2}:\d{2}\]\s*)?(?:Hablante\s*\d*|Entrevistador|Periodista|Locutor|Interlocutor|Moderador|Voz|Pregunta|Respuesta|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\s*[:：])/gi,
      "$1\n\n$2"
    );

    // 2. Normalize line breaks when a question starts:
    // e.g. "Fin de frase. ¿Cuál es el motivo?" -> "Fin de frase.\n\n¿Cuál es el motivo?"
    text = text.replace(/([.!])\s+(¿|\*\*\s*¿)/g, "$1\n\n$2");

    // 3. Split by lines
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    const blocks: ParsedBlock[] = [];

    rawLines.forEach((line, idx) => {
      // Check if line starts with timestamp like [00:15]
      const timeMatch = line.match(/^\[(\d{1,2}:\d{2})\]\s*(.*)$/);
      let timestamp: string | undefined = undefined;
      let remaining = line;

      if (timeMatch) {
        timestamp = timeMatch[1];
        remaining = timeMatch[2];
      }

      // Check if line starts with speaker label: "Hablante 1:", "Entrevistador:", etc.
      const speakerMatch = remaining.match(
        /^((?:Hablante\s*\d*|Entrevistador|Periodista|Locutor|Interlocutor|Moderador|Voz|Pregunta|Respuesta|[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{1,25})[:：])\s*(.*)$/i
      );

      let speaker: string | undefined = undefined;
      let content = remaining;

      if (speakerMatch) {
        speaker = speakerMatch[1].replace(/[:：]$/, "").trim();
        content = speakerMatch[2].trim();
      }

      // Determine if content is or contains a prominent question
      const cleanContent = content.replace(/^\*\*|\*\*$/g, "").trim();
      const isQuestion =
        cleanContent.startsWith("¿") ||
        cleanContent.endsWith("?") ||
        content.includes("¿") ||
        (speaker?.toLowerCase().includes("pregunta") ?? false);

      blocks.push({
        id: `block-${idx}`,
        speaker,
        timestamp,
        content,
        isQuestion,
      });
    });

    return blocks;
  }, [transcription]);

  // Clean text with all dialogue breaks for copying
  const formattedCopyText = useMemo(() => {
    return parsedBlocks
      .map((b) => {
        const timePart = b.timestamp ? `[${b.timestamp}] ` : "";
        const speakerPart = b.speaker ? `${b.speaker}: ` : "";
        const cleanContent = b.content.replace(/^\*\*|\*\*$/g, "").trim();
        return `${timePart}${speakerPart}${cleanContent}`;
      })
      .join("\n\n");
  }, [parsedBlocks]);

  const handleCopy = async () => {
    const textToCopy = formattedCopyText || transcription;
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      }
    } catch (e) {
      console.warn("navigator.clipboard error, fallback...", e);
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTranscript = () => {
    const filename = `transcripcion_${(audioName || "audio").replace(/\.[^/.]+$/, "")}.txt`;
    downloadFile(formattedCopyText || transcription, filename);
  };

  const wordCount = transcription.trim() ? transcription.trim().split(/\s+/).length : 0;
  const charCount = transcription.length;

  /**
   * Highlights search terms in a text string
   */
  const highlightSearch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 text-amber-950 font-bold rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  /**
   * Renders sentence text, automatically bolding questions
   */
  const renderSentenceWithBoldQuestions = (text: string, isBlockQuestion: boolean) => {
    // Strip redundant markdown asterisks for clean display
    const cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1");

    // If the entire block is a question or question line
    if (isBlockQuestion) {
      return (
        <span className="font-bold text-slate-950 bg-amber-50/80 px-1.5 py-0.5 rounded-md border-l-2 border-amber-500 inline">
          {highlightSearch(cleaned)}
        </span>
      );
    }

    // If there is an inline question like "Entonces dijeron esto. ¿Cuál fue el motivo? Continuaron."
    const questionRegex = /(¿[^?]+?\?)/g;
    if (questionRegex.test(cleaned)) {
      const parts = cleaned.split(questionRegex);
      return (
        <>
          {parts.map((part, idx) => {
            if (part.startsWith("¿") && part.endsWith("?")) {
              return (
                <span
                  key={idx}
                  className="font-bold text-slate-950 bg-amber-50/80 px-1.5 py-0.5 rounded-md border-l-2 border-amber-500 inline mx-0.5"
                >
                  {highlightSearch(part)}
                </span>
              );
            }
            return <span key={idx}>{highlightSearch(part)}</span>;
          })}
        </>
      );
    }

    return <span>{highlightSearch(cleaned)}</span>;
  };

  return (
    <div id="transcription-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
      {/* Header and Main Copy Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <AlignLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              2. Transcripción Detallada
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{wordCount.toLocaleString()} palabras</span>
              <span>•</span>
              <span>{charCount.toLocaleString()} caracteres</span>
              <span>•</span>
              <span className="text-indigo-600 font-medium flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                Preguntas en <strong>negrita</strong> y saltos de línea por hablante
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Copiar y Descargar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("dialogue")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === "dialogue"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Líneas estructuradas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === "raw"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Texto corrido
            </button>
          </div>

          <button
            type="button"
            id="btn-copy-transcription"
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer ${
              copied
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>¡Texto copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copiar transcripción</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadTranscript}
            title="Descargar solo el texto de la transcripción en archivo TXT"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Descargar .TXT</span>
          </button>
        </div>
      </div>

      {/* Search inside transcript */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar palabra o frase dentro de la transcripción..."
          className="w-full text-xs sm:text-sm pl-9 pr-14 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Transcript container */}
      <div className="p-5 sm:p-7 bg-slate-50/80 rounded-2xl border border-slate-200 max-h-[550px] overflow-y-auto font-sans leading-relaxed select-text space-y-3.5">
        {viewMode === "dialogue" ? (
          <div className="space-y-3">
            {parsedBlocks.map((block) => (
              <div
                key={block.id}
                className={`p-3.5 rounded-xl transition-colors ${
                  block.isQuestion
                    ? "bg-amber-50/50 border border-amber-200/70"
                    : block.speaker
                    ? "bg-white border border-slate-200/80 shadow-2xs"
                    : "bg-white/60 border border-transparent"
                }`}
              >
                {/* Speaker and Timestamp header if present */}
                {(block.speaker || block.timestamp) && (
                  <div className="flex items-center gap-2 mb-1.5">
                    {block.timestamp && (
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {block.timestamp}
                      </span>
                    )}
                    {block.speaker && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold font-mono tracking-wide px-2.5 py-0.5 rounded-md ${
                          block.speaker.toLowerCase().includes("entrevistador") ||
                          block.speaker.toLowerCase().includes("periodista") ||
                          block.speaker.toLowerCase().includes("pregunta")
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {block.speaker}
                      </span>
                    )}
                  </div>
                )}

                {/* Content with bold questions */}
                <div className="text-sm sm:text-base text-slate-800 leading-relaxed pl-1">
                  {renderSentenceWithBoldQuestions(block.content, block.isQuestion)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-sans text-sm sm:text-base text-slate-800 leading-relaxed">
            {highlightSearch(transcription)}
          </div>
        )}
      </div>

      {/* Bottom quick copy bar */}
      <div className="flex flex-wrap items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100 gap-2">
        <span>
          Líneas separadas automáticamente al cambiar de hablante o formular preguntas • Preguntas en <strong>negrita</strong>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? "Copiado al portapapeles" : "Copiar todo con saltos de línea"}</span>
        </button>
      </div>
    </div>
  );
};
