# Collaborative IDE

A real-time collaborative code editor with multi-file workspaces, live cursors, MongoDB persistence, Gemini AI assistance, and multi-language code execution via Piston.

## Features

- Real-time editing with **Yjs** + **Monaco Editor**
- Room-based workspaces with shareable URLs (`/room/your-room`)
- Multi-file project tree (create, delete, switch files)
- Live collaborator presence (colored cursors and names)
- **AI chat** and **Fix file** (Google Gemini)
- **Run code** for JS, TS, Python, Java, C/C++, Rust, Go, PHP, Ruby
- MongoDB Atlas persistence per room
- Light/dark theme, editor settings, network chaos simulation

## Architecture

```
client/   React + Vite + Monaco + Yjs
server/   Express + WebSocket + MongoDB + Gemini + Piston proxy
```

In production, Express serves the built client from `client/dist` on the same port as the API and WebSocket.

## Prerequisites

- **Node.js 18+**
- **MongoDB Atlas** cluster (or compatible MongoDB URI)
- **Gemini API key** (optional, for AI features)

## Local development

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.development
```

Edit `server/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | No | Enables AI chat and fix |
| `PORT` | No | Default `4050` |
| `CLIENT_ORIGIN` | No | Comma-separated CORS origins |

### 3. Start backend and frontend (two terminals)

**Terminal 1 — server:**
```bash
npm run dev:server
```

**Terminal 2 — client:**
```bash
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173), create a room, and open the same room URL in another tab to test collaboration.

## Production build (without Docker)

```bash
npm run build
npm run start
```

Open [http://localhost:4050](http://localhost:4050).

## Docker deployment

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB URI, Gemini key, and production URL in `CLIENT_ORIGIN`:

```env
MONGO_URI=mongodb+srv://...
GEMINI_API_KEY=your_key
CLIENT_ORIGIN=https://your-domain.com
PORT=4050
NODE_ENV=production
```

### 2. Build and run

```bash
docker compose up -d --build
```

App available at [http://localhost:4050](http://localhost:4050).

### 3. Stop

```bash
docker compose down
```

## Deploy to Render

1. Push this repo to GitHub.
2. Create a **Web Service** on [Render](https://render.com) using the included `render.yaml` or connect the repo manually.
3. Set environment variables:
   - `MONGO_URI`
   - `GEMINI_API_KEY`
   - `CLIENT_ORIGIN` → your Render URL (e.g. `https://collaborative-ide.onrender.com`)
4. Deploy. Render uses the `Dockerfile` automatically.

## Deploy to Railway / Fly.io / VPS

Use the same `Dockerfile`. Set these environment variables:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `NODE_ENV` | `production` |
| `PORT` | Platform-assigned port (often injected automatically) |
| `CLIENT_ORIGIN` | Your public HTTPS URL |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/ai/chat` | AI coding assistant |
| POST | `/api/ai/fix` | Auto-fix current code |
| POST | `/api/run` | Execute code (Piston) |
| WS | `/ws?room=<name>` | Real-time collaboration sync |

## Security notes

- Never commit `.env` files — they are gitignored.
- Rotate credentials if they were ever exposed.
- There is no authentication; anyone with a room URL can join. Add auth before public production use.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Server exits on start | Set a valid `MONGO_URI` in `server/.env` |
| AI button shows "(off)" | Set a real `GEMINI_API_KEY` in server env |
| WebSocket fails in dev | Ensure server runs on port 4050; check `VITE_WS_URL` in `client/.env.development` |
| CORS errors in production | Add your public URL to `CLIENT_ORIGIN` |
| Code run fails | Piston API may be temporarily unavailable; retry |

## License

ISC
