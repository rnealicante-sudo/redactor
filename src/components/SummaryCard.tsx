import React, { useState } from "react";
import { Sparkles, CheckCircle2, Copy, Check, Lightbulb, Clock } from "lucide-react";

interface SummaryCardProps {
  summary: string;
  keyPoints: string[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary, keyPoints }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const textToCopy = `RESUMEN:\n${summary}\n\nPUNTOS CLAVE:\n${keyPoints
      .map((p) => `• ${p}`)
      .join("\n")}`;

    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      }
    } catch (e) {
      console.warn("navigator.clipboard error", e);
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Parses a keypoint string to extract timestamp in format [mm:ss], (mm:ss), mm:ss, or similar
   */
  const parseTimestamp = (text: string) => {
    // Matches patterns like [01:23], (01:23), [1:23], 01:23 - ..., etc.
    const match = text.match(/^(\[(\d{1,2}:\d{2})\]|\((\d{1,2}:\d{2})\)|(\d{1,2}:\d{2})\s*[-:]?)\s*(.*)$/i);
    if (match) {
      const time = match[2] || match[3] || match[4];
      const rest = match[5] || "";
      return { timestamp: time, content: rest };
    }
    return { timestamp: null, content: text };
  };

  return (
    <div id="summary-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              1. Resumen y Puntos Clave
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Síntesis ejecutiva y momentos destacados con minutos y segundos de la grabación
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Resumen copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar resumen y puntos</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Body with larger font */}
      <div className="p-5 sm:p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2 font-mono">
          RESUMEN GENERAL
        </span>
        <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal whitespace-pre-line">
          {summary}
        </p>
      </div>

      {/* Key Points with larger font and minute/second badges */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 font-mono">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Puntos Clave Identificados ({keyPoints.length})
            </h4>
            <span className="text-xs text-slate-400">
              Ubicación temporal en la grabación
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {keyPoints.map((point, index) => {
              const { timestamp, content } = parseTimestamp(point);
              return (
                <div
                  key={index}
                  className="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 transition-all shadow-xs"
                >
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {timestamp ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-lg shrink-0 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Minuto {timestamp}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                          Punto {index + 1}
                        </span>
                      )}
                      <span className="text-base sm:text-lg text-slate-800 leading-snug font-medium">
                        {content}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
