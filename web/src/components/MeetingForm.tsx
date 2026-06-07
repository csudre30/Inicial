import { useState } from "react";
import { Meeting, Modalidade, Participante } from "../lib/types";
import { PlusIcon, TrashIcon } from "./Icons";

interface MeetingFormProps {
  onCreate: (input: Partial<Meeting>) => Promise<void>;
  onCancel: () => void;
}

export function MeetingForm({ onCreate, onCancel }: MeetingFormProps) {
  const [titulo, setTitulo] = useState("");
  const [orgao, setOrgao] = useState("");
  const [local, setLocal] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("presencial");
  const [data, setData] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [participantes, setParticipantes] = useState<Participante[]>([
    { nome: "", cargo: "", presenca: "presencial" },
  ]);
  const [pautaTexto, setPautaTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParticipante(i: number, patch: Partial<Participante>) {
    setParticipantes((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    );
  }

  async function submit() {
    if (!titulo.trim()) {
      setError("Informe o título da reunião.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        titulo,
        orgao: orgao || undefined,
        local: local || undefined,
        modalidade,
        dataReuniao: new Date(data).toISOString(),
        participantes: participantes
          .filter((p) => p.nome.trim())
          .map((p) => ({
            nome: p.nome.trim(),
            cargo: p.cargo?.trim() || undefined,
            presenca: p.presenca,
          })),
        pauta: pautaTexto
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar reunião.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>Nova reunião</h2>

      <div className="field">
        <label>Título *</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: 3ª Reunião Ordinária do Conselho Gestor"
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Órgão / Unidade</label>
          <input
            value={orgao}
            onChange={(e) => setOrgao(e.target.value)}
            placeholder="Ex.: Secretaria Municipal de Administração"
          />
        </div>
        <div className="field">
          <label>Local</label>
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Sala de reuniões, 2º andar"
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Data e hora</label>
          <input
            type="datetime-local"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Modalidade</label>
          <div className="segmented">
            <button
              type="button"
              className={modalidade === "presencial" ? "active" : ""}
              onClick={() => setModalidade("presencial")}
            >
              Presencial
            </button>
            <button
              type="button"
              className={modalidade === "hibrida" ? "active" : ""}
              onClick={() => setModalidade("hibrida")}
            >
              Híbrida
            </button>
          </div>
        </div>
      </div>

      <div className="field">
        <label>Participantes</label>
        <p className="hint">
          Identifique os participantes. A ordem ajuda a associar cada locutor
          detectado na transcrição ao seu nome.
        </p>
        {participantes.map((p, i) => (
          <div className="participant-row" key={i}>
            <input
              placeholder="Nome"
              value={p.nome}
              onChange={(e) => updateParticipante(i, { nome: e.target.value })}
            />
            <input
              placeholder="Cargo / função"
              value={p.cargo ?? ""}
              onChange={(e) => updateParticipante(i, { cargo: e.target.value })}
            />
            {modalidade === "hibrida" && (
              <select
                value={p.presenca}
                onChange={(e) =>
                  updateParticipante(i, {
                    presenca: e.target.value as "presencial" | "remoto",
                  })
                }
              >
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
              </select>
            )}
            <button
              type="button"
              className="icon-btn"
              aria-label="Remover participante"
              onClick={() =>
                setParticipantes((prev) => prev.filter((_, idx) => idx !== i))
              }
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setParticipantes((prev) => [
              ...prev,
              { nome: "", cargo: "", presenca: "presencial" },
            ])
          }
        >
          <PlusIcon size={16} /> Adicionar participante
        </button>
      </div>

      <div className="field">
        <label>Pauta (um item por linha)</label>
        <textarea
          rows={4}
          value={pautaTexto}
          onChange={(e) => setPautaTexto(e.target.value)}
          placeholder={"Aprovação da ata anterior\nPrestação de contas\nAssuntos gerais"}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        <button className="btn" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Criando…" : "Criar reunião"}
        </button>
      </div>
    </div>
  );
}
