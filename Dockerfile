# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
RUN npm --prefix client ci
RUN npm --prefix server ci

# ---------- build-client ----------
FROM deps AS client-build
COPY client ./client
RUN npm --prefix client run build    # outputs to client/dist

# ---------- build-server ----------
FROM deps AS server-build
COPY server ./server
# if you have a build script to compile TS → JS:
# e.g. "build": "tsc -p tsconfig.json"
RUN npm --prefix server run build || true

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# copy server runtime files
COPY --from=server-build /app/server /app/server
# copy client build output into a static dir the server will serve
COPY --from=client-build /app/client/dist /app/server/public

# install ONLY server production deps
COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev

# non-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3001
CMD ["npm", "run", "start", "--prefix", "server"]
