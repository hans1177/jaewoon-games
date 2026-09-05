export class JaewoonMultiplayerClient extends EventTarget {
  static DEFAULT_BASE_URL = 'https://jaewoon-multiplayer.anyanguy12.workers.dev';

  constructor(options = {}) {
    super();
    this.baseUrl = (options.baseUrl || JaewoonMultiplayerClient.DEFAULT_BASE_URL).replace(/\/$/, '');
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelayMs = Number(options.reconnectDelayMs || 1500);

    this.accessToken = '';
    this.refreshToken = '';
    this.currentUser = null;
    this.currentRoomId = '';
    this.currentMode = '';

    this.socket = null;
    this.manualDisconnect = false;
    this.reconnectTimer = null;
  }

  on(type, listener, options) {
    this.addEventListener(type, listener, options);
    return () => this.removeEventListener(type, listener, options);
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  async signup(email, password, nickname) {
    const result = await this.request('/auth/signup', {
      method: 'POST',
      body: { email, password, nickname },
      auth: false,
    });
    if (result.ok) this.applyAuthPayload(result.data);
    else this.emit('authentication_failed', result);
    return result;
  }

  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    if (!result.ok) {
      this.emit('authentication_failed', result);
      return result;
    }
    this.applyAuthPayload(result.data);
    if (this.accessToken) await this.loadMe();
    return result;
  }

  async refreshSession() {
    if (!this.refreshToken) {
      return { ok: false, status: 0, data: { error: 'missing_refresh_token' } };
    }
    const result = await this.request('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: this.refreshToken },
      auth: false,
    });
    if (result.ok) this.applyAuthPayload(result.data);
    return result;
  }

  async loadMe() {
    const result = await this.request('/auth/me', { auth: true });
    if (result.ok && result.data?.user) {
      this.currentUser = result.data.user;
      this.emit('authenticated', this.currentUser);
    }
    return result;
  }

  logout() {
    this.disconnectRoom();
    this.accessToken = '';
    this.refreshToken = '';
    this.currentUser = null;
    this.currentMode = '';
  }

  matchCoop(autoConnectRoom = true) {
    return this.quickMatch('coop', autoConnectRoom);
  }

  matchPvp(autoConnectRoom = true) {
    return this.quickMatch('pvp', autoConnectRoom);
  }

  async quickMatch(mode, autoConnectRoom = true) {
    const result = await this.request('/matchmake', {
      method: 'POST',
      body: { mode },
      auth: true,
    });
    if (result.ok) {
      this.currentMode = mode;
      this.emit('match_found', result.data);
      if (autoConnectRoom && result.data?.roomId) this.connectRoom(result.data.roomId);
    }
    return result;
  }

  async createFriendRoom(mode = 'coop', autoConnectRoom = true) {
    const result = await this.request('/friend/create', {
      method: 'POST',
      body: { mode },
      auth: true,
    });
    if (result.ok) {
      this.currentMode = mode;
      this.emit('friend_room_created', result.data);
      if (autoConnectRoom && result.data?.roomId) this.connectRoom(result.data.roomId);
    }
    return result;
  }

  async joinFriendRoom(inviteCode, autoConnectRoom = true) {
    const result = await this.request('/friend/join', {
      method: 'POST',
      body: { inviteCode: String(inviteCode || '').trim().toUpperCase() },
      auth: true,
    });
    if (result.ok) {
      if (result.data?.mode) this.currentMode = result.data.mode;
      this.emit('friend_room_joined', result.data);
      if (autoConnectRoom && result.data?.roomId) this.connectRoom(result.data.roomId);
    }
    return result;
  }

  connectRoom(roomId) {
    if (!this.accessToken || !roomId) return false;
    this.currentRoomId = String(roomId);
    this.manualDisconnect = false;
    this.clearReconnectTimer();
    this.openSocket();
    return true;
  }

  disconnectRoom() {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = null;
    this.currentRoomId = '';
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'leave' })); } catch {}
      socket.close(1000, 'client_leave');
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }

  isRoomConnected() {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  sendState(state) {
    return this.sendMessage({ type: 'state', state });
  }

  sendEvent(event = {}) {
    return this.sendMessage({ ...event, type: 'event' });
  }

  sendReady(extra = {}) {
    return this.sendMessage({ ...extra, type: 'ready' });
  }

  requestRematch() {
    return this.sendMessage({ type: 'rematch' });
  }

  sendMessage(payload) {
    if (!this.isRoomConnected()) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  async request(endpoint, options = {}) {
    const method = options.method || 'GET';
    const auth = options.auth === true;
    if (auth && !this.accessToken) {
      const missing = { ok: false, status: 401, data: { error: 'missing_access_token' } };
      this.emit('request_failed', { endpoint, ...missing });
      return missing;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${this.accessToken}`;

    let response;
    try {
      response = await fetch(this.baseUrl + endpoint, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(options.body || {}),
      });
    } catch (error) {
      const failed = { ok: false, status: 0, data: { error: 'network_error', message: String(error?.message || error) } };
      this.emit('request_failed', { endpoint, ...failed });
      return failed;
    }

    const text = await response.text();
    let data = {};
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { raw: text }; }
    }
    const result = { ok: response.ok, status: response.status, data };
    if (!response.ok) this.emit('request_failed', { endpoint, ...result });
    return result;
  }

  applyAuthPayload(data = {}) {
    if (data.access_token) this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    if (data.user) {
      this.currentUser = data.user;
      this.emit('authenticated', this.currentUser);
    }
  }

  openSocket() {
    if (!this.currentRoomId || !this.accessToken) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      try { this.socket.close(1000, 'reconnect'); } catch {}
    }

    const wsBase = this.baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    const url = `${wsBase}/room/${encodeURIComponent(this.currentRoomId)}?token=${encodeURIComponent(this.accessToken)}`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener('message', (event) => {
      if (socket !== this.socket) return;
      let message;
      try { message = JSON.parse(event.data); }
      catch { return; }
      this.handleSocketMessage(message);
    });

    socket.addEventListener('close', (event) => {
      if (socket !== this.socket) return;
      this.emit('websocket_disconnected', { code: event.code, reason: event.reason });
      if (!this.manualDisconnect) this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (socket !== this.socket) return;
      if (!this.manualDisconnect) this.scheduleReconnect();
    });
  }

  handleSocketMessage(message) {
    const type = String(message?.type || '');
    if (type === 'connected') {
      this.clearReconnectTimer();
      this.emit('websocket_connected', { roomId: message.roomId || this.currentRoomId, ...message });
    } else if (type === 'presence') {
      const player = {
        userId: message.userId || '',
        nickname: message.nickname || 'player',
        players: message.players || [],
      };
      if (message.action === 'join') this.emit('player_joined', player);
      if (message.action === 'leave') this.emit('player_left', player);
    } else if (type === 'rematch_ready') {
      this.emit('rematch_ready', message);
    }
    this.emit('message_received', message);
  }

  scheduleReconnect() {
    if (!this.autoReconnect || this.manualDisconnect || !this.currentRoomId || !this.accessToken) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualDisconnect && this.currentRoomId && this.accessToken) this.openSocket();
    }, this.reconnectDelayMs);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

if (typeof window !== 'undefined') {
  window.JaewoonMultiplayerClient = JaewoonMultiplayerClient;
}
