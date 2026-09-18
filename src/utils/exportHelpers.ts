import { AudioProcessingResult } from "../types";

/**
 * Downloads a file to the user's computer
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename from audio name or title
 */
export function getSafeBaseName(result: AudioProcessingResult): string {
  const raw = result.newsArticle?.headline || result.title || result.audioName || "noticia_transcripcion";
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "noticia_audio";
}

/**
 * Generates Plain Text (.txt) format
 */
/**
 * Generates Plain Text (.txt) format in the requested order:
 * 1. Resumen y Puntos Clave
 * 2. Transcripción Detallada
 * 3. Noticia Periodística
 * 4. Boletín de Radio (~60s)
 */
export function exportToTxt(result: AudioProcessingResult): void {
  const dateStr = new Date(result.processedAt).toLocaleString("es-ES");
  let content = `==========================================================\n`;
  content += `TRANSCRIPTOR DE AUDIO EN NOTICIAS\n`;
  content += `Generado el: ${dateStr}\n`;
  if (result.audioName) content += `Archivo original: ${result.audioName}\n`;
  content += `==========================================================\n\n`;

  // 1. RESUMEN Y PUNTOS CLAVE
  content += `--- 1. RESUMEN EJECUTIVO Y PUNTOS CLAVE ---\n`;
  content += `${result.summary}\n\n`;

  if (result.keyPoints && result.keyPoints.length > 0) {
    content += `PUNTOS CLAVE:\n`;
    result.keyPoints.forEach((point) => {
      content += `• ${point}\n`;
    });
    content += `\n`;
  }

  // 2. TRANSCRIPCIÓN DETALLADA
  content += `==========================================================\n`;
  content += `--- 2. TRANSCRIPCIÓN DETALLADA PALABRA POR PALABRA ---\n`;
  content += `==========================================================\n\n`;
  content += `${result.fullTranscription}\n\n`;

  // 3. NOTICIA PERIODÍSTICA
  if (result.newsArticle) {
    const art = result.newsArticle;
    content += `==========================================================\n`;
    content += `--- 3. NOTICIA PERIODÍSTICA (EDICIÓN PRENSA) ---\n`;
    content += `==========================================================\n\n`;
    content += `SECCIÓN: ${art.category.toUpperCase()}\n`;
    content += `TITULAR: ${art.headline}\n`;
    if (art.subheadline) content += `SUBTÍTULO: ${art.subheadline}\n`;
    content += `DATACIÓN: ${art.dateline}\n\n`;
    content += `ENTRADILLA (LEAD):\n${art.leadParagraph}\n\n`;
    content += `CUERPO DE LA NOTICIA:\n`;
    art.body.forEach((paragraph) => {
      content += `${paragraph}\n\n`;
    });

    // 4. BOLETÍN DE RADIO 90s
    content += `----------------------------------------------------------\n`;
    content += `4. BOLETÍN INFORMATIVO DE RADIO (90 SEGUNDOS - LOCUTORA ESPAÑOLA):\n`;
    content += `"${art.radioScript90s || art.radioScript60s || art.radioScript20s}"\n`;
    content += `----------------------------------------------------------\n\n`;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${getSafeBaseName(result)}.txt`);
}

/**
 * Generates Microsoft Word Compatible Document (.doc) with rich formatting
 */
export function exportToWord(result: AudioProcessingResult): void {
  const dateStr = new Date(result.processedAt).toLocaleString("es-ES");
  const art = result.newsArticle;

  let bodyHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>${result.title}</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 40px; }
      h1 { font-size: 22pt; font-weight: bold; color: #0f172a; margin-bottom: 6px; line-height: 1.2; font-family: 'Georgia', serif; }
      h2 { font-size: 14pt; color: #475569; margin-top: 0; margin-bottom: 18px; font-weight: normal; font-style: italic; font-family: 'Georgia', serif; }
      h3 { font-size: 13pt; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
      .lead { font-size: 12pt; font-weight: 600; color: #0f172a; background: #f8fafc; padding: 12px; border-left: 4px solid #3b82f6; margin-bottom: 16px; font-family: 'Georgia', serif; }
      .meta { font-size: 9pt; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
      .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; font-weight: bold; font-size: 9pt; text-transform: uppercase; }
      .bulletin { background: #e0e7ff; border: 1px solid #6366f1; padding: 14px; border-radius: 6px; font-style: italic; margin: 18px 0; }
      .transcription { font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; background: #f1f5f9; padding: 14px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
      ul { padding-left: 20px; }
      li { margin-bottom: 6px; }
    </style>
  </head>
  <body>
    <div class="meta">
      <strong>TRANSCRIPTOR DE AUDIO EN NOTICIAS</strong> | Fecha: ${dateStr} ${result.audioName ? `| Archivo: ${result.audioName}` : ""}
    </div>

    <!-- 1. RESUMEN Y PUNTOS CLAVE -->
    <h3>1. Resumen Ejecutivo</h3>
    <p>${result.summary}</p>

    <h3>Puntos Clave</h3>
    <ul>
      ${result.keyPoints.map(pt => `<li>${pt}</li>`).join("")}
    </ul>

    <!-- 2. TRANSCRIPCIÓN DETALLADA -->
    <h3>2. Transcripción Detallada</h3>
    <div class="transcription">${result.fullTranscription}</div>
  `;

  // 3. NOTICIA PERIODÍSTICA
  if (art) {
    bodyHtml += `
      <hr style="margin-top: 30px; border: none; border-top: 2px solid #0f172a;">
      <div style="font-size: 10pt; color: #64748b; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">EDICIÓN PERIÓDICO IMPRESO / PRENSA ESCRITA</div>
      <div><span class="badge">${art.category}</span></div>
      <h1>${art.headline}</h1>
      ${art.subheadline ? `<h2>${art.subheadline}</h2>` : ""}
      <p style="color: #64748b; font-size: 10pt; font-weight: bold;">${art.dateline} — Redacción</p>
      <div class="lead">${art.leadParagraph}</div>
      <div>
        ${art.body.map(p => `<p style="margin-bottom: 12px; text-align: justify; font-family: 'Georgia', serif;">${p}</p>`).join("")}
      </div>

      <!-- 4. BOLETÍN DE RADIO 90s -->
      <div class="bulletin">
        <strong style="color: #3730a3;">📻 4. Boletín Informativo de Radio (90 segundos - Locutora de España):</strong><br><br>
        "${art.radioScript90s || art.radioScript60s || art.radioScript20s}"
      </div>
    `;
  }

  bodyHtml += `
  </body>
  </html>
  `;

  const blob = new Blob(["\ufeff" + bodyHtml], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${getSafeBaseName(result)}.doc`);
}

/**
 * Generates Markdown format (.md)
 */
export function exportToMarkdown(result: AudioProcessingResult): void {
  const dateStr = new Date(result.processedAt).toLocaleString("es-ES");
  const art = result.newsArticle;

  let md = `# ${art ? art.headline : result.title}\n\n`;
  md += `> **Ayudante de Redacción** | ${dateStr}${result.audioName ? ` | Archivo: \`${result.audioName}\`` : ""}\n\n`;

  // 1. Resumen y puntos clave
  md += `## 1. Resumen Ejecutivo\n\n${result.summary}\n\n`;

  if (result.keyPoints?.length) {
    md += `### Puntos Clave\n\n`;
    result.keyPoints.forEach(pt => {
      md += `- ${pt}\n`;
    });
    md += `\n`;
  }

  // 2. Transcripción
  md += `## 2. Transcripción Detallada\n\n\`\`\`\n${result.fullTranscription}\n\`\`\`\n\n`;

  // 3. Noticia periodística
  if (art) {
    md += `---\n\n## 3. Noticia Periodística (Edición Periódico)\n\n`;
    md += `# ${art.headline}\n\n`;
    if (art.subheadline) md += `*${art.subheadline}*\n\n`;
    md += `**Sección:** \`${art.category}\` | **Datación:** ${art.dateline}\n\n`;
    md += `> **${art.leadParagraph}**\n\n`;
    art.body.forEach(p => {
      md += `${p}\n\n`;
    });

    // 4. Boletín de radio 90s
    md += `### 📻 4. Boletín Informativo de Radio (90 Segundos - Locutora de España)\n\n`;
    md += `> "${art.radioScript90s || art.radioScript60s || art.radioScript20s}"\n\n`;
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${getSafeBaseName(result)}.md`);
}

/**
 * Generates Structured JSON (.json) format
 */
export function exportToJson(result: AudioProcessingResult): void {
  const jsonString = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${getSafeBaseName(result)}.json`);
}

/**
 * Triggers clean print-to-PDF
 */
export function printOrSavePdf(): void {
  window.print();
}
