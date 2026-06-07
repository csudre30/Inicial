import { MeetingStatus } from "./types";

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMs(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const statusLabel: Record<MeetingStatus, string> = {
  criada: "Criada",
  transcrevendo: "Transcrevendo…",
  transcrita: "Transcrita",
  gerando_ata: "Gerando ata…",
  concluida: "Concluída",
  erro: "Erro",
};
