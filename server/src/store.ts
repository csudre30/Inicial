import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { config } from "./config";
import { CreateMeetingInput, Meeting } from "./types";

/**
 * Persistência simples baseada em arquivo JSON. Suficiente para a aplicação
 * (sem dependência de banco). Todas as escritas são atômicas (write + rename).
 */
class MeetingStore {
  private meetings: Map<string, Meeting> = new Map();
  private loaded = false;

  private ensureDirs() {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  }

  private load() {
    if (this.loaded) return;
    this.ensureDirs();
    if (fs.existsSync(config.dbFile)) {
      try {
        const raw = fs.readFileSync(config.dbFile, "utf-8");
        const list: Meeting[] = JSON.parse(raw);
        for (const m of list) this.meetings.set(m.id, m);
      } catch {
        // arquivo corrompido: começa vazio sem derrubar a aplicação
      }
    }
    this.loaded = true;
  }

  private persist() {
    this.ensureDirs();
    const list = Array.from(this.meetings.values());
    const tmp = `${config.dbFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), "utf-8");
    fs.renameSync(tmp, config.dbFile);
  }

  list(): Meeting[] {
    this.load();
    return Array.from(this.meetings.values()).sort((a, b) =>
      b.criadaEm.localeCompare(a.criadaEm)
    );
  }

  get(id: string): Meeting | undefined {
    this.load();
    return this.meetings.get(id);
  }

  create(input: CreateMeetingInput): Meeting {
    this.load();
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: randomUUID(),
      titulo: input.titulo.trim() || "Reunião sem título",
      orgao: input.orgao?.trim() || undefined,
      local: input.local?.trim() || undefined,
      modalidade: input.modalidade ?? "presencial",
      dataReuniao: input.dataReuniao || now,
      participantes: input.participantes ?? [],
      pauta: input.pauta?.filter((p) => p.trim().length > 0),
      status: "criada",
      criadaEm: now,
      atualizadaEm: now,
    };
    this.meetings.set(meeting.id, meeting);
    this.persist();
    return meeting;
  }

  update(id: string, patch: Partial<Meeting>): Meeting | undefined {
    this.load();
    const current = this.meetings.get(id);
    if (!current) return undefined;
    const updated: Meeting = {
      ...current,
      ...patch,
      id: current.id,
      atualizadaEm: new Date().toISOString(),
    };
    this.meetings.set(id, updated);
    this.persist();
    return updated;
  }

  remove(id: string): boolean {
    this.load();
    const m = this.meetings.get(id);
    if (!m) return false;
    if (m.audioFile) {
      const p = path.join(config.uploadDir, m.audioFile);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignora */
        }
      }
    }
    this.meetings.delete(id);
    this.persist();
    return true;
  }
}

export const store = new MeetingStore();
