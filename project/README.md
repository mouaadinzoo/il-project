# WatchTogether

WatchTogether est un projet React + Node.js + Socket.io avec synchronisation video temps reel, chat et maintenant une regie video server-authoritative.

## Stack reelle du depot

- Frontend: React + Vite
- Backend: Node.js + Express
- Temps reel: Socket.io
- Persistance actuelle du depot: SQLite via `better-sqlite3`

Note:

- La demande produit mentionnait MySQL, mais le code present dans ce depot utilise SQLite. L'implementation de la regie a donc ete integree de maniere incrementale sur cette base reelle.

## Fonctionnalites

- Creation et partage d'un salon
- Rejoindre un salon
- Chat temps reel
- Synchronisation video
- Regie video avec roles et controle centralise serveur

## Roles

- `director`: cree le salon et pilote la video partagee
- `participant`: suit l'etat synchronise et garde acces au chat
- `moderator`: role prevu cote backend pour une extension future

## Lancement local

Backend:

```powershell
cd "project/backend"
npm install
npm run dev
```

Frontend:

```powershell
cd "project/frontend"
npm install
npm run dev
```

Application:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Documentation regie

Voir:

- `project/docs/regie-video.md`
