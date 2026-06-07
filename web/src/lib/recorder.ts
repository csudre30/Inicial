import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

interface UseRecorderResult {
  state: RecorderState;
  seconds: number;
  error: string | null;
  blob: Blob | null;
  /** Captura também o áudio do sistema/aba (útil em reuniões híbridas). */
  start: (captureSystemAudio: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Hook de gravação de áudio. Em reuniões presenciais grava apenas o microfone.
 * Em reuniões híbridas, opcionalmente captura o áudio do sistema/aba
 * (getDisplayMedia) e o mistura com o microfone usando a Web Audio API, de modo
 * que tanto os presentes na sala quanto os participantes remotos sejam gravados.
 */
export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (captureSystemAudio: boolean) => {
      setError(null);
      setBlob(null);
      chunksRef.current = [];
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamsRef.current = [mic];

        let recordingStream: MediaStream = mic;

        if (captureSystemAudio) {
          // Pede compartilhamento de tela/aba COM áudio e mistura com o microfone.
          const display = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          streamsRef.current.push(display);

          const sysTracks = display.getAudioTracks();
          if (sysTracks.length > 0) {
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const dest = ctx.createMediaStreamDestination();
            ctx.createMediaStreamSource(mic).connect(dest);
            ctx
              .createMediaStreamSource(new MediaStream(sysTracks))
              .connect(dest);
            recordingStream = dest.stream;
          }
          // O vídeo é descartado — gravamos somente áudio.
        }

        const mime = pickMime();
        const recorder = new MediaRecorder(
          recordingStream,
          mime ? { mimeType: mime } : undefined
        );
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const type = recorder.mimeType || "audio/webm";
          setBlob(new Blob(chunksRef.current, { type }));
          cleanup();
          setState("stopped");
        };
        recorderRef.current = recorder;
        recorder.start(1000);
        setState("recording");
        setSeconds(0);
        timerRef.current = window.setInterval(
          () => setSeconds((s) => s + 1),
          1000
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível acessar o microfone."
        );
        cleanup();
        setState("idle");
      }
    },
    [cleanup]
  );

  const pause = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      if (timerRef.current) window.clearInterval(timerRef.current);
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      timerRef.current = window.setInterval(
        () => setSeconds((s) => s + 1),
        1000
      );
      setState("recording");
    }
  }, []);

  const stop = useCallback(() => {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setBlob(null);
    setSeconds(0);
    setState("idle");
    setError(null);
  }, [cleanup]);

  return { state, seconds, error, blob, start, pause, resume, stop, reset };
}

function pickMime(): string | null {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c)
    ) {
      return c;
    }
  }
  return null;
}
