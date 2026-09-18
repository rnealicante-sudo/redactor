export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 portion from data URL (data:audio/mp3;base64,...)
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extracts and formats a clean visual format badge for any audio/video file name
 */
export function getAudioFormatLabel(fileName: string, mimeType?: string): string {
  const ext = (fileName || "").split(".").pop()?.toUpperCase();
  if (ext && ext.length <= 5 && !ext.includes(" ")) {
    return ext;
  }
  if (mimeType) {
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "MP3";
    if (mimeType.includes("wav")) return "WAV";
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "M4A";
    if (mimeType.includes("ogg") || mimeType.includes("opus")) return "OGG";
    if (mimeType.includes("flac")) return "FLAC";
    if (mimeType.includes("webm")) return "WEBM";
    if (mimeType.includes("aac")) return "AAC";
  }
  return "AUDIO";
}

/**
 * Converts an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length minus 8
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * numChannels * 2)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (numChannels * 2)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, length, true);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

/**
 * Attempts to decode any audio file using Web Audio API and transcode it to standard WAV format.
 * Enables 100% universal support for obscure codecs (WMA, CAF, AAC, OPUS, OGG, WebM, etc.).
 */
export async function convertAudioToWav(file: File | Blob): Promise<Blob> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API no está disponible en este navegador.");
  }

  const audioCtx = new AudioContextClass();
  try {
    const arrayBuffer = await file.arrayBuffer();
    // decodeAudioData decodes the media stream using browser native codecs
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBufferToWav(decodedBuffer);
  } finally {
    if (audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Creates a synthesized demonstration audio file (WAV format)
 * so user can immediately test without finding a file.
 */
export async function createDemoMeetingAudio(): Promise<{ blob: Blob; fileName: string }> {
  const sampleRate = 16000;
  const duration = 4.5;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Generate synthetic human speech-like formant harmonics
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllableEnvelope = Math.sin(t * 8) * 0.5 + 0.5;
    const f0 = 130 + 15 * Math.sin(t * 3);
    const wave =
      0.6 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * (f0 * 2) * t) +
      0.2 * Math.sin(2 * Math.PI * 750 * t) * syllableEnvelope +
      0.1 * Math.sin(2 * Math.PI * 1800 * t) * syllableEnvelope;

    const sample = Math.max(-1, Math.min(1, wave * syllableEnvelope * 0.45));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return { blob, fileName: "audio_demostracion_reunion.wav" };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
