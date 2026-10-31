/**
 * Real-time co-op WebSocket server for Breath Runner.
 *
 * Protocol (client → server):
 *   { type: 'join',   roomId?: string, name: string }
 *   { type: 'breath', holding: boolean, lungPct: number }
 *   { type: 'leave' }
 *
 * Protocol (server → client):
 *   { type: 'joined',       playerId, roomId, players, full }
 *   { type: 'roomUpdate',   roomId, players, full }
 *   { type: 'breathUpdate', playerId, holding, lungPct }
 *   { type: 'playerLeft',   playerId, roomId, players, full }
 *   { type: 'error',        code, message }
 *
 * Rooms are ephemeral (in-memory only). Max 2 players per room.
 * Room IDs are 4-digit numbers; players generate one if they don't supply one.
 */
import { WebSocketServer } from 'ws';
import { randomInt } from 'node:crypto';

const MAX_PLAYERS = 2;

/** roomId → { players: Map<playerId, { ws, name, holding, lungPct }> } */
const rooms = new Map();

function genRoomId() {
  // Keep trying until we find an unused ID (very unlikely to need more than one try).
  let id;
  do {
    id = String(randomInt(1000, 10000));
  } while (rooms.has(id));
  return id;
}

function genPlayerId() {
  return Math.random().toString(36).slice(2, 10);
}

function roomSummary(room, roomId) {
  return {
    roomId,
    players: [...room.players.entries()].map(([id, p]) => ({ id, name: p.name })),
    full: room.players.size >= MAX_PLAYERS
  };
}

function broadcastToRoom(room, msg, excludeId = null) {
  const payload = JSON.stringify(msg);
  for (const [id, player] of room.players) {
    if (id !== excludeId && player.ws.readyState === 1 /* OPEN */) {
      player.ws.send(payload);
    }
  }
}

/**
 * Attaches the WebSocket server to an existing http.Server at path /ws/coop.
 * @param {import('http').Server} httpServer
 * @param {{ log?: { info: Function, warn: Function } }} opts
 */
export function createCoopServer(httpServer, { log = console } = {}) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/coop' });

  wss.on('connection', ws => {
    let currentRoomId = null;
    let currentPlayerId = null;

    const send = msg => {
      if (ws.readyState === 1) ws.send(JSON.stringify(msg));
    };

    function leaveRoom() {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentPlayerId);
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
          log.info({ roomId: currentRoomId }, 'coop: room closed (empty)');
        } else {
          broadcastToRoom(room, {
            type: 'playerLeft',
            playerId: currentPlayerId,
            ...roomSummary(room, currentRoomId)
          });
        }
      }
      log.info({ roomId: currentRoomId, playerId: currentPlayerId }, 'coop: player left');
      currentRoomId = null;
      currentPlayerId = null;
    }

    ws.on('message', rawData => {
      let msg;
      try {
        msg = JSON.parse(rawData);
      } catch {
        return;
      }

      if (msg.type === 'join') {
        if (currentRoomId) leaveRoom();

        const roomId = msg.roomId ? String(msg.roomId).slice(0, 8) : genRoomId();
        let room = rooms.get(roomId);
        if (!room) {
          room = { players: new Map() };
          rooms.set(roomId, room);
        }

        if (room.players.size >= MAX_PLAYERS) {
          send({ type: 'error', code: 'ROOM_FULL', message: 'Room is full — maximum 2 players per room.' });
          return;
        }

        currentPlayerId = genPlayerId();
        currentRoomId = roomId;
        const name = String(msg.name || 'Player').slice(0, 32);
        room.players.set(currentPlayerId, { ws, name, holding: false, lungPct: 1 });

        send({ type: 'joined', playerId: currentPlayerId, ...roomSummary(room, roomId) });
        broadcastToRoom(room, { type: 'roomUpdate', ...roomSummary(room, roomId) }, currentPlayerId);

        log.info({ roomId, playerId: currentPlayerId, name, size: room.players.size }, 'coop: player joined');
        return;
      }

      if (msg.type === 'breath' && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(currentPlayerId);
        if (!player) return;
        player.holding = Boolean(msg.holding);
        player.lungPct = Math.max(0, Math.min(1, Number(msg.lungPct) || 0));
        broadcastToRoom(
          room,
          { type: 'breathUpdate', playerId: currentPlayerId, holding: player.holding, lungPct: player.lungPct },
          currentPlayerId
        );
        return;
      }

      if (msg.type === 'leave') {
        leaveRoom();
      }
    });

    ws.on('close', leaveRoom);
    ws.on('error', leaveRoom);
  });

  log.info({ path: '/ws/coop', maxPlayers: MAX_PLAYERS }, 'coop: WebSocket server listening');
  return wss;
}
