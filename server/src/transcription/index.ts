import { config, resolveTranscriptionProvider } from "../config";
import { AssemblyAiProvider } from "./assemblyai";
import { MockTranscriptionProvider } from "./mock";
import { TranscriptionProvider } from "./types";

export function getTranscriptionProvider(): TranscriptionProvider {
  const choice = resolveTranscriptionProvider();
  if (choice === "assemblyai") {
    return new AssemblyAiProvider(config.transcription.assemblyAiKey);
  }
  return new MockTranscriptionProvider();
}

export * from "./types";
