import {
  SpeakerMapping,
  TranscriptionResult,
  TranscriptSegment,
} from "../types";

/** Retorna os rótulos brutos de locutores presentes na transcrição, em ordem de aparição. */
export function listSpeakers(result: TranscriptionResult): string[] {
  const seen: string[] = [];
  for (const seg of result.segments) {
    if (!seen.includes(seg.speaker)) seen.push(seg.speaker);
  }
  return seen;
}

/** Nome legível para um locutor, aplicando o mapeamento informado pelo usuário. */
export function resolveSpeakerName(
  raw: string,
  mapping?: SpeakerMapping
): string {
  const mapped = mapping?.[raw];
  if (mapped?.nome) {
    return mapped.cargo ? `${mapped.nome} (${mapped.cargo})` : mapped.nome;
  }
  return `Participante ${raw}`;
}

function fmtTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Formata a transcrição como diálogo identificado por participante, com
 * marcação de tempo. É esta representação — com cada fala atribuída ao seu
 * autor — que alimenta a geração da ata, garantindo a correta identificação
 * dos participantes.
 */
export function formatDialogue(
  result: TranscriptionResult,
  mapping?: SpeakerMapping
): string {
  return result.segments
    .map((seg: TranscriptSegment) => {
      const nome = resolveSpeakerName(seg.speaker, mapping);
      return `[${fmtTimestamp(seg.start)}] ${nome}: ${seg.text}`;
    })
    .join("\n");
}

/** Tempo total de fala (ms) por participante já identificado. */
export function speakingTimeByName(
  result: TranscriptionResult,
  mapping?: SpeakerMapping
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const seg of result.segments) {
    const nome = resolveSpeakerName(seg.speaker, mapping);
    totals[nome] = (totals[nome] ?? 0) + Math.max(0, seg.end - seg.start);
  }
  return totals;
}
