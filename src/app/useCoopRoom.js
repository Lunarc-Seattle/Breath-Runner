/**
 * React hook for the real-time co-op WebSocket room.
 *
 * WebSocket is only available when running the Express server (npm start).
 * On GitHub Pages the hook reports status='unavailable' immediately so the
 * UI can show a clear offline message instead of hanging.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

function wsUrl() {
  if (typeof window === 'undefined') return null;
  // GitHub Pages / any static host: no WebSocket server.
  if (window.location.hostname.includes('github.io')) return null;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/coop`;
}

/**
 * @typedef {{ id: string, name: string }} CoopPlayer
 *
 * @returns {{
 *   status: 'idle'|'connecting'|'connected'|'disconnected'|'error'|'unavailable',
 *   roomId: string|null,
 *   playerId: string|null,
 *   players: CoopPlayer[],
 *   partnerBreath: { holding: boolean, lungPct: number },
 *   errorMsg: string,
 *   connect: (roomId: string|null, name: string) => void,
 *   sendBreath: (holding: boolean, lungPct: number) => void,
 *   disconnect: () => void,
 * }}
 */
export function useCoopRoom() {
  const [status, setStatus] = useState(() => (wsUrl() ? 'idle' : 'unavailable'));
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [partnerBreath, setPartnerBreath] = useState({ holding: false, lungPct: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const wsRef = useRef(null);
  const myIdRef = useRef(null);

  const connect = useCallback((joinRoomId, name) => {
    const url = wsUrl();
    if (!url) {
      setStatus('unavailable');
      setErrorMsg('Co-op requires the local server (npm start). Not available on GitHub Pages.');
      return;
    }

    wsRef.current?.close();
    setStatus('connecting');
    setErrorMsg('');

    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId: joinRoomId || undefined, name: name || 'Player' }));
    };

    ws.onmessage = ({ data }) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }

      if (msg.type === 'joined') {
        setPlayerId(msg.playerId);
        myIdRef.current = msg.playerId;
        setRoomId(msg.roomId);
        setPlayers(msg.players);
        setStatus('connected');
      }
      if (msg.type === 'roomUpdate') {
        setRoomId(msg.roomId);
        setPlayers(msg.players);
      }
      if (msg.type === 'breathUpdate' && msg.playerId !== myIdRef.current) {
        setPartnerBreath({ holding: Boolean(msg.holding), lungPct: Number(msg.lungPct) || 0 });
      }
      if (msg.type === 'playerLeft') {
        setPlayers(msg.players);
        setPartnerBreath({ holding: false, lungPct: 0 });
      }
      if (msg.type === 'error') {
        setErrorMsg(msg.message);
        setStatus('error');
      }
    };

    ws.onclose = () => {
      setStatus(prev => (prev === 'connected' ? 'disconnected' : prev));
    };

    ws.onerror = () => {
      setStatus('error');
      setErrorMsg('WebSocket connection failed. Is the server running? (npm start)');
    };

    wsRef.current = ws;
  }, []);

  const sendBreath = useCallback((holding, lungPct) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'breath', holding, lungPct }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave' }));
    wsRef.current?.close();
    setStatus('idle');
    setRoomId(null);
    setPlayerId(null);
    setPlayers([]);
    setPartnerBreath({ holding: false, lungPct: 0 });
  }, []);

  // Clean up on unmount.
  useEffect(() => () => wsRef.current?.close(), []);

  return { status, roomId, playerId, players, partnerBreath, errorMsg, connect, sendBreath, disconnect };
}
