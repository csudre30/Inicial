import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { AppConfig, Meeting, SpeakerMapping } from "../lib/types";
import { formatDateTime, formatMs, statusLabel } from "../lib/format";
import { Recorder } from "./Recorder";
import { SpeakerEditor } from "./SpeakerEditor";
import { BackIcon, DocIcon, MicIcon, TrashIcon, UploadIcon } from "./Icons";

interface MeetingDetailProps {
  meetingId: string;
  config: AppConfig | null;
  onBack: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}

type Source = "record" | "upload";

export function MeetingDetail({
  meetingId,
  config,
  onBack,
  onChanged,
  onDeleted,
}: MeetingDetailProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [source, setSource] = useState<Source>("record");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<SpeakerMapping>({});
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await api.getMeeting(meetingId);
      setMeeting(m);
      setMapping(m.speakerMapping ?? {});
      return m;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar reunião.");
      return null;
    }
  }, [meetingId]);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refresh]);

  // Polling enquanto transcrevendo
  useEffect(() => {
    if (meeting?.status === "transcrevendo") {
      if (!pollRef.current) {
        pollRef.current = window.setInterval(async () => {
          const m = await refresh();
          if (m && m.status !== "transcrevendo" && pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
            onChanged();
          }
        }, 3000);
      }
    } else if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [meeting?.status, refresh, onChanged]);

  async function handleAudio(blob: Blob, filename: string) {
    setBusy(true);
    setError(null);
    try {
      const m = await api.uploadAudio(meetingId, blob, filename);
      setMeeting(m);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar áudio.");
    } finally {
      setBusy(false);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleAudio(file, file.name);
    e.target.value = "";
  }

  async function startTranscription() {
    setBusy(true);
    setError(null);
    try {
      await api.transcribe(meetingId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao transcrever.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMapping() {
    setBusy(true);
    try {
      const m = await api.updateMeeting(meetingId, { speakerMapping: mapping });
      setMeeting(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function generateAta() {
    setBusy(true);
    setError(null);
    try {
      const m = await api.generateAta(meetingId, mapping);
      setMeeting(m);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar a ata.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Excluir esta reunião e seu áudio?")) return;
    await api.deleteMeeting(meetingId);
    onDeleted();
  }

  if (!meeting) {
    return (
      <div className="detail">
        <button className="btn btn-ghost" onClick={onBack}>
          <BackIcon /> Voltar
        </button>
        {error ? <p className="error-text">{error}</p> : <p>Carregando…</p>}
      </div>
    );
  }

  const speakerName = (raw: string): string => {
    const m = mapping[raw];
    if (m?.nome) return m.cargo ? `${m.nome} (${m.cargo})` : m.nome;
    return `Participante ${raw}`;
  };

  const hasAudio = Boolean(meeting.audioFile);
  const hasTranscription = Boolean(meeting.transcription);

  return (
    <div className="detail">
      <div className="detail-header">
        <button className="btn btn-ghost" onClick={onBack}>
          <BackIcon /> Voltar
        </button>
        <button className="icon-btn danger" onClick={remove} aria-label="Excluir">
          <TrashIcon />
        </button>
      </div>

      <div className="detail-title">
        <span className="badge modalidade">
          {meeting.modalidade === "hibrida" ? "Híbrida" : "Presencial"}
        </span>
        <h1>{meeting.titulo}</h1>
        {meeting.orgao && <p className="meeting-org">{meeting.orgao}</p>}
        <div className="detail-meta">
          <span>{formatDateTime(meeting.dataReuniao)}</span>
          {meeting.local && <span>· {meeting.local}</span>}
          <span className={`badge status-${meeting.status}`}>
            {statusLabel[meeting.status]}
          </span>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {meeting.erro && <p className="error-text">Erro: {meeting.erro}</p>}

      {/* ETAPA 1 — Áudio */}
      <section className="card step">
        <div className="step-head">
          <span className="step-num">1</span>
          <h2>Áudio da reunião</h2>
        </div>

        {hasAudio ? (
          <div className="audio-status">
            <MicIcon />
            <div>
              <strong>Áudio anexado</strong>
              <p className="hint">
                {meeting.audioOriginalName ?? meeting.audioFile}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="segmented small">
              <button
                className={source === "record" ? "active" : ""}
                onClick={() => setSource("record")}
              >
                <MicIcon size={16} /> Gravar agora
              </button>
              <button
                className={source === "upload" ? "active" : ""}
                onClick={() => setSource("upload")}
              >
                <UploadIcon size={16} /> Enviar gravação
              </button>
            </div>

            {source === "record" ? (
              <Recorder
                modalidadeHibrida={meeting.modalidade === "hibrida"}
                onReady={handleAudio}
                disabled={busy}
              />
            ) : (
              <div className="upload-box">
                <UploadIcon size={28} />
                <p>Envie um arquivo de áudio de uma gravação já realizada.</p>
                <p className="hint">Formatos: mp3, wav, m4a, ogg, webm…</p>
                <label className="btn btn-primary">
                  Selecionar arquivo
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    hidden
                    onChange={onFilePicked}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {hasAudio && (
          <div className="step-actions">
            <label className="btn btn-ghost">
              Trocar áudio
              <input
                type="file"
                accept="audio/*,video/*"
                hidden
                onChange={onFilePicked}
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={busy || meeting.status === "transcrevendo"}
              onClick={startTranscription}
            >
              {meeting.status === "transcrevendo"
                ? "Transcrevendo…"
                : hasTranscription
                ? "Transcrever novamente"
                : "Transcrever reunião"}
            </button>
          </div>
        )}
        {config && (
          <p className="hint provider-hint">
            Transcrição via <strong>{config.transcriptionProvider}</strong>
            {config.transcriptionProvider === "mock" &&
              " (modo demonstração — configure ASSEMBLYAI_API_KEY para transcrição real)"}
          </p>
        )}
      </section>

      {/* ETAPA 2 — Transcrição + locutores */}
      {hasTranscription && meeting.transcription && (
        <section className="card step">
          <div className="step-head">
            <span className="step-num">2</span>
            <h2>Transcrição e participantes</h2>
          </div>

          <SpeakerEditor
            meeting={meeting}
            mapping={mapping}
            onChange={setMapping}
          />
          <div className="step-actions">
            <button className="btn btn-ghost" onClick={saveMapping} disabled={busy}>
              Salvar identificação
            </button>
          </div>

          <div className="transcript">
            {meeting.transcription.segments.map((seg, i) => (
              <div className="transcript-line" key={i}>
                <span className="transcript-speaker">
                  {speakerName(seg.speaker)}
                </span>
                <span className="transcript-time">{formatMs(seg.start)}</span>
                <p>{seg.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ETAPA 3 — Ata */}
      {hasTranscription && (
        <section className="card step">
          <div className="step-head">
            <span className="step-num">3</span>
            <h2>Ata oficial</h2>
          </div>

          <div className="step-actions">
            <button
              className="btn btn-primary"
              onClick={generateAta}
              disabled={busy || meeting.status === "gerando_ata"}
            >
              <DocIcon size={16} />
              {meeting.status === "gerando_ata"
                ? "Gerando…"
                : meeting.ata
                ? "Gerar novamente"
                : "Gerar ata"}
            </button>
            {meeting.ata && (
              <a
                className="btn btn-ghost"
                href={api.ataDownloadUrl(meeting.id)}
                download
              >
                Baixar .txt
              </a>
            )}
          </div>

          {config && !config.anthropicConfigured && (
            <p className="hint">
              IA não configurada: a ata é gerada por um modelo determinístico de
              Redação Oficial. Configure ANTHROPIC_API_KEY para redação por IA.
            </p>
          )}

          {meeting.ata && (
            <>
              <div className="ata-doc">{meeting.ata}</div>
              {meeting.ataGeradaPor && (
                <p className="hint">Gerada por: {meeting.ataGeradaPor}</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
