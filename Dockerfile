# ---------- Estágio 1: build (web + servidor) ----------
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependências (com devDeps, necessárias para compilar)
COPY web/package.json web/package-lock.json ./web/
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix web ci && npm --prefix server ci

# Copia o código-fonte e compila
COPY web ./web
COPY server ./server
RUN npm --prefix web run build && npm --prefix server run build

# ---------- Estágio 2: runtime (somente produção) ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Apenas as dependências de produção do servidor
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev && npm cache clean --force

# Artefatos compilados (mantém o layout esperado: /app/server e /app/web)
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

# Pasta de armazenamento (áudios + índice). Em produção, monte um disco
# persistente neste caminho (ver render.yaml) para não perder os dados.
RUN mkdir -p /app/server/storage/uploads

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
