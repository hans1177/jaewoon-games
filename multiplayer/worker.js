const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://jaewoon-games.pages.dev';
  if (origin === allowed || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return allowed;
}

function cors(request, env) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request, env),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function bearer(request) {
  const value = request.headers.get('Authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

async function supabase(request, env, path, init = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: 'auth_not_configured' }, 503, cors(request, env));
  }
  const headers = new Headers(init.headers || {});
  headers.set('apikey', env.SUPABASE_PUBLISHABLE_KEY);
  headers.set('content-type', 'application/json');
  const res = await fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  return new Response(text || '{}', {
    status: res.status,
    headers: { ...JSON_HEADERS, ...cors(request, env) },
  });
}

async function requireUser(request, env) {
  const token = bearer(request) || new URL(request.url).searchParams.get('token') || '';
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return {
    id: user.id,
    email: user.email || '',
    nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || 'player',
  };
}

function modeConfig(mode) {
  if (mode === 'coop') return { mode: 'coop', maxPlayers: 4 };
  if (mode === 'pvp') return { mode: 'pvp', maxPlayers: 2 };
  return null;
}

function normalizeGameId(value) {
  const gameId = String(value || 'default').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,49}$/.test(gameId) ? gameId : 'default';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });

    const url = new URL(request.url);
    const headers = cors(request, env);

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'jaewoon-multiplayer', version: 1 }, 200, headers);
    }

    if (url.pathname === '/auth/signup' && request.method === 'POST') {
      const body = await readJson(request);
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      const nickname = String(body.nickname || '').trim().slice(0, 20);
      if (!email || password.length < 8) return json({ error: 'invalid_signup', message: '이메일과 8자 이상 비밀번호가 필요합니다.' }, 400, headers);
      return supabase(request, env, '/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, data: { nickname } }),
      });
    }

    if (url.pathname === '/auth/login' && request.method === 'POST') {
      const body = await readJson(request);
      return supabase(request, env, '/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: body.email || '', password: body.password || '' }),
      });
    }

    if (url.pathname === '/auth/refresh' && request.method === 'POST') {
      const body = await readJson(request);
      return supabase(request, env, '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: body.refresh_token || '' }),
      });
    }

    if (url.pathname === '/auth/recover' && request.method === 'POST') {
      const body = await readJson(request);
      return supabase(request, env, '/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({ email: body.email || '' }),
      });
    }

    if (url.pathname === '/auth/me' && request.method === 'GET') {
      const user = await requireUser(request, env);
      return user ? json({ user }, 200, headers) : json({ error: 'unauthorized' }, 401, headers);
    }

    if (url.pathname === '/matchmake' && request.method === 'POST') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401, headers);
      const body = await readJson(request);
      const config = modeConfig(body.mode);
      if (!config) return json({ error: 'invalid_mode' }, 400, headers);
      const gameId = normalizeGameId(body.gameId);
      const id = env.MATCHMAKER.idFromName('global');
      return env.MATCHMAKER.get(id).fetch('https://matchmaker/matchmake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, ...config, gameId }),
      });
    }

    if (url.pathname === '/friend/create' && request.method === 'POST') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401, headers);
      const body = await readJson(request);
      const config = modeConfig(body.mode);
      if (!config) return json({ error: 'invalid_mode' }, 400, headers);
      const gameId = normalizeGameId(body.gameId);
      const id = env.MATCHMAKER.idFromName('global');
      return env.MATCHMAKER.get(id).fetch('https://matchmaker/friend/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, ...config, gameId }),
      });
    }

    if (url.pathname === '/friend/join' && request.method === 'POST') {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401, headers);
      const body = await readJson(request);
      const id = env.MATCHMAKER.idFromName('global');
      return env.MATCHMAKER.get(id).fetch('https://matchmaker/friend/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, inviteCode: String(body.inviteCode || '').trim().toUpperCase() }),
      });
    }

    if (url.pathname.startsWith('/room/')) {
      const user = await requireUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401, headers);
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket_required' }, 426, headers);
      const roomId = decodeURIComponent(url.pathname.slice('/room/'.length));
      if (!roomId) return json({ error: 'room_required' }, 400, headers);
      const id = env.ROOMS.idFromName(roomId);
      const forwarded = new Request('https://room/connect', request);
      const h = new Headers(forwarded.headers);
      h.set('x-user-id', user.id);
      h.set('x-user-name', user.nickname);
      h.set('x-room-id', roomId);
      return env.ROOMS.get(id).fetch(new Request(forwarded, { headers: h }));
    }

    return json({ error: 'not_found' }, 404, headers);
  },
};

