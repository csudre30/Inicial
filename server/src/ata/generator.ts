import Anthropic from "@anthropic-ai/sdk";
import { config, hasAnthropic } from "../config";
import { Meeting } from "../types";
import { formatDialogue } from "../utils/diarization";
import { aberturaFormal, gerarAtaTemplate } from "./redacaoOficial";

const SYSTEM_PROMPT = `Você é um servidor público brasileiro especializado em secretariado executivo e na elaboração de atas de reunião segundo o Manual de Redação Oficial da Presidência da República.

Sua tarefa é redigir a ATA de uma reunião a partir da transcrição diarizada (com cada fala atribuída ao respectivo participante).

Observe rigorosamente os princípios da redação oficial:
- Impessoalidade, formalidade e padrão culto da língua.
- Clareza, concisão e uniformidade; evite coloquialismos, gírias e juízos de valor.
- Use terceira pessoa e voz preferencialmente impessoal.
- Não invente fatos, nomes, números ou deliberações que não constem da transcrição.

Estrutura obrigatória da ata:
1. Título: "ATA DE REUNIÃO" seguido do nome/identificação da reunião e do órgão.
2. Abertura formal com data e hora POR EXTENSO (ex.: "Aos vinte e três dias do mês de junho do ano de dois mil e vinte e seis, às quatorze horas...").
3. Relação dos participantes presentes (com cargos quando informados; em reunião híbrida, indique quem participou presencialmente e quem participou remotamente, se essa informação existir).
4. Ordem do dia / pauta, quando houver.
5. Desenvolvimento em texto corrido, narrando as discussões e ATRIBUINDO CORRETAMENTE cada manifestação ao participante que a proferiu (ex.: "O Sr. Fulano de Tal manifestou que...", "A Sra. Beltrana ponderou que..."). É essencial preservar a autoria de cada fala.
6. Registro objetivo das deliberações, encaminhamentos e responsáveis.
7. Encerramento com a fórmula consagrada: "Nada mais havendo a tratar, foram encerrados os trabalhos, dos quais, para constar, lavrou-se a presente ata que, após lida e achada conforme, vai assinada pelos presentes."

Produza SOMENTE o texto final da ata, sem comentários, sem markdown e sem títulos de seção entre colchetes.`;

function montarPrompt(meeting: Meeting): string {
  const linhas: string[] = [];
  linhas.push(`# Metadados da reunião`);
  linhas.push(`Título: ${meeting.titulo}`);
  if (meeting.orgao) linhas.push(`Órgão: ${meeting.orgao}`);
  if (meeting.local) linhas.push(`Local: ${meeting.local}`);
  linhas.push(
    `Modalidade: ${
      meeting.modalidade === "hibrida" ? "híbrida" : "presencial"
    }`
  );
  linhas.push(`Data/hora (ISO): ${meeting.dataReuniao}`);
  linhas.push(
    `Sugestão de abertura formal já calculada (use como base): ${aberturaFormal(
      meeting
    )}`
  );

  if (meeting.participantes.length > 0) {
    linhas.push("");
    linhas.push(`# Participantes informados`);
    for (const p of meeting.participantes) {
      const cargo = p.cargo ? ` — ${p.cargo}` : "";
      const presenca = p.presenca ? ` (${p.presenca})` : "";
      linhas.push(`- ${p.nome}${cargo}${presenca}`);
    }
  }

  if (meeting.pauta && meeting.pauta.length > 0) {
    linhas.push("");
    linhas.push(`# Pauta`);
    meeting.pauta.forEach((item, i) => linhas.push(`${i + 1}. ${item}`));
  }

  linhas.push("");
  linhas.push(`# Transcrição diarizada (cada linha: [tempo] Participante: fala)`);
  linhas.push(
    meeting.transcription
      ? formatDialogue(meeting.transcription, meeting.speakerMapping)
      : "(sem transcrição disponível)"
  );

  linhas.push("");
  linhas.push(
    `Redija agora a ata oficial completa, preservando a identificação de cada participante em suas manifestações.`
  );
  return linhas.join("\n");
}

export interface AtaResult {
  texto: string;
  geradaPor: string;
}

/**
 * Gera a ata. Usa a API da Claude (claude-opus-4-8) quando há chave configurada;
 * caso contrário, recorre ao gerador determinístico baseado em template, de modo
 * que a aplicação continue funcional offline.
 */
export async function gerarAta(meeting: Meeting): Promise<AtaResult> {
  if (!hasAnthropic()) {
    return {
      texto: gerarAtaTemplate(meeting),
      geradaPor: "template-redacao-oficial",
    };
  }

  try {
    const client = new Anthropic({ apiKey: config.anthropic.apiKey });
    const stream = client.messages.stream({
      model: config.anthropic.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: montarPrompt(meeting) }],
    });
    const message = await stream.finalMessage();
    const texto = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) {
      return {
        texto: gerarAtaTemplate(meeting),
        geradaPor: "template-redacao-oficial (resposta vazia da IA)",
      };
    }
    return { texto, geradaPor: `claude:${config.anthropic.model}` };
  } catch (err) {
    // Em caso de falha da IA, não deixa o usuário sem ata.
    const motivo = err instanceof Error ? err.message : String(err);
    return {
      texto: gerarAtaTemplate(meeting),
      geradaPor: `template-redacao-oficial (falha na IA: ${motivo})`,
    };
  }
}
