import { describe, it, expect } from "vitest";
import {
  listSpeakers,
  resolveSpeakerName,
  formatDialogue,
  speakingTimeByName,
} from "../utils/diarization";
import { TranscriptionResult } from "../types";

const result: TranscriptionResult = {
  provider: "mock",
  language: "pt",
  durationMs: 30000,
  fullText: "Olá a todos. Bom dia. Vamos começar.",
  segments: [
    { speaker: "A", start: 0, end: 5000, text: "Olá a todos." },
    { speaker: "B", start: 5000, end: 9000, text: "Bom dia." },
    { speaker: "A", start: 9000, end: 12000, text: "Vamos começar." },
  ],
};

describe("listSpeakers", () => {
  it("lista locutores na ordem de aparição, sem repetição", () => {
    expect(listSpeakers(result)).toEqual(["A", "B"]);
  });
});

describe("resolveSpeakerName", () => {
  it("aplica nome e cargo do mapeamento", () => {
    const nome = resolveSpeakerName("A", {
      A: { nome: "Ana", cargo: "Diretora" },
    });
    expect(nome).toBe("Ana (Diretora)");
  });

  it("usa rótulo genérico quando não há mapeamento", () => {
    expect(resolveSpeakerName("C")).toBe("Participante C");
  });
});

describe("formatDialogue", () => {
  it("atribui cada fala ao participante identificado", () => {
    const txt = formatDialogue(result, {
      A: { nome: "Ana" },
      B: { nome: "Bruno" },
    });
    expect(txt).toContain("Ana: Olá a todos.");
    expect(txt).toContain("Bruno: Bom dia.");
    expect(txt).toMatch(/\[00:00\]/);
  });
});

describe("speakingTimeByName", () => {
  it("soma o tempo de fala por participante", () => {
    const totals = speakingTimeByName(result, {
      A: { nome: "Ana" },
      B: { nome: "Bruno" },
    });
    expect(totals["Ana"]).toBe(8000);
    expect(totals["Bruno"]).toBe(4000);
  });
});
