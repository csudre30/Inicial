import fs from "fs";
import { TranscriptionResult, TranscriptSegment } from "../types";
import { TranscribeOptions, TranscriptionProvider } from "./types";

const BASE = "https://api.assemblyai.com/v2";

/**
 * Provedor real baseado na AssemblyAI. Suporta diarização (speaker_labels),
 * que é essencial para identificar cada participante da reunião, e transcrição
 * em português.
 *
 * Fluxo: faz upload do áudio -> cria o job de transcrição com speaker_labels
 * -> faz polling até concluir -> converte as "utterances" em segmentos.
 */
export class AssemblyAiProvider implements TranscriptionProvider {
  name = "assemblyai";

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY não configurada.");
  }

  private headers() {
    return { authorization: this.apiKey };
  }

  private async upload(filePath: string): Promise<string> {
    const data = fs.readFileSync(filePath);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: {
        ...this.headers(),
        "content-type": "application/octet-stream",
      },
      body: data,
    });
    if (!res.ok) {
      throw new Error(`Falha no upload (AssemblyAI): ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { upload_url: string };
    return json.upload_url;
  }

  async transcribe(
    filePath: string,
    opts: TranscribeOptions
  ): Promise<TranscriptionResult> {
    const audioUrl = await this.upload(filePath);

    const createRes = await fetch(`${BASE}/transcript`, {
      method: "POST",
      headers: { ...this.headers(), "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        language_code: opts.language,
        ...(opts.expectedSpeakers
          ? { speakers_expected: opts.expectedSpeakers }
          : {}),
      }),
    });
    if (!createRes.ok) {
      throw new Error(
        `Falha ao criar transcrição (AssemblyAI): ${createRes.status} ${await createRes.text()}`
      );
    }
    const created = (await createRes.json()) as { id: string };
    const id = created.id;

    // Polling
    const deadline = Date.now() + 1000 * 60 * 30; // 30 min
    while (Date.now() < deadline) {
      await sleep(4000);
      const pollRes = await fetch(`${BASE}/transcript/${id}`, {
        headers: this.headers(),
      });
      const poll = (await pollRes.json()) as any;
      if (poll.status === "completed") {
        return this.toResult(poll, opts.language);
      }
      if (poll.status === "error") {
        throw new Error(`Transcrição falhou (AssemblyAI): ${poll.error}`);
      }
    }
    throw new Error("Tempo esgotado aguardando a transcrição (AssemblyAI).");
  }

  private toResult(poll: any, language: string): TranscriptionResult {
    const utterances: any[] = poll.utterances ?? [];
    const segments: TranscriptSegment[] = utterances.map((u) => ({
      speaker: String(u.speaker ?? "?"),
      start: Number(u.start ?? 0),
      end: Number(u.end ?? 0),
      text: String(u.text ?? "").trim(),
    }));

    return {
      provider: this.name,
      language,
      durationMs: Number(poll.audio_duration ?? 0) * 1000,
      segments,
      fullText:
        segments.map((s) => s.text).join(" ") || String(poll.text ?? ""),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