export class Matchmaker {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const body = await readJson(request);
    if (url.pathname === '/matchmake') return this.matchmake(body);
    if (url.pathname === '/friend/create') return this.friendCreate(body);
    if (url.pathname === '/friend/join') return this.friendJoin(body);
    return json({ error: 'not_found' }, 404);
  }

  async matchmake({ user, mode, maxPlayers, gameId = 'default' }) {
    const now = Date.now();
    let rooms = (await this.ctx.storage.get('publicRooms')) || [];
    rooms = rooms.filter(r => now - r.createdAt < 5 * 60 * 1000 && r.players.length < r.maxPlayers);
    let room = rooms.find(r => r.mode === mode && r.gameId === gameId && !r.players.includes(user.id));
    if (!room) {
      room = { roomId: crypto.randomUUID(), mode, gameId, maxPlayers, players: [user.id], createdAt: now };
      rooms.push(room);
    } else {
      room.players.push(user.id);
    }
    const full = room.players.length >= room.maxPlayers;
    if (full) rooms = rooms.filter(r => r.roomId !== room.roomId);
    await this.ctx.storage.put('publicRooms', rooms);
    return json({ roomId: room.roomId, mode, gameId, players: room.players.length, maxPlayers, status: full ? 'ready' : 'waiting' });
  }

  async friendCreate({ user, mode, maxPlayers, gameId = 'default' }) {
    let invites = (await this.ctx.storage.get('invites')) || {};
    const now = Date.now();
    for (const [code, item] of Object.entries(invites)) {
      if (now - item.createdAt > 30 * 60 * 1000) delete invites[code];
    }
    let inviteCode = '';
    for (let i = 0; i < 8; i++) {
      const candidate = Math.random().toString(36).slice(2, 8).toUpperCase();
      if (!invites[candidate]) { inviteCode = candidate; break; }
    }
    if (!inviteCode) return json({ error: 'invite_unavailable' }, 503);
    const roomId = crypto.randomUUID();
    invites[inviteCode] = { roomId, mode, gameId, maxPlayers, players: [user.id], createdAt: now };
    await this.ctx.storage.put('invites', invites);
    return json({ roomId, inviteCode, mode, gameId, players: 1, maxPlayers, status: 'waiting' });
  }

  async friendJoin({ user, inviteCode }) {
    const invites = (await this.ctx.storage.get('invites')) || {};
    const item = invites[inviteCode];
    if (!item || Date.now() - item.createdAt > 30 * 60 * 1000) return json({ error: 'invite_not_found' }, 404);
    if (!item.players.includes(user.id)) item.players.push(user.id);
    if (item.players.length > item.maxPlayers) return json({ error: 'room_full' }, 409);
    const full = item.players.length >= item.maxPlayers;
    if (full) delete invites[inviteCode]; else invites[inviteCode] = item;
    await this.ctx.storage.put('invites', invites);
    return json({ roomId: item.roomId, mode: item.mode, gameId: item.gameId || 'default', players: item.players.length, maxPlayers: item.maxPlayers, status: full ? 'ready' : 'waiting' });
  }
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket_required' }, 426);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const userId = request.headers.get('x-user-id') || crypto.randomUUID();
    const nickname = request.headers.get('x-user-name') || 'player';
    const roomId = request.headers.get('x-room-id') || '';
    server.serializeAttachment({ userId, nickname, roomId });
    this.ctx.acceptWebSocket(server);
    this.broadcast({ type: 'presence', action: 'join', userId, nickname, players: this.players() });
    server.send(JSON.stringify({ type: 'connected', roomId, userId, players: this.players() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  players() {
    return this.ctx.getWebSockets().map(ws => {
      const a = ws.deserializeAttachment() || {};
      return { userId: a.userId || '', nickname: a.nickname || 'player' };
    });
  }

  broadcast(payload, except = null) {
    const data = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(data); } catch {}
    }
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > 16384) return;
    let data;
    try { data = JSON.parse(message); } catch { return; }
    const allowed = new Set(['state', 'event', 'ready', 'rematch', 'leave']);
    if (!allowed.has(data.type)) return;
    const attachment = ws.deserializeAttachment() || {};
    const payload = { ...data, userId: attachment.userId || '', nickname: attachment.nickname || 'player', serverTime: Date.now() };

    if (data.type === 'rematch') {
      const key = `rematch:${attachment.userId}`;
      await this.ctx.storage.put(key, true);
      const players = this.players();
      let votes = 0;
      for (const p of players) if (await this.ctx.storage.get(`rematch:${p.userId}`)) votes++;
      payload.votes = votes;
      payload.required = players.length;
      if (players.length > 1 && votes === players.length) {
        for (const p of players) await this.ctx.storage.delete(`rematch:${p.userId}`);
        this.broadcast({ type: 'rematch_ready', serverTime: Date.now() });
        return;
      }
    }

    this.broadcast(payload, null);
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment() || {};
    await this.ctx.storage.delete(`rematch:${a.userId || ''}`);
    this.broadcast({ type: 'presence', action: 'leave', userId: a.userId || '', nickname: a.nickname || 'player', players: this.players(), serverTime: Date.now() });
  }

  async webSocketError(ws) {
    const a = ws.deserializeAttachment() || {};
    await this.ctx.storage.delete(`rematch:${a.userId || ''}`);
  }
}
