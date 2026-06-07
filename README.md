# Ata.gov — Atas oficiais a partir da fala

Aplicação web para **gravar reuniões presenciais ou híbridas**, **transcrever** com
**identificação de cada participante** (diarização) e **gerar a ata** seguindo a
**Redação Oficial da Administração Pública brasileira** (Manual de Redação da
Presidência da República).

## Recursos

- 🎙️ **Gravação no navegador** — microfone para reuniões presenciais; em reuniões
  **híbridas**, captura também o áudio do sistema/aba (participantes remotos) e
  mistura os dois canais.
- 📤 **Upload de gravações antigas** — envie arquivos de áudio já existentes
  (mp3, wav, m4a, ogg, webm…).
- 🗣️ **Transcrição com diarização** — cada fala é atribuída ao seu autor. Há um
  editor para confirmar/ajustar a identificação dos participantes antes da ata.
- 📜 **Geração da ata oficial** — texto formal com abertura por extenso,
  relação de participantes, ordem do dia, desenvolvimento com autoria preservada
  e fórmula de encerramento consagrada.
- 🎨 **Design moderno e sofisticado** — interface escura, responsiva, com a ata
  renderizada em estilo documento.

## Arquitetura

```
Inicial/
├── server/          API em Node + Express + TypeScript
│   ├── src/
│   │   ├── transcription/   provedores: AssemblyAI (real) e mock (offline)
│   │   ├── ata/             geração da ata (Claude + fallback por template)
│   │   ├── utils/           diarização (identificação de locutores)
│   │   ├── routes/          endpoints REST
│   │   └── __tests__/       testes (Vitest)
│   └── storage/     áudios enviados + índice das reuniões (JSON)
└── web/             SPA em React + Vite + TypeScript
```

A transcrição e a redação da ata são **plugáveis**:

| Função      | Padrão            | Real (configurável)                       |
| ----------- | ----------------- | ----------------------------------------- |
| Transcrição | `mock` (offline)  | **AssemblyAI** (`ASSEMBLYAI_API_KEY`)     |
| Ata         | template oficial  | **Claude** `claude-opus-4-8` (`ANTHROPIC_API_KEY`) |

Sem chaves, a aplicação **funciona integralmente** em modo demonstração.

## Como executar

Pré-requisitos: Node.js 20+.

```bash
# 1. Instalar dependências (servidor + web)
npm run install:all

# 2. (Opcional) configurar chaves de API
cp server/.env.example server/.env
#   edite server/.env e preencha ANTHROPIC_API_KEY e/ou ASSEMBLYAI_API_KEY

# 3. Build de produção (web + servidor)
npm run build

# 4. Iniciar (a API serve também o frontend compilado)
npm start
# abra http://localhost:4000
```

### Desenvolvimento

```bash
npm run dev:server   # API com hot-reload (porta 4000)
npm run dev:web      # Vite com proxy /api -> 4000 (porta 5173)
```

### Testes

```bash
npm test
```

## Configuração (`server/.env`)

| Variável                 | Descrição                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `PORT`                   | Porta da API (padrão `4000`).                                    |
| `ANTHROPIC_API_KEY`      | Chave da Claude para redigir a ata por IA.                       |
| `ANTHROPIC_MODEL`        | Modelo (padrão `claude-opus-4-8`).                               |
| `TRANSCRIPTION_PROVIDER` | `auto` \| `assemblyai` \| `mock`.                               |
| `ASSEMBLYAI_API_KEY`     | Chave da AssemblyAI (transcrição real com diarização).          |
| `TRANSCRIPTION_LANGUAGE` | Idioma das reuniões (padrão `pt`).                              |
| `MAX_UPLOAD_BYTES`       | Limite de upload em bytes (padrão 200 MB).                       |

## Fluxo de uso

1. **Nova reunião** — informe título, órgão, local, data, modalidade e os
   participantes.
2. **Áudio** — grave na hora ou envie uma gravação existente.
3. **Transcrever** — a aplicação gera a transcrição diarizada; revise a
   identificação de cada locutor.
4. **Gerar ata** — a ata oficial é produzida e pode ser baixada em `.txt`.

## Deploy (Render)

O projeto já inclui `Dockerfile` e `render.yaml` (Blueprint).

1. Faça o *push* deste repositório para o GitHub (já feito).
2. No [Render](https://render.com): **New +** → **Blueprint** → selecione este
   repositório. O Render lê o `render.yaml` e cria o serviço web automaticamente.
3. Em **Environment**, defina os segredos (opcionais) para o modo real:
   - `ANTHROPIC_API_KEY` — redação da ata por IA.
   - `ASSEMBLYAI_API_KEY` — transcrição real com diarização.
   - Sem eles, a aplicação roda em **modo demonstração**.
4. Clique em **Apply**. Ao final, o Render fornece a URL pública
   (ex.: `https://ata-gov.onrender.com`).

O Render injeta a variável `PORT` automaticamente (a aplicação a respeita) e usa
`/api/health` como *health check*.

> **Persistência:** no plano gratuito o disco é efêmero — áudios e atas são
> perdidos a cada novo deploy. Para mantê-los, descomente o bloco `disk:` no
> `render.yaml` (requer plano pago) montando um disco em `/app/server/storage`.

### Docker (qualquer ambiente)

```bash
docker build -t ata-gov .
docker run -p 4000:4000 \
  -e ANTHROPIC_API_KEY=... \
  -e ASSEMBLYAI_API_KEY=... \
  ata-gov
# http://localhost:4000
```

## Notas sobre privacidade

Áudios e transcrições ficam no servidor (`server/storage/`). Ao usar provedores
externos (AssemblyAI, Claude), o conteúdo é enviado a esses serviços conforme
suas políticas. Para uso 100% local/demonstração, mantenha o provedor `mock` e
não configure `ANTHROPIC_API_KEY`.
