# Regie Video

## Objectif

Cette evolution transforme le MVP WatchTogether en salon avec controle centralise cote serveur.

- Le createur du salon devient `director`.
- Les autres rejoignent en `participant`.
- Le `director` peut attribuer les roles connectes depuis l'interface du salon.
- Le role `moderator` controle la lecture partagee (`play`, `pause`, `restart`, `seek`).
- Le role `video_manager` peut changer la video On-Air.
- Le `participant` garde le chat mais ne pilote pas la video globale.

## Source de verite

L'etat du salon est centralise dans le backend et diffuse par Socket.io.

Etat principal:

- `roomId`
- `currentVideoId`
- `playbackStatus`
- `currentTime`
- `updatedAt`
- `controllerRole`
- `directorUserId`
- `directorName`
- `playlist`
- `participants`
- `log`

Le client ne decide pas l'etat global. Il envoie une commande, le serveur la valide, met a jour l'etat puis diffuse le snapshot.

## Evenements Socket.io

Client vers serveur:

- `join_room`
- `play_video`
- `pause_video`
- `seek_video`
- `select_video`
- `assign_role`
- `chat_message`

Serveur vers client:

- `role_assigned`
- `room_state`
- `state_changed`
- `permission_denied`
- `chat_history`
- `chat_message`
- `room_error`

Compatibilite legacy:

- `video_action` est encore accepte cote backend et mappe vers les nouvelles commandes.

## Permissions

La validation est faite cote serveur dans `src/utils/roomPermissions.js`.

- `director` : attribue les roles, controle la lecture et change la video partagee
- `moderator` : lecture autorisee, changement de video interdit
- `video_manager` : changement de video autorise, lecture/pause/seek interdits
- `participant` : chat autorise, video globale interdite

Si un utilisateur non autorise envoie une commande globale, le serveur repond avec `permission_denied`.

## Re-sync

Le backend envoie un `room_state` periodique toutes les 5 secondes pour limiter la desynchronisation.

Le frontend:

- applique le snapshot serveur
- corrige les ecarts de lecture si necessaire
- n'autorise pas les controles globaux pour les participants

## Fichiers principaux

Backend:

- `project/backend/src/utils/roomPermissions.js`
- `project/backend/src/utils/roomsStore.js`
- `project/backend/src/sockets/index.js`
- `project/backend/src/sockets/videoSync.js`
- `project/backend/src/sockets/chat.js`

Frontend:

- `project/frontend/src/hooks/useSocket.js`
- `project/frontend/src/pages/Room.jsx`
- `project/frontend/src/components/VideoPlayer.jsx`
- `project/frontend/src/components/Playlist.jsx`

## Lancement

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
