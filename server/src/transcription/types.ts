import { TranscriptionResult } from "../types";

export interface TranscribeOptions {
  language: string;
  /** Quantidade esperada de participantes (ajuda a diarização). */
  expectedSpeakers?: number;
}

export interface TranscriptionProvider {
  name: string;
  transcribe(
    filePath: string,
    opts: TranscribeOptions
  ): Promise<TranscriptionResult>;
}
