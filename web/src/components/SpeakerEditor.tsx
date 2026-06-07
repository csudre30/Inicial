import { Meeting, SpeakerMapping } from "../lib/types";
import { formatMs } from "../lib/format";

interface SpeakerEditorProps {
  meeting: Meeting;
  mapping: SpeakerMapping;
  onChange: (mapping: SpeakerMapping) => void;
}

/**
 * Permite revisar a identificação de cada locutor detectado pela diarização,
 * associando-o a um participante (nome e cargo). É o ponto em que o usuário
 * garante o cuidado com a atribuição correta das falas.
 */
export function SpeakerEditor({ meeting, mapping, onChange }: SpeakerEditorProps) {
  const transcription = meeting.transcription;
  if (!transcription) return null;

  // locutores na ordem de aparição
  const speakers: string[] = [];
  const tempo: Record<string, number> = {};
  for (const seg of transcription.segments) {
    if (!speakers.includes(seg.speaker)) speakers.push(seg.speaker);
    tempo[seg.speaker] = (tempo[seg.speaker] ?? 0) + (seg.end - seg.start);
  }

  function update(raw: string, patch: { nome?: string; cargo?: string }) {
    const next: SpeakerMapping = {
      ...mapping,
      [raw]: { ...(mapping[raw] ?? { nome: "" }), ...patch },
    };
    onChange(next);
  }

  return (
    <div className="speaker-editor">
      <p className="hint">
        A transcrição detectou {speakers.length} locutor(es). Confirme quem é
        cada um — os nomes serão usados na ata.
      </p>
      {speakers.map((raw) => (
        <div className="speaker-row" key={raw}>
          <div className="speaker-tag">Locutor {raw}</div>
          <input
            placeholder="Nome do participante"
            list="participantes-list"
            value={mapping[raw]?.nome ?? ""}
            onChange={(e) => update(raw, { nome: e.target.value })}
          />
          <input
            placeholder="Cargo / função"
            value={mapping[raw]?.cargo ?? ""}
            onChange={(e) => update(raw, { cargo: e.target.value })}
          />
          <span className="speaker-time">{formatMs(tempo[raw] ?? 0)}</span>
        </div>
      ))}
      <datalist id="participantes-list">
        {meeting.participantes.map((p, i) => (
          <option key={i} value={p.nome} />
        ))}
      </datalist>
    </div>
  );
}
