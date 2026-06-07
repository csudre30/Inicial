import { useState } from "react";
import { useRecorder } from "../lib/recorder";
import { formatDuration } from "../lib/format";
import { MicIcon } from "./Icons";

interface RecorderProps {
  modalidadeHibrida: boolean;
  onReady: (blob: Blob, filename: string) => void;
  disabled?: boolean;
}

export function Recorder({ modalidadeHibrida, onReady, disabled }: RecorderProps) {
  const rec = useRecorder();
  const [captureSystem, setCaptureSystem] = useState(modalidadeHibrida);

  const isRecording = rec.state === "recording";
  const isPaused = rec.state === "paused";

  return (
    <div className="recorder">
      <div className="recorder-visual">
        <div
          className={`pulse ${isRecording ? "active" : ""}`}
          aria-hidden="true"
        >
          <MicIcon size={34} />
        </div>
        <div className="recorder-time">{formatDuration(rec.seconds)}</div>
        <div className="recorder-state">
          {rec.state === "idle" && "Pronto para gravar"}
          {isRecording && "Gravando…"}
          {isPaused && "Pausado"}
          {rec.state === "stopped" && "Gravação concluída"}
        </div>
      </div>

      {modalidadeHibrida && rec.state === "idle" && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={captureSystem}
            onChange={(e) => setCaptureSystem(e.target.checked)}
          />
          <span>
            Capturar também o áudio do sistema/aba (participantes remotos)
          </span>
        </label>
      )}

      <div className="recorder-controls">
        {rec.state === "idle" && (
          <button
            className="btn btn-primary"
            disabled={disabled}
            onClick={() => rec.start(captureSystem)}
          >
            Iniciar gravação
          </button>
        )}
        {isRecording && (
          <>
            <button className="btn" onClick={rec.pause}>
              Pausar
            </button>
            <button className="btn btn-danger" onClick={rec.stop}>
              Encerrar
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button className="btn btn-primary" onClick={rec.resume}>
              Retomar
            </button>
            <button className="btn btn-danger" onClick={rec.stop}>
              Encerrar
            </button>
          </>
        )}
        {rec.state === "stopped" && rec.blob && (
          <>
            <audio
              className="audio-preview"
              controls
              src={URL.createObjectURL(rec.blob)}
            />
            <div className="recorder-controls">
              <button className="btn" onClick={rec.reset}>
                Descartar
              </button>
              <button
                className="btn btn-primary"
                disabled={disabled}
                onClick={() =>
                  rec.blob &&
                  onReady(rec.blob, `gravacao-${Date.now()}.webm`)
                }
              >
                Usar esta gravação
              </button>
            </div>
          </>
        )}
      </div>

      {rec.error && <p className="error-text">{rec.error}</p>}
    </div>
  );
}
