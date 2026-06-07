import { Meeting } from "../lib/types";
import { formatDateTime, statusLabel } from "../lib/format";
import { UsersIcon } from "./Icons";

interface MeetingListProps {
  meetings: Meeting[];
  onOpen: (id: string) => void;
}

export function MeetingList({ meetings, onOpen }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhuma reunião ainda.</p>
        <p className="hint">
          Crie uma reunião para gravar ou enviar uma gravação existente.
        </p>
      </div>
    );
  }

  return (
    <div className="meeting-grid">
      {meetings.map((m) => (
        <button key={m.id} className="meeting-card" onClick={() => onOpen(m.id)}>
          <div className="meeting-card-top">
            <span className={`badge status-${m.status}`}>
              {statusLabel[m.status]}
            </span>
            <span className="badge modalidade">
              {m.modalidade === "hibrida" ? "Híbrida" : "Presencial"}
            </span>
          </div>
          <h3>{m.titulo}</h3>
          {m.orgao && <p className="meeting-org">{m.orgao}</p>}
          <div className="meeting-card-meta">
            <span>{formatDateTime(m.dataReuniao)}</span>
            <span className="meeting-participants">
              <UsersIcon size={14} /> {m.participantes.length}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
