import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import { AppConfig, Meeting } from "./lib/types";
import { MeetingList } from "./components/MeetingList";
import { MeetingForm } from "./components/MeetingForm";
import { MeetingDetail } from "./components/MeetingDetail";
import { PlusIcon } from "./components/Icons";

type View = "list" | "new" | "detail";

export function App() {
  const [view, setView] = useState<View>("list");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      const list = await api.listMeetings();
      setMeetings(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar reuniões.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cfg] = await Promise.all([api.config(), loadMeetings()]);
        setConfig(cfg);
      } catch {
        /* config opcional */
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMeetings]);

  async function handleCreate(input: Partial<Meeting>) {
    const m = await api.createMeeting(input);
    await loadMeetings();
    setSelectedId(m.id);
    setView("detail");
  }

  function openMeeting(id: string) {
    setSelectedId(id);
    setView("detail");
  }

  function backToList() {
    setSelectedId(null);
    setView("list");
    loadMeetings();
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" onClick={backToList} role="button">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">Ata.gov</div>
            <div className="brand-tagline">
              Atas oficiais a partir da fala
            </div>
          </div>
        </div>
        {config && (
          <div className="env-chip">
            <span className={`dot ${config.anthropicConfigured ? "on" : "off"}`} />
            {config.anthropicConfigured
              ? `IA: ${config.anthropicModel}`
              : "IA: modo template"}
            <span className="sep">·</span>
            transcrição: {config.transcriptionProvider}
          </div>
        )}
      </header>

      <main className="app-main">
        {view === "list" && (
          <>
            <div className="page-head">
              <div>
                <h1>Reuniões</h1>
                <p className="hint">
                  Grave reuniões presenciais ou híbridas, transcreva com
                  identificação dos participantes e gere a ata oficial.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setView("new")}
              >
                <PlusIcon size={16} /> Nova reunião
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
            {loading ? (
              <p>Carregando…</p>
            ) : (
              <MeetingList meetings={meetings} onOpen={openMeeting} />
            )}
          </>
        )}

        {view === "new" && (
          <MeetingForm
            onCreate={handleCreate}
            onCancel={() => setView("list")}
          />
        )}

        {view === "detail" && selectedId && (
          <MeetingDetail
            meetingId={selectedId}
            config={config}
            onBack={backToList}
            onChanged={loadMeetings}
            onDeleted={backToList}
          />
        )}
      </main>

      <footer className="app-footer">
        Em conformidade com o padrão de Redação Oficial da Administração Pública.
      </footer>
    </div>
  );
}
