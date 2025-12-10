# WatchTogether MVP (Conversation Summary)

This repo contains a minimal WatchTogether app built during this session.

## Stack
- Backend: Node.js, Express, Socket.io, CORS. In-memory room store (no persistence yet).
- Frontend: React + Vite, React Router, Socket.io client, React-YouTube.

## Ports & Linking
- Backend runs on `http://localhost:4000`.
- Frontend (Vite) runs on `http://localhost:5173` and calls `http://localhost:4000/api/rooms` for create/join, and connects to Socket.io at `http://localhost:4000`.

## Features Implemented
- Create/Join rooms via REST endpoints (`/api/rooms/create`, `/api/rooms/join`).
- Real-time sync (play/pause/seek/change video) via Socket.io.
- Live chat via Socket.io.
- Editable room title (pen icon inline edit).
- Playlist input (YouTube URL or ID) and selection.
- Design:
  - Marketing home page with hero, features grid, 3-step flow, CTA, footer in purple theme.
  - Room page with cinematic layout (big player, meta bar, sticky chat).
  - Logo integrated in nav/footer/room header; logo file served at `/logo.png` from `frontend/public`.

## Notes & Limitations
- Data is **not persisted**: rooms and chat live in memory; restarting the backend clears state.
- Socket join populates live viewers count from active chat users; no auth.

## Running Locally
```bash
# Backend
cd project/backend
npm install
npm run dev   # listens on 4000

# Frontend (in another terminal)
cd project/frontend
npm install
npm run dev   # serves on 5173
```

## Assets
- Place your logo at `project/frontend/public/logo.png` (currently copied from `lego site.png`).

