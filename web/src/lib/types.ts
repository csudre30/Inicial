export type Modalidade = "presencial" | "hibrida";

export type MeetingStatus =
  | "criada"
  | "transcrevendo"
  | "transcrita"
  | "gerando_ata"
  | "concluida"
  | "erro";

export interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  provider: string;
  language: string;
  durationMs: number;
  segments: TranscriptSegment[];
  fullText: string;
}

export interface SpeakerMapping {
  [rawSpeaker: string]: { nome: string; cargo?: string };
}

export interface Participante {
  nome: string;
  cargo?: string;
  presenca?: "presencial" | "remoto";
}

export interface Meeting {
  id: string;
  titulo: string;
  orgao?: string;
  local?: string;
  modalidade: Modalidade;
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

export interface AppConfig {
  transcriptionProvider: "assemblyai" | "mock";
  anthropicConfigured: boolean;
  anthropicModel: string;
  maxUploadBytes: number;
}
