import dotenv from "dotenv";
import path from "path";

dotenv.config();

const root = path.resolve(__dirname, "..");

export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** Diretório onde os áudios enviados/gravados são persistidos. */
  uploadDir: path.join(root, "storage", "uploads"),
  /** Arquivo de índice (JSON) com os metadados das reuniões. */
  dbFile: path.join(root, "storage", "meetings.json"),
  /** Pasta estática com o build do frontend (web/dist). */
  webDist: path.resolve(root, "..", "web", "dist"),

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  },

  transcription: {
    /** "assemblyai" usa a API real; "mock" gera transcrição de demonstração. */
    provider: (process.env.TRANSCRIPTION_PROVIDER ?? "auto") as
      | "auto"
      | "assemblyai"
      | "mock",
    assemblyAiKey: process.env.ASSEMBLYAI_API_KEY ?? "",
    /** Código de idioma padrão das reuniões. */
    language: process.env.TRANSCRIPTION_LANGUAGE ?? "pt",
  },

  /** Limite de upload em bytes (padrão 200 MB). */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 200 * 1024 * 1024),
};

export function hasAnthropic(): boolean {
  return Boolean(config.anthropic.apiKey);
}

export function resolveTranscriptionProvider(): "assemblyai" | "mock" {
  if (config.transcription.provider === "assemblyai") return "assemblyai";
  if (config.transcription.provider === "mock") return "mock";
  // auto: usa AssemblyAI se houver chave, caso contrário cai no mock.
  return config.transcription.assemblyAiKey ? "assemblyai" : "mock";
}
