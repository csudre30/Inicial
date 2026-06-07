import {
  AppConfig,
  Meeting,
  Participante,
  SpeakerMapping,
} from "./types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignora */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  config(): Promise<AppConfig> {
    return fetch(`${BASE}/config`).then((r) => handle(r));
  },

  listMeetings(): Promise<Meeting[]> {
    return fetch(`${BASE}/meetings`).then((r) => handle(r));
  },

  getMeeting(id: string): Promise<Meeting> {
    return fetch(`${BASE}/meetings/${id}`).then((r) => handle(r));
  },

  createMeeting(input: Partial<Meeting>): Promise<Meeting> {
    return fetch(`${BASE}/meetings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => handle(r));
  },

  updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
    return fetch(`${BASE}/meetings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => handle(r));
  },

  deleteMeeting(id: string): Promise<void> {
    return fetch(`${BASE}/meetings/${id}`, { method: "DELETE" }).then((r) =>
      handle(r)
    );
  },

  uploadAudio(id: string, file: Blob, filename: string): Promise<Meeting> {
    const fd = new FormData();
    fd.append("audio", file, filename);
    return fetch(`${BASE}/meetings/${id}/audio`, {
      method: "POST",
      body: fd,
    }).then((r) => handle(r));
  },

  transcribe(id: string): Promise<{ status: string }> {
    return fetch(`${BASE}/meetings/${id}/transcribe`, {
      method: "POST",
    }).then((r) => handle(r));
  },

  generateAta(id: string, speakerMapping?: SpeakerMapping): Promise<Meeting> {
    return fetch(`${BASE}/meetings/${id}/ata`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ speakerMapping }),
    }).then((r) => handle(r));
  },

  ataDownloadUrl(id: string): string {
    return `${BASE}/meetings/${id}/ata.txt`;
  },
};

export type { Participante };
