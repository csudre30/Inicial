import fs from "fs";
import { TranscriptionResult, TranscriptSegment } from "../types";
import { TranscribeOptions, TranscriptionProvider } from "./types";

/**
 * Provedor de demonstração. Não chama nenhuma API externa: gera uma transcrição
 * diarizada plausível em português. Serve para desenvolvimento, testes e para
 * que toda a aplicação funcione mesmo sem chaves de API configuradas.
 *
 * O conteúdo é determinístico (depende do tamanho do arquivo) para que os
 * testes sejam reprodutíveis.
 */
const ROTEIRO: Array<{ speaker: string; text: string; durMs: number }> = [
  {
    speaker: "A",
    text:
      "Bom dia a todos. Declaro aberta a reunião e agradeço a presença dos senhores e senhoras. Vamos seguir a pauta previamente encaminhada.",
    durMs: 14000,
  },
  {
    speaker: "B",
    text:
      "Bom dia. Gostaria de registrar que o relatório financeiro do trimestre já foi distribuído por correio eletrônico aos membros.",
    durMs: 11000,
  },
  {
    speaker: "A",
    text:
      "Perfeito. O primeiro item da pauta trata da aprovação das contas. Coloco em discussão. Alguém deseja se manifestar?",
    durMs: 12000,
  },
  {
    speaker: "C",
    text:
      "Sim. Sugiro que a aprovação seja condicionada ao envio dos comprovantes pendentes até o final da próxima semana.",
    durMs: 10000,
  },
  {
    speaker: "B",
    text:
      "Concordo com a ponderação. Comprometo-me a encaminhar a documentação complementar dentro do prazo proposto.",
    durMs: 9000,
  },
  {
    speaker: "A",
    text:
      "Não havendo objeções, as contas ficam aprovadas com a ressalva apresentada. Passemos ao segundo item, sobre o cronograma de obras.",
    durMs: 13000,
  },
  {
    speaker: "C",
    text:
      "O cronograma prevê a conclusão da primeira etapa em sessenta dias. Solicito autorização para contratar a empresa responsável pela fiscalização.",
    durMs: 12000,
  },
  {
    speaker: "A",
    text:
      "Defiro a solicitação, observados os trâmites legais de licitação. Encerro os trabalhos e agradeço a colaboração de todos.",
    durMs: 11000,
  },
];

export class MockTranscriptionProvider implements TranscriptionProvider {
  name = "mock";

  async transcribe(
    filePath: string,
    opts: TranscribeOptions
  ): Promise<TranscriptionResult> {
    // Usa o tamanho do arquivo apenas para variar levemente os tempos.
    let sizeSeed = 1;
    try {
      sizeSeed = Math.max(1, fs.statSync(filePath).size % 5);
    } catch {
      /* ignora */
    }

    const segments: TranscriptSegment[] = [];
    let cursor = 800;
    for (const linha of ROTEIRO) {
      const dur = linha.durMs + sizeSeed * 200;
      segments.push({
        speaker: linha.speaker,
        start: cursor,
        end: cursor + dur,
        text: linha.text,
      });
      cursor += dur + 600;
    }

    return {
      provider: this.name,
      language: opts.language,
      durationMs: cursor,
      segments,
      fullText: segments.map((s) => s.text).join(" "),
    };
  }
}
