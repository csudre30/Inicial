import { describe, it, expect } from "vitest";
import {
  numeroPorExtenso,
  anoPorExtenso,
  aberturaFormal,
  gerarAtaTemplate,
} from "../ata/redacaoOficial";
import { Meeting } from "../types";

function meetingBase(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: "m1",
    titulo: "Reunião Ordinária do Conselho",
    orgao: "Secretaria de Administração",
    local: "Sala 101",
    modalidade: "presencial",
    dataReuniao: "2026-06-23T14:00:00",
    participantes: [
      { nome: "João da Silva", cargo: "Presidente" },
      { nome: "Maria Souza", cargo: "Secretária" },
    ],
    pauta: ["Aprovação das contas", "Cronograma de obras"],
    status: "transcrita",
    criadaEm: "2026-06-23T13:00:00Z",
    atualizadaEm: "2026-06-23T13:00:00Z",
    ...overrides,
  };
}

describe("número por extenso", () => {
  it("converte unidades e dezenas", () => {
    expect(numeroPorExtenso(1)).toBe("um");
    expect(numeroPorExtenso(15)).toBe("quinze");
    expect(numeroPorExtenso(23)).toBe("vinte e três");
    expect(numeroPorExtenso(30)).toBe("trinta");
    expect(numeroPorExtenso(31)).toBe("trinta e um");
  });
});

describe("ano por extenso", () => {
  it("converte anos 20xx", () => {
    expect(anoPorExtenso(2000)).toBe("dois mil");
    expect(anoPorExtenso(2026)).toBe("dois mil e vinte e seis");
  });
});

describe("abertura formal", () => {
  it("contém data e hora por extenso no padrão oficial", () => {
    const a = aberturaFormal(meetingBase());
    expect(a).toContain("Aos vinte e três dias do mês de junho");
    expect(a).toContain("do ano de dois mil e vinte e seis");
    expect(a).toContain("14 horas");
    expect(a).toContain("reunião presencial");
  });

  it("indica modalidade híbrida quando aplicável", () => {
    const a = aberturaFormal(meetingBase({ modalidade: "hibrida" }));
    expect(a).toContain("reunião híbrida");
  });
});

describe("ata template", () => {
  it("inclui título, participantes, pauta e fórmula de encerramento", () => {
    const ata = gerarAtaTemplate(meetingBase());
    expect(ata).toContain("ATA DE REUNIÃO");
    expect(ata).toContain("João da Silva, Presidente");
    expect(ata).toContain("Aprovação das contas");
    expect(ata).toContain("lavrou-se a presente ata");
  });
});
