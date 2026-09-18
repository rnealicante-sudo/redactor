import React, { useState } from "react";
import { 
  Mail, 
  Send, 
  MessageCircle, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  FileCode,
  Printer,
  File
} from "lucide-react";
import { AudioProcessingResult } from "../types";
import { 
  formatForEmail, 
  formatForWhatsApp, 
  formatForTelegram, 
  generatePlainTextFile 
} from "../utils/formatters";
import {
  exportToTxt,
  exportToWord,
  exportToMarkdown,
  exportToJson,
  printOrSavePdf
} from "../utils/exportHelpers";

interface ShareBarProps {
  result: AudioProcessingResult;
}

export const ShareBar: React.FC<ShareBarProps> = ({ result }) => {
  const [activePreview, setActivePreview] = useState<"whatsapp" | "email" | "telegram" | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showAllFormats, setShowAllFormats] = useState(false);

  const emailData = formatForEmail(result);
  const whatsappText = formatForWhatsApp(result);
  const telegramText = formatForTelegram(result);
  const fullText = generatePlainTextFile(result);

  const handleCopy = (text: string, type: string) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (e) {
      console.warn("navigator.clipboard error", e);
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
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

    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // WhatsApp Send
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Telegram Send
  const handleOpenTelegram = () => {
    const encoded = encodeURIComponent(telegramText);
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encoded}`;
    window.open(url, "_blank");
  };

  // Email Send (mailto)
  const handleOpenEmail = () => {
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.body);
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
      {/* Header with Title and Quick Multi-format Download buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Descargar y Compartir</h3>
            <p className="text-xs text-slate-500">Descarga en múltiples formatos periodísticos o envía a tus canales de comunicación</p>
          </div>
        </div>

        {/* Multi-Format Download Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => exportToTxt(result)}
            title="Descargar en formato texto plano .txt"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>.TXT</span>
          </button>

          <button
            type="button"
            onClick={() => exportToWord(result)}
            title="Descargar en formato Microsoft Word / Google Docs .doc"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors cursor-pointer border border-blue-200 shadow-2xs"
          >
            <File className="w-3.5 h-3.5 text-blue-600" />
            <span>Word (.DOC)</span>
          </button>

          <button
            type="button"
            onClick={() => exportToMarkdown(result)}
            title="Descargar en formato Markdown .md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg transition-colors cursor-pointer border border-purple-200 shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-600" />
            <span>Markdown (.MD)</span>
          </button>

          <button
            type="button"
            onClick={() => printOrSavePdf()}
            title="Imprimir o guardar en PDF"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-lg transition-colors cursor-pointer border border-rose-200 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF / Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => exportToJson(result)}
            title="Descargar datos en formato estructurado JSON"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-lg transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Main sharing channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WhatsApp Button */}
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">WhatsApp</h4>
              <p className="text-xs text-slate-500">Noticia, boletín y resumen</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              id="btn-share-whatsapp"
              onClick={handleOpenWhatsApp}
              className="flex-1 py-1.5 px-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Enviar</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(whatsappText, "whatsapp")}
              title="Copiar texto para WhatsApp"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedType === "whatsapp" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePreview(activePreview === "whatsapp" ? null : "whatsapp")}
              title="Ver texto de WhatsApp"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {activePreview === "whatsapp" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Telegram Button */}
        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 hover:bg-sky-50/70 transition-colors flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Send className="w-4 h-4 ml-0.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Telegram</h4>
              <p className="text-xs text-slate-500">Enviar a chat o canal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              id="btn-share-telegram"
              onClick={handleOpenTelegram}
              className="flex-1 py-1.5 px-2.5 bg-[#229ED9] hover:bg-[#1d8cc1] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Enviar</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(telegramText, "telegram")}
              title="Copiar texto para Telegram"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedType === "telegram" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePreview(activePreview === "telegram" ? null : "telegram")}
              title="Ver texto de Telegram"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {activePreview === "telegram" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Email Button */}
        <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Correo Electrónico</h4>
              <p className="text-xs text-slate-500">Texto completo maquetado</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              id="btn-share-email"
              onClick={handleOpenEmail}
              className="flex-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir Email</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(emailData.body, "email")}
              title="Copiar cuerpo del correo"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedType === "email" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePreview(activePreview === "email" ? null : "email")}
              title="Configurar destinatario y previsualizar"
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-500 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {activePreview === "email" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Preview / Settings */}
      {activePreview === "email" && (
        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Configuración de Envío por Correo</span>
            <button
              onClick={() => setActivePreview(null)}
              className="text-xs text-indigo-600 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 font-medium">Destinatario (opcional):</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="ejemplo@redaccion.com"
              className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-medium">Asunto:</label>
            <p className="text-xs font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-800 truncate">
              {emailData.subject}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopy(emailData.body, "email-full")}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedType === "email-full" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Texto Completo</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEmail}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Abrir app de correo</span>
            </button>
          </div>
        </div>
      )}

      {activePreview === "whatsapp" && (
        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Previsualización del mensaje para WhatsApp</span>
            <button
              onClick={() => setActivePreview(null)}
              className="text-xs text-emerald-700 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <pre className="p-3 bg-white rounded-lg border border-emerald-200 font-sans text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {whatsappText}
          </pre>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleCopy(whatsappText, "whatsapp-preview")}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedType === "whatsapp-preview" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Texto</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {activePreview === "telegram" && (
        <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900">Previsualización del mensaje para Telegram</span>
            <button
              onClick={() => setActivePreview(null)}
              className="text-xs text-sky-700 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <pre className="p-3 bg-white rounded-lg border border-sky-200 font-sans text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {telegramText}
          </pre>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleCopy(telegramText, "telegram-preview")}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedType === "telegram-preview" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Texto</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTelegram}
              className="px-3 py-1.5 bg-[#229ED9] hover:bg-[#1d8cc1] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir Telegram</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
