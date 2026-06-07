export type Modalidade = "presencial" | "hibrida";

export type MeetingStatus =
  | "criada"
  | "transcrevendo"
  | "transcrita"
  | "gerando_ata"
  | "concluida"
  | "erro";

/** Um trecho de fala atribuído a um locutor pela diarização. */
export interface TranscriptSegment {
  /** Rótulo bruto do locutor produzido pela diarização (ex.: "A", "B"). */
  speaker: string;
  /** Início da fala em milissegundos. */
  start: number;
  /** Fim da fala em milissegundos. */
  end: number;
  text: string;
}

export interface TranscriptionResult {
  provider: string;
  language: string;
  durationMs: number;
  segments: TranscriptSegment[];
  /** Texto corrido completo, sem rótulos. */
  fullText: string;
}

/** Mapeia o rótulo bruto do locutor para um participante identificado. */
export interface SpeakerMapping {
  [rawSpeaker: string]: {
    nome: string;
    cargo?: string;
  };
}

export interface Participante {
  nome: string;
  cargo?: string;
  /** "presencial" ou "remoto" (relevante em reuniões híbridas). */
  presenca?: "presencial" | "remoto";
}

export interface Meeting {
  id: string;
  titulo: string;
  orgao?: string;
  local?: string;
  modalidade: Modalidade;
  /** Data/hora da reunião em ISO 8601. */
  dataReuniao: string;
  participantes: Participante[];
  pauta?: string[];
  status: MeetingStatus;
  erro?: string;

  audioFile?: string;
  audioOriginalName?: string;
  audioMime?: string;

  transcription?: TranscriptionResult;
  speakerMapping?: SpeakerMapping;
  ata?: string;
  ataGeradaPor?: string;

  criadaEm: string;
  atualizadaEm: string;
}

export interface CreateMeetingInput {
  titulo: string;
  orgao?: string;
  local?: string;
  modalidade?: Modalidade;
  dataReuniao?: string;
  participantes?: Participante[];
  pauta?: string[];
}
