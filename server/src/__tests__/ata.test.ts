import { describe, it, expect } from "vitest";
import { gerarAta } from "../ata/generator";
import { MockTranscriptionProvider } from "../transcription/mock";
import { Meeting } from "../types";

describe("geração de ata (fallback offline)", () => {
  it("gera ata a partir de transcrição diarizada sem depender de IA", async () => {
    const provider = new MockTranscriptionProvider();
    // O mock não lê o arquivo de fato além do tamanho; um caminho inexistente
    // apenas usa a semente padrão.
    const transcription = await provider.transcribe("/tmp/inexistente.webm", {
      language: "pt",
    });

    const meeting: Meeting = {
      id: "m1",
      titulo: "Reunião de Teste",
      orgao: "Órgão X",
      modalidade: "presencial",
      dataReuniao: "2026-06-23T14:00:00",
      participantes: [
        { nome: "Ana", cargo: "Presidente" },
        { nome: "Bruno", cargo: "Conselheiro" },
        { nome: "Carla", cargo: "Conselheira" },
      ],
      speakerMapping: {
        A: { nome: "Ana", cargo: "Presidente" },
        B: { nome: "Bruno", cargo: "Conselheiro" },
        C: { nome: "Carla", cargo: "Conselheira" },
      },
      transcription,
      status: "transcrita",
      criadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
    };

    const { texto, geradaPor } = await gerarAta(meeting);
    expect(geradaPor).toContain("template-redacao-oficial");
    expect(texto).toContain("ATA DE REUNIÃO");
    expect(texto).toContain("Ana (Presidente)");
    expect(texto).toContain("lavrou-se a presente ata");
  });
});
