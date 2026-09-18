import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Candidate models for audio transcription and summarization in order of preference
const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

async function callGeminiWithFallback(
  ai: GoogleGenAI,
  contents: any,
  config: any
): Promise<string> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    // Try up to 2 attempts per candidate model in case of transient 503/429 spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[API] Intentando procesar audio con modelo: ${model} (intento ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response && response.text) {
          console.log(`[API] Éxito con modelo ${model}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = (err.message || "").toLowerCase();
        const isUnavailable =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("429");

        console.warn(`[API] Error con modelo ${model} (intento ${attempt}):`, err.message);

        if (isUnavailable && attempt === 1) {
          // Wait 1.5 seconds and retry same model once
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        // If second attempt or other error, break to next candidate model
        break;
      }
    }
  }

  // If all models failed
  throw lastError || new Error("No se pudo procesar el audio debido a alta demanda temporal en los servidores de IA.");
}

// Comprehensive audio MIME type resolver supporting any audio or video container
function resolveAudioMimeType(incomingMime?: string, fileName?: string): string {
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "mp3":
    case "mpga":
      return "audio/mp3";
    case "wav":
    case "wave":
      return "audio/wav";
    case "m4a":
    case "mp4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "ogg":
    case "oga":
    case "opus":
    case "spx":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    case "webm":
      return "audio/webm";
    case "aif":
    case "aiff":
    case "aifc":
      return "audio/aiff";
    case "3gp":
    case "3gpp":
    case "3g2":
      return "audio/3gpp";
    case "amr":
      return "audio/amr";
    case "wma":
      return "audio/x-ms-wma";
    case "caf":
      return "audio/x-caf";
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
    case "qt":
      return "video/quicktime";
    case "mkv":
      return "video/x-matroska";
    case "avi":
      return "video/x-msvideo";
    default:
      break;
  }

  const mime = (incomingMime || "").toLowerCase();
  if (mime.includes("mpeg") || mime.includes("mp3")) return "audio/mp3";
  if (mime.includes("wav")) return "audio/wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "audio/mp4";
  if (mime.includes("aac")) return "audio/aac";
  if (mime.includes("ogg") || mime.includes("opus")) return "audio/ogg";
  if (mime.includes("flac")) return "audio/flac";
  if (mime.includes("webm")) return "audio/webm";
  if (mime.includes("aiff") || mime.includes("aif")) return "audio/aiff";
  if (mime.includes("3gpp") || mime.includes("3gp")) return "audio/3gpp";
  if (mime.includes("amr")) return "audio/amr";
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return mime;

  return "audio/mp3";
}

function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // 16 bits
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // High body limit for audio uploads in base64
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Text to Speech endpoint with Professional AI voice
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "Kore" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ 
          success: false, 
          error: "El texto a locutar es requerido." 
        });
      }

      const ai = getGenAI();

      // Voices available: 'Kore' (female anchor, balanced & clear), 'Aoede' (female), 'Puck' (male radio), 'Fenrir' (male)
      const validVoices = ["Kore", "Aoede", "Puck", "Fenrir", "Zephyr", "Charon"];
      const selectedVoice = validVoices.includes(voice) ? voice : "Kore";

      let base64Pcm = "";
      let rate = 24000;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: text.trim() }] }],
          config: {
            systemInstruction: "Eres una locutora profesional de noticias e informativos de radio en España (estilo Radio Nacional de España - RNE, Cadena SER u Onda Cero). Tu locución es clara, precisa, dinámica, con perfecta dicción y entonación de boletín de radio español.",
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (audioPart && audioPart.data) {
          base64Pcm = audioPart.data;
          if (audioPart.mimeType && audioPart.mimeType.includes("rate=")) {
            const match = audioPart.mimeType.match(/rate=(\d+)/);
            if (match) rate = parseInt(match[1], 10);
          }
        }
      } catch (primaryErr: any) {
        console.warn("TTS Primary model limitation / quota exceeded:", primaryErr?.message);
        // Instead of throwing a 500 error that breaks the UI, notify client to activate native Spain voice seamlessly
        return res.json({
          success: false,
          fallbackToBrowser: true,
          error: "La cuota diaria de síntesis neural con IA está temporalmente completada. Se activará la locutora en español (España) de tu sistema.",
          details: primaryErr?.message || "Quota or model unavailable",
        });
      }

      if (!base64Pcm) {
        return res.json({
          success: false,
          fallbackToBrowser: true,
          error: "No se pudo generar audio neural en este momento. Se activará la locutora en directo.",
        });
      }

      // Prepend standard WAV header to raw PCM so it plays seamlessly in all browsers and audio tags
      const pcmBuffer = Buffer.from(base64Pcm, "base64");
      const wavBuffer = pcmToWavBuffer(pcmBuffer, rate, 1);
      const wavBase64 = wavBuffer.toString("base64");

      return res.json({
        success: true,
        audioBase64: wavBase64,
        mimeType: "audio/wav",
        voice: selectedVoice,
        sampleRate: rate,
      });
    } catch (err: any) {
      console.error("Error en endpoint /api/tts:", err);
      return res.json({
        success: false,
        fallbackToBrowser: true,
        error: "Error temporal con el servicio de IA. Se activará la locución directa del sistema.",
      });
    }
  });

  // Transcription, News Article, and Summary generation
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, fileName, customInstructions } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ 
          success: false, 
          error: "No se recibió el archivo de audio para transcribir." 
        });
      }

      const ai = getGenAI();

      // Resolve proper MIME type for any audio or media container
      const normalizedMimeType = resolveAudioMimeType(mimeType, fileName);

      const promptText = `
Analiza exhaustivamente este archivo de audio (${fileName || "audio.mp3"}).
${customInstructions ? `Instrucciones adicionales del usuario: "${customInstructions}"` : ""}

Tu tarea como redactor jefe y transcriptor experto es:
1. title: Genera un título representativo y conciso del audio o tema tratado.
2. fullTranscription: Genera la TRANSCRIPCIÓN DETALLADA Y COMPLETA palabra por palabra, con alta fidelidad fonética.
   REGLAS CRÍTICAS DE FORMATO:
   - CAMBIO DE LÍNEA AL CAMBIAR DE HABLANTE: Salta de línea obligatoriamente siempre que cambie la persona que habla, indicando el hablante (ej: "Entrevistador:", "Hablante 1:", "Hablante 2:", o el nombre si se conoce).
   - CAMBIO DE LÍNEA EN PREGUNTAS: Salta de línea también cada vez que se formule una pregunta.
   - PREGUNTAS EN NEGRITA: Pon SIEMPRE las preguntas en negrita usando sintaxis markdown **¿...?** (ej: "**¿Cuáles serán los plazos de ejecución del proyecto?**").
3. summary: Elabora un RESUMEN claro, articulado y completo de los temas principales tratados en el audio.
4. keyPoints: Extrae una lista concisa de los PUNTOS CLAVE más importantes y conclusiones del audio. OBLIGATORIO: En cada punto clave, incluye al inicio el minuto y segundo exacto o aproximado de la grabación en el que se dice o trata ese asunto, usando el formato [mm:ss] (ejemplo: "[01:24] Anuncio oficial sobre la fecha límite de presentación", "[03:40] Confirmación del acuerdo de financiación").
5. newsArticle: Redacta una NOTICIA PERIODÍSTICA PROFESIONAL impecable basada en el contenido del audio, con los más altos estándares periodísticos de agencia (estilo EFE / Reuters / El País):
   - headline: Titular periodístico de gran impacto, riguroso, directo y atractivo.
   - subheadline: Subtítulo informativo que complementa y da contexto al titular.
   - category: Sección temática (ej: Sociedad, Economía, Política, Tecnología, Internacional, Cultura, Deportes, Salud).
   - dateline: Lugar y datación de agencia (ej: "MADRID (Redacción)").
   - leadParagraph: Entradilla periodística (Lead) que responde con precisión a las 5 preguntas clave (Qué, Quién, Cuándo, Dónde, Por qué).
   - body: Array con 3 a 5 párrafos estructurados que desarrollan los hechos en orden de interés decreciente (pirámide invertida), incluyendo citas textuales entrecomilladas de lo dicho en el audio y contexto analítico.
    - radioScript90s: Un guion de BOLETÍN INFORMATIVO DE RADIO de aproximadamente 90 SEGUNDOS de duración (entre 210 y 230 palabras a cadencia de locución radiofónica en España de ~140-150 palabras/minuto). Debe tener el ritmo, claridad, dinamismo y profesionalidad característicos de los boletines informativos de radio en España (estilo Radio Nacional de España - RNE, Cadena SER u Onda Cero): apertura sonora con saludo y hora ("Son las... les contamos la última hora..."), desarrollo riguroso con datos clave, citas textuales y declaraciones, y cierre con firma de emisora.
    - radioScript60s: Versión condensada del boletín en 60 segundos (135-155 palabras).
    - radioScript20s: Síntesis breve del boletín en 20-30 segundos (60-80 palabras).

Responde estrictamente en formato JSON válido según el esquema especificado.
`;

      const audioPart = {
        inlineData: {
          mimeType: normalizedMimeType,
          data: audioBase64,
        },
      };

      const contents = {
        parts: [
          audioPart,
          { text: promptText },
        ],
      };

      const config = {
        systemInstruction:
          "Eres un redactor jefe de agencia de noticias y transcriptor profesional de alta precisión en español. Tu redacción periodística es rigurosa, vibrante, neutral y estructurada según los estándares del periodismo contemporáneo.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Título conciso y representativo del audio",
            },
            fullTranscription: {
              type: Type.STRING,
              description: "Transcripción detallada palabra por palabra con saltos de línea al cambiar de hablante o al formular preguntas, y preguntas resaltadas en **negrita**",
            },
            summary: {
              type: Type.STRING,
              description: "Resumen claro, completo y articulado de los temas tratados",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de puntos clave identificados, cada uno con su marca de tiempo [mm:ss] al inicio (ej: '[01:25] Punto clave')",
            },
            newsArticle: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING, description: "Titular periodístico de gran impacto" },
                subheadline: { type: Type.STRING, description: "Subtítulo periodístico informativo" },
                category: { type: Type.STRING, description: "Sección temática de la noticia" },
                dateline: { type: Type.STRING, description: "Datación de agencia (ej: MADRID (Redacción))" },
                leadParagraph: { type: Type.STRING, description: "Entradilla periodística con las 5 preguntas clave" },
                body: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Párrafos del cuerpo de la noticia periodística con citas textuales",
                },
                radioScript90s: {
                  type: Type.STRING,
                  description: "Guion de boletín radiofónico de aproximadamente 90 segundos (210-230 palabras) estilo radio española RNE / SER",
                },
                radioScript60s: {
                  type: Type.STRING,
                  description: "Guion de boletín radiofónico de aproximadamente 60 segundos (135-155 palabras)",
                },
                radioScript20s: {
                  type: Type.STRING,
                  description: "Guion breve de boletín radiofónico de 20 a 30 segundos (60-80 palabras)",
                },
              },
              required: ["headline", "subheadline", "category", "dateline", "leadParagraph", "body", "radioScript90s"],
            },
          },
          required: ["title", "fullTranscription", "summary", "keyPoints", "newsArticle"],
        },
      };

      const rawResponseText = await callGeminiWithFallback(ai, contents, config);

      // Clean response text in case it has markdown wrapping
      let cleanText = rawResponseText.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.slice(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.slice(0, -3);
      }
      cleanText = cleanText.trim();

      const parsedData = JSON.parse(cleanText);

      const radio90 = parsedData.newsArticle?.radioScript90s || parsedData.newsArticle?.radioScript60s || parsedData.newsArticle?.radioScript20s || "";
      const radio60 = parsedData.newsArticle?.radioScript60s || radio90;

      return res.json({
        success: true,
        data: {
          title: parsedData.title || (fileName || "Audio Procesado"),
          fullTranscription: parsedData.fullTranscription || "",
          summary: parsedData.summary || "",
          keyPoints: Array.isArray(parsedData.keyPoints) ? parsedData.keyPoints : [],
          newsArticle: parsedData.newsArticle ? {
            ...parsedData.newsArticle,
            radioScript90s: radio90,
            radioScript60s: radio60,
            radioScript20s: parsedData.newsArticle.radioScript20s || "",
          } : undefined,
          processedAt: new Date().toISOString(),
          audioName: fileName || "audio.mp3",
        },
      });
    } catch (error: any) {
      console.error("Error al procesar el audio:", error);

      let userFriendlyMessage = error.message || "Error al transcribir el audio.";
      const errMsg = (error.message || "").toLowerCase();
      if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("unavailable")) {
        userFriendlyMessage =
          "El servicio de inteligencia artificial está experimentando una demanda alta temporalmente en sus servidores. Por favor, pulsa nuevamente en procesar en unos segundos.";
      } else if (errMsg.includes("resource_exhausted") || errMsg.includes("429")) {
        userFriendlyMessage =
          "Límite de solicitudes temporales alcanzado. Por favor espera un momento y vuelve a intentarlo.";
      }

      return res.status(500).json({
        success: false,
        error: userFriendlyMessage,
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer();
