# Ludo Friends Online

A browser-based multiplayer Ludo game using Node.js, Express and Socket.IO.

## Run on Windows
1. Install Node.js 18+ from https://nodejs.org/
2. Double-click `install-and-run.bat`.
3. The browser opens at `http://localhost:3000`.

## Online hosting
This project is ready for Render. The included `render.yaml` uses `npm install` and `npm start`, and the server listens on `0.0.0.0` and the platform-provided `PORT`.

## Game
- Create a room and share the 6-character room code.
- Up to 4 players.
- Real-time multiplayer with Socket.IO.
- 4 tokens per player.
- Need a 6 to leave home.
- Exact roll required to finish.
- Safe squares and captures.
- Rolling a 6 gives another turn.
- Winner is shown to everyone.

Note: The game server stores rooms in memory, so rooms disappear if the server restarts.
