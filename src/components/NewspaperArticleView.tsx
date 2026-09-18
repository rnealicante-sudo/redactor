import React, { useState } from "react";
import { Newspaper, Copy, Check, Calendar, MapPin, Feather, Quote } from "lucide-react";
import { NewsArticle } from "../types";

interface NewspaperArticleViewProps {
  article: NewsArticle;
  audioName?: string;
  processedAt: string;
}

export const NewspaperArticleView: React.FC<NewspaperArticleViewProps> = ({
  article,
  audioName,
  processedAt,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(processedAt).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleCopy = async () => {
    const fullText = `${article.category.toUpperCase()}\n\n${article.headline.toUpperCase()}\n${article.subheadline ? article.subheadline + "\n\n" : "\n"}${article.dateline} — ${article.leadParagraph}\n\n${article.body.join("\n\n")}\n\n— Fuente de Audio: ${audioName || "Archivo sonoro"}`;
    
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullText);
        success = true;
      }
    } catch (e) {
      console.warn("Clipboard API error", e);
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = fullText;
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

  // Extract the first letter for the newspaper drop-cap
  const firstLetter = article.leadParagraph.charAt(0);
  const remainingLead = article.leadParagraph.slice(1);

  // Extract a quote for pull quote if available
  const quoteMatch = article.body.find(p => p.includes('"') || p.includes('“') || p.includes('«'));

  return (
    <article
      id="newspaper-article-section"
      className="bg-[#fdfcf9] text-slate-900 rounded-2xl border-2 border-stone-300 shadow-md overflow-hidden"
    >
      {/* Newspaper Top Broadsheet Masthead */}
      <div className="bg-stone-100 border-b border-stone-300 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-xs tracking-wider uppercase font-semibold text-stone-600 border-b border-stone-300 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-stone-900 text-stone-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest">
              EDICIÓN PRENSA
            </span>
            <span>DIARIO INFORMATIVO GENERAL</span>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <span className="flex items-center gap-1 capitalize">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span>AÑO XLVIII • NÚMERO 16.482</span>
            <span>PRECIO: 1,80 €</span>
          </div>
        </div>

        {/* Newspaper Header Bar */}
        <div className="pt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-serif tracking-[0.25em] text-stone-500 uppercase font-semibold block">
                Prensa Escrita & Noticia Redactada
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-900">
                Crónica Periodística de Portada
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            id="copy-newspaper-btn"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors shadow-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Noticia copiada</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-600" />
                <span>Copiar noticia completa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Newspaper Body Content */}
      <div className="p-6 sm:p-10 space-y-6">
        {/* Section Badge */}
        <div className="flex items-center gap-2">
          <span className="bg-red-800 text-white font-serif font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-sm shadow-xs">
            {article.category || "ACTUALIDAD"}
          </span>
          <span className="text-xs text-stone-500 font-serif italic">
            Servicio de Información Redaccional
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-serif font-black text-2xl sm:text-4xl lg:text-5xl text-stone-950 tracking-tight leading-[1.15] border-b-2 border-stone-900 pb-4">
          {article.headline}
        </h1>

        {/* Subheadline (Bajada) */}
        {article.subheadline && (
          <p className="text-lg sm:text-xl text-stone-700 font-serif italic leading-relaxed border-b border-stone-200 pb-4 font-normal">
            {article.subheadline}
          </p>
        )}

        {/* Dateline & Byline Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-stone-600 font-serif border-b border-stone-300 pb-3">
          <div className="flex items-center gap-2 font-medium">
            <Feather className="w-4 h-4 text-stone-700" />
            <span>Por <strong>Redacción Periodística</strong></span>
            <span className="text-stone-400">•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-700" />
              <strong>{article.dateline}</strong>
            </span>
          </div>

          {audioName && (
            <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded border border-stone-200">
              Audio fuente: {audioName}
            </span>
          )}
        </div>

        {/* Lead paragraph with prominent newspaper drop-cap */}
        <div className="bg-stone-50 p-5 sm:p-6 rounded-xl border-l-4 border-stone-900 shadow-xs">
          <p className="font-serif text-base sm:text-lg text-stone-900 leading-relaxed">
            <span className="float-left text-5xl sm:text-6xl font-black font-serif leading-[0.8] mr-3 mt-1 text-stone-950 select-none">
              {firstLetter}
            </span>
            {remainingLead}
          </p>
        </div>

        {/* Pull Quote Box (if available in body text) */}
        {quoteMatch && (
          <div className="my-6 p-5 sm:p-6 bg-amber-50/70 border-y-2 border-amber-800/30 rounded-sm">
            <div className="flex items-start gap-3">
              <Quote className="w-6 h-6 text-amber-800 shrink-0 mt-1 opacity-75" />
              <blockquote className="font-serif italic text-base sm:text-lg text-amber-950 font-medium leading-snug">
                {quoteMatch.length > 220 ? quoteMatch.slice(0, 220) + "..." : quoteMatch}
              </blockquote>
            </div>
          </div>
        )}

        {/* Multi-column body text (standard newspaper column typesetting on md+) */}
        <div className="md:columns-2 gap-8 text-stone-800 font-serif leading-relaxed text-base [column-rule:1px_solid_#e7e5e4] text-justify space-y-4">
          {article.body.map((paragraph, idx) => (
            <p key={idx} className="break-inside-avoid-column first-line:tracking-normal indent-4">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Newspaper Footer / Closing Rule */}
        <div className="pt-6 border-t-2 border-stone-300 flex flex-wrap items-center justify-between text-xs text-stone-500 font-serif italic">
          <span>Artículo redactado según las normas de estilo y verificación de agencia de noticias.</span>
          <span>© Archivo de Prensa & Noticias</span>
        </div>
      </div>
    </article>
  );
};
