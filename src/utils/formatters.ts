import { AudioProcessingResult } from "../types";

/**
 * Formats the complete news article, transcription, and summary into a clean plain-text file representation (.txt)
 */
/**
 * Formats the complete content in the order:
 * 1. Resumen y puntos clave
 * 2. Transcripción detallada
 * 3. Noticia periodística
 * 4. Boletín de radio (~60s)
 */
export function generatePlainTextFile(result: AudioProcessingResult): string {
  const { title, summary, keyPoints, fullTranscription, newsArticle, audioName, processedAt } = result;

  const separator = "=".repeat(68);
  const subSeparator = "-".repeat(68);
  const dateStr = new Date(processedAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let text = `${separator}\n`;
  text += `           TRANSCRIPTOR DE AUDIO EN NOTICIAS\n`;
  text += `${separator}\n\n`;

  text += `TÍTULO:        ${title || "Audio Procesado"}\n`;
  text += `FECHA:         ${dateStr}\n`;
  if (audioName) {
    text += `ARCHIVO:       ${audioName}\n`;
  }

  // 1. RESUMEN Y PUNTOS CLAVE
  text += `\n${separator}\n`;
  text += `1. RESUMEN EJECUTIVO Y PUNTOS CLAVE\n`;
  text += `${separator}\n\n`;
  text += `${summary}\n\n`;

  if (keyPoints && keyPoints.length > 0) {
    text += `${subSeparator}\n`;
    text += `PUNTOS CLAVE:\n`;
    text += `${subSeparator}\n`;
    keyPoints.forEach((point) => {
      text += `  • ${point}\n`;
    });
    text += `\n`;
  }

  // 2. TRANSCRIPCIÓN DETALLADA
  text += `${separator}\n`;
  text += `2. TRANSCRIPCIÓN DETALLADA PALABRA POR PALABRA\n`;
  text += `${separator}\n\n`;
  text += `${fullTranscription}\n\n`;

  // 3. NOTICIA PERIODÍSTICA
  if (newsArticle) {
    text += `${separator}\n`;
    text += `3. NOTICIA PERIODÍSTICA (EDICIÓN PRENSA)\n`;
    text += `${separator}\n\n`;
    text += `SECCIÓN:   ${newsArticle.category.toUpperCase()}\n`;
    text += `TITULAR:   ${newsArticle.headline}\n`;
    if (newsArticle.subheadline) {
      text += `SUBTÍTULO: ${newsArticle.subheadline}\n`;
    }
    text += `DATACIÓN:  ${newsArticle.dateline}\n\n`;
    text += `ENTRADILLA (LEAD):\n${newsArticle.leadParagraph}\n\n`;
    text += `CUERPO DE LA NOTICIA:\n`;
    newsArticle.body.forEach((p) => {
      text += `${p}\n\n`;
    });

    // 4. BOLETÍN DE RADIO (~90s)
    text += `${subSeparator}\n`;
    text += `4. BOLETÍN INFORMATIVO DE RADIO (90 SEGUNDOS - LOCUCIÓN ESPAÑOLA):\n`;
    text += `${subSeparator}\n`;
    text += `"${newsArticle.radioScript90s || newsArticle.radioScript60s || newsArticle.radioScript20s}"\n\n`;
  }

  text += `${separator}\n`;
  text += `Procesado el ${dateStr} con Inteligencia Artificial\n`;
  text += `${separator}\n`;

  return text;
}

/**
 * Formats message for WhatsApp with native WhatsApp bold/italic markdown
 */
export function formatForWhatsApp(result: AudioProcessingResult): string {
  const { title, summary, keyPoints, newsArticle, fullTranscription } = result;

  let msg = `📰 *TRANSCRIPTOR DE AUDIO EN NOTICIAS*\n\n`;

  msg += `📌 *1. RESUMEN:*\n${summary}\n\n`;

  msg += `💡 *PUNTOS CLAVE:*\n`;
  keyPoints.forEach((p) => {
    msg += `• ${p}\n`;
  });
  msg += `\n`;

  if (newsArticle) {
    msg += `📰 *2. NOTICIA PERIODÍSTICA:*\n`;
    msg += `🔴 *${newsArticle.headline.toUpperCase()}*\n`;
    if (newsArticle.subheadline) msg += `_${newsArticle.subheadline}_\n\n`;
    msg += `📍 *${newsArticle.dateline}* — ${newsArticle.leadParagraph}\n\n`;

    const radioText = newsArticle.radioScript90s || newsArticle.radioScript60s || newsArticle.radioScript20s;
    if (radioText) {
      msg += `📻 *3. BOLETÍN DE RADIO (90s - Locutora de España):*\n"${radioText}"\n\n`;
    }
  }

  if (fullTranscription.length < 1500) {
    msg += `📝 *TRANSCRIPCIÓN COMPLETA:*\n${fullTranscription}\n\n`;
  } else {
    msg += `📝 *TRANSCRIPCIÓN (Extracto):*\n${fullTranscription.slice(0, 700)}...\n_(Descarga el documento completo para leerla íntegra)_\n\n`;
  }

  msg += `_Generado con Ayudante de Redacción_`;
  return msg;
}

/**
 * Formats message for Telegram
 */
export function formatForTelegram(result: AudioProcessingResult): string {
  const { title, summary, keyPoints, newsArticle, fullTranscription } = result;

  let msg = `📰 AYUDANTE DE REDACCIÓN\n\n`;

  msg += `📌 1. RESUMEN:\n${summary}\n\n`;

  msg += `💡 PUNTOS CLAVE:\n`;
  keyPoints.forEach((p) => {
    msg += `• ${p}\n`;
  });
  msg += `\n`;

  if (newsArticle) {
    msg += `📰 2. NOTICIA PERIODÍSTICA:\n`;
    msg += `🔴 ${newsArticle.headline.toUpperCase()}\n`;
    if (newsArticle.subheadline) msg += `${newsArticle.subheadline}\n\n`;
    msg += `📍 ${newsArticle.dateline} — ${newsArticle.leadParagraph}\n\n`;

    const radioText = newsArticle.radioScript90s || newsArticle.radioScript60s || newsArticle.radioScript20s;
    if (radioText) {
      msg += `📻 3. BOLETÍN DE RADIO (90s):\n"${radioText}"\n\n`;
    }
  }

  if (fullTranscription.length < 1500) {
    msg += `📝 TRANSCRIPCIÓN:\n${fullTranscription}\n`;
  } else {
    msg += `📝 TRANSCRIPCIÓN (Extracto):\n${fullTranscription.slice(0, 700)}...\n`;
  }

  return msg;
}

/**
 * Formats message for Email Body
 */
export function formatForEmail(result: AudioProcessingResult): { subject: string; body: string } {
  const { title, newsArticle } = result;
  const dateStr = new Date(result.processedAt).toLocaleDateString("es-ES");
  const subject = newsArticle 
    ? `Noticia: ${newsArticle.headline} (${dateStr})` 
    : `Transcripción: ${title || "Audio"} (${dateStr})`;
  const body = generatePlainTextFile(result);
  return { subject, body };
}

/**
 * Generates file download
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
