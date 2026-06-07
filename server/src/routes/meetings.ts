import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { config, resolveTranscriptionProvider, hasAnthropic } from "../config";
import { store } from "../store";
import { getTranscriptionProvider } from "../transcription";
import { gerarAta } from "../ata/generator";
import { listSpeakers } from "../utils/diarization";
import { CreateMeetingInput, SpeakerMapping } from "../types";

const router = Router();

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
});

/** Capacidades do ambiente (provedor de transcrição, IA configurada). */
router.get("/config", (_req, res) => {
  res.json({
    transcriptionProvider: resolveTranscriptionProvider(),
    anthropicConfigured: hasAnthropic(),
    anthropicModel: config.anthropic.model,
    maxUploadBytes: config.maxUploadBytes,
  });
});

router.get("/meetings", (_req, res) => {
  res.json(store.list());
});

router.post("/meetings", (req, res) => {
  const body = req.body as CreateMeetingInput;
  if (!body?.titulo || !body.titulo.trim()) {
    return res.status(400).json({ error: "O título da reunião é obrigatório." });
  }
  const meeting = store.create(body);
  res.status(201).json(meeting);
});

router.get("/meetings/:id", (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada." });
  res.json(meeting);
});

router.patch("/meetings/:id", (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada." });
  const allowed = [
    "titulo",
    "orgao",
    "local",
    "modalidade",
    "dataReuniao",
    "participantes",
    "pauta",
    "speakerMapping",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  const updated = store.update(req.params.id, patch);
  res.json(updated);
});

router.delete("/meetings/:id", (req, res) => {
  const ok = store.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "Reunião não encontrada." });
  res.status(204).end();
});

/** Recebe o áudio (gravação nova ou upload de gravação antiga). */
router.post("/meetings/:id/audio", upload.single("audio"), (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: "Reunião não encontrada." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo de áudio enviado." });
  }
  // remove áudio anterior, se houver
  if (meeting.audioFile) {
    const prev = path.join(config.uploadDir, meeting.audioFile);
    if (fs.existsSync(prev)) {
      try {
        fs.unlinkSync(prev);
      } catch {
        /* ignora */
      }
    }
  }
  const updated = store.update(req.params.id, {
    audioFile: req.file.filename,
    audioOriginalName: req.file.originalname,
    audioMime: req.file.mimetype,
    status: "criada",
    transcription: undefined,
    ata: undefined,
  });
  res.json(updated);
});

/** Inicia a transcrição com diarização (em segundo plano). */
router.post("/meetings/:id/transcribe", async (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada." });
  if (!meeting.audioFile) {
    return res.status(400).json({ error: "Envie um áudio antes de transcrever." });
  }
  if (meeting.status === "transcrevendo") {
    return res.status(409).json({ error: "Transcrição já em andamento." });
  }

  store.update(meeting.id, { status: "transcrevendo", erro: undefined });
  res.status(202).json({ status: "transcrevendo" });

  // Processamento assíncrono
  const filePath = path.join(config.uploadDir, meeting.audioFile);
  const provider = getTranscriptionProvider();
  provider
    .transcribe(filePath, {
      language: config.transcription.language,
      expectedSpeakers: meeting.participantes.length || undefined,
    })
    .then((result) => {
      // Pré-popula o mapeamento de locutores com os participantes informados,
      // na ordem em que falaram, para facilitar a identificação.
      const speakers = listSpeakers(result);
      const mapping: SpeakerMapping = { ...(meeting.speakerMapping ?? {}) };
      speakers.forEach((raw, idx) => {
        if (!mapping[raw] && meeting.participantes[idx]) {
          mapping[raw] = {
            nome: meeting.participantes[idx].nome,
            cargo: meeting.participantes[idx].cargo,
          };
        }
      });
      store.update(meeting.id, {
        transcription: result,
        speakerMapping: mapping,
        status: "transcrita",
      });
    })
    .catch((err) => {
      store.update(meeting.id, {
        status: "erro",
        erro: err instanceof Error ? err.message : String(err),
      });
    });
});

/** Gera a ata oficial a partir da transcrição. */
router.post("/meetings/:id/ata", async (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: "Reunião não encontrada." });
  if (!meeting.transcription) {
    return res
      .status(400)
      .json({ error: "Transcreva a reunião antes de gerar a ata." });
  }
  // permite atualizar o mapeamento de locutores junto da geração
  if (req.body?.speakerMapping) {
    store.update(meeting.id, { speakerMapping: req.body.speakerMapping });
  }

  store.update(meeting.id, { status: "gerando_ata", erro: undefined });
  const atual = store.get(meeting.id)!;
  try {
    const { texto, geradaPor } = await gerarAta(atual);
    const updated = store.update(meeting.id, {
      ata: texto,
      ataGeradaPor: geradaPor,
      status: "concluida",
    });
    res.json(updated);
  } catch (err) {
    const updated = store.update(meeting.id, {
      status: "erro",
      erro: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: updated?.erro });
  }
});

/** Download da ata em texto. */
router.get("/meetings/:id/ata.txt", (req, res) => {
  const meeting = store.get(req.params.id);
  if (!meeting?.ata) {
    return res.status(404).json({ error: "Ata não disponível." });
  }
  const slug = meeting.titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const nome = `ata-${slug || "reuniao"}.txt`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  res.send(meeting.ata);
});

export default router;
