import { Meeting } from "../types";
import { formatDialogue, resolveSpeakerName } from "../utils/diarization";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

/** Número por extenso para dias do mês (1 a 31). */
export function numeroPorExtenso(n: number): string {
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DEZENAS[d] : `${DEZENAS[d]} e ${UNIDADES[u]}`;
}

/** Ano por extenso (ex.: 2026 -> "dois mil e vinte e seis"). */
export function anoPorExtenso(ano: number): string {
  if (ano < 2000 || ano > 2099) return String(ano);
  const resto = ano - 2000;
  if (resto === 0) return "dois mil";
  return `dois mil e ${numeroPorExtenso(resto)}`;
}

/** Hora no formato "14h30" a partir de um Date. */
export function horaFormatada(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h} horas` : `${h} horas e ${m} minutos`;
}

/**
 * Abertura formal de ata no padrão da Redação Oficial:
 * "Aos vinte e três dias do mês de junho do ano de dois mil e vinte e seis, às
 *  quatorze horas, ..."
 */
export function aberturaFormal(meeting: Meeting): string {
  const d = new Date(meeting.dataReuniao);
  const dia = numeroPorExtenso(d.getDate());
  const mes = MESES[d.getMonth()];
  const ano = anoPorExtenso(d.getFullYear());
  const hora = horaFormatada(d);
  const local = meeting.local ? `, ${meeting.local}` : "";
  const orgao = meeting.orgao ? `, no(a) ${meeting.orgao}` : "";
  const modalidade =
    meeting.modalidade === "hibrida"
      ? ", em reunião híbrida (com participação presencial e remota),"
      : ", em reunião presencial,";
  return `Aos ${dia} dias do mês de ${mes} do ano de ${ano}, às ${hora}${orgao}${local}${modalidade} reuniram-se os participantes adiante nominados para tratar da seguinte ordem do dia.`;
}

function listaParticipantes(meeting: Meeting): string {
  const fonte =
    meeting.participantes.length > 0
      ? meeting.participantes.map((p) => {
          const cargo = p.cargo ? `, ${p.cargo}` : "";
          const presenca =
            meeting.modalidade === "hibrida" && p.presenca
              ? ` [${p.presenca}]`
              : "";
          return `${p.nome}${cargo}${presenca}`;
        })
      : derivarParticipantesDaTranscricao(meeting);
  if (fonte.length === 0) return "os presentes";
  return fonte.join("; ");
}

function derivarParticipantesDaTranscricao(meeting: Meeting): string[] {
  if (!meeting.transcription) return [];
  const nomes = new Set<string>();
  for (const seg of meeting.transcription.segments) {
    nomes.add(resolveSpeakerName(seg.speaker, meeting.speakerMapping));
  }
  return Array.from(nomes);
}

/**
 * Gera uma ata determinística seguindo as normas de Redação Oficial — usada
 * como alternativa quando a API de IA não está configurada. Mantém:
 * impessoalidade, formalidade, abertura por extenso e fórmula de encerramento.
 */
export function gerarAtaTemplate(meeting: Meeting): string {
  const partes: string[] = [];

  partes.push(`ATA DE REUNIÃO`);
  partes.push(meeting.titulo.toUpperCase());
  if (meeting.orgao) partes.push(meeting.orgao);
  partes.push("");
  partes.push(aberturaFormal(meeting));
  partes.push("");
  partes.push(`PARTICIPANTES: ${listaParticipantes(meeting)}.`);
  partes.push("");

  if (meeting.pauta && meeting.pauta.length > 0) {
    partes.push("ORDEM DO DIA:");
    meeting.pauta.forEach((item, i) => partes.push(`${i + 1}. ${item}`));
    partes.push("");
  }

  partes.push("DELIBERAÇÕES E REGISTROS:");
  if (meeting.transcription) {
    partes.push(
      "Aberta a sessão, procederam-se às discussões conforme registrado a seguir, " +
        "preservando-se a identificação de cada participante:"
    );
    partes.push("");
    partes.push(formatDialogue(meeting.transcription, meeting.speakerMapping));
  } else {
    partes.push(
      "Os trabalhos transcorreram conforme a ordem do dia, sem registros adicionais."
    );
  }
  partes.push("");

  partes.push(
    "Nada mais havendo a tratar, foram encerrados os trabalhos, dos quais, " +
      "para constar, lavrou-se a presente ata que, após lida e achada conforme, " +
      "vai assinada pelos presentes."
  );

  return partes.join("\n");
}
