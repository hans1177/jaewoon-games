// 파일명: MultiplayerSession.cs
// 역할: 기존 Cloudflare 인증·Durable Object 방에 Unity WebGL/Android 클라이언트를 연결한다.
// 보안: 다른 클라이언트의 전투/골드/경험치는 로컬 저장값에 반영하지 않는다.
// 상태: 실제 2기기 동기화·서버 권한 보상은 검증 전까지 정식 멀티플레이로 인정하지 않는다.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
#if !UNITY_WEBGL || UNITY_EDITOR
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
#endif

namespace JaewoonGames.DaechungRpg
{
    public sealed class MultiplayerSession : MonoBehaviour
    {
        private const string Server = "https://jaewoon-multiplayer.anyanguy12.workers.dev";
        private const string GameId = "daechung-rpg";
        private const float StateIntervalSeconds = 1f;

        [Serializable] private sealed class LoginRequest { public string email; public string password; }
        [Serializable] private sealed class MatchRequest { public string mode = "coop"; public string gameId = GameId; }
        [Serializable] private sealed class JoinRequest { public string inviteCode; }
        [Serializable] private sealed class ServerUser { public string id; }
        [Serializable] private sealed class LoginResponse { public string access_token; public ServerUser user; }
        [Serializable] private sealed class RoomResponse { public string roomId; public string inviteCode; public string status; }
        [Serializable] private sealed class Participant { public string userId; public string nickname; }
        [Serializable] private sealed class GameSnapshot
        {
            public string regionId;
            public string enemyId;
            public int enemyHp;
            public int playerHp;
            public int sequence;
        }
        [Serializable] private sealed class StateMessage { public string type = "state"; public GameSnapshot state; }
        [Serializable] private sealed class ActionMessage
        {
            public string type = "event";
            public string action;
            public string enemyId;
            public string regionId;
            public int damage;
            public int enemyHp;
        }
        [Serializable] private sealed class Incoming
        {
            public string type;
            public string action;
            public string userId;
            public string nickname;
            public string roomId;
            public Participant[] players;
            public GameSnapshot state;
            public string enemyId;
            public string regionId;
            public int damage;
            public int enemyHp;
        }

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void DaechungWsOpen(string url, string objectName);
        [DllImport("__Internal")] private static extern void DaechungWsSend(string objectName, string message);
        [DllImport("__Internal")] private static extern void DaechungWsClose(string objectName);
#else
        private ClientWebSocket _socket;
        private CancellationTokenSource _socketCancellation;
        private readonly Queue<string> _incoming = new Queue<string>();
#endif

        private string _email = "";
        private string _password = "";
        private string _codeInput = "";
        private string _accessToken = "";
        private string _selfId = "";
        private string _roomId = "";
        private string _inviteCode = "";
        private string _status = "오프라인 · 로그인하면 협동 방에 접속할 수 있어";
        private string _peerName = "";
        private string _peerRegion = "";
        private string _peerAction = "";
        private int _peerEnemyHp;
        private int _participantCount;
        private bool _busy;
        private bool _connected;
        private bool _transportOpen;
        private bool _manualExit;
        private int _sequence;
        private float _nextStateAt;
        private float _nextReconnectAt;
        private float _peerLastSeen;
        private GameSnapshot _local = new GameSnapshot { regionId = "town", enemyId = "", enemyHp = 0 };

        public bool Connected => _connected;
        public int ParticipantCount => _participantCount;
        public int RemoteActionVersion { get; private set; }
        public string Status => _status;

        // 모바일: 기존 Unity OnGUI 스크롤 영역에서만 호출하며 가로폭을 소비하지 않는다.
        public void DrawControls(float scale)
        {
            GUILayout.Label("CO-OP TEST · 2 PLAYER SYNC (QA PENDING)");
            GUILayout.Label(_status);
            if (string.IsNullOrEmpty(_accessToken))
            {
                GUILayout.Label("EMAIL");
                _email = GUILayout.TextField(_email, 80);
                GUILayout.Label("PASSWORD");
                _password = GUILayout.PasswordField(_password, '*', 80);
                GUI.enabled = !_busy && _email.Contains("@") && _password.Length >= 8;
                if (GUILayout.Button(_busy ? "CONNECTING" : "LOGIN")) StartCoroutine(Login());
                GUI.enabled = true;
                return;
            }

            GUILayout.Label("ROOM " + (string.IsNullOrEmpty(_roomId) ? "NONE" : "ACTIVE")
                + "  PLAYERS " + _participantCount + "/4");
            if (!string.IsNullOrEmpty(_inviteCode))
                GUILayout.Label("INVITE CODE: " + _inviteCode);
            if (_connected)
            {
                GUILayout.Label(string.IsNullOrEmpty(_peerName) ? "Waiting for partner" :
                    "PARTNER " + _peerName + " · " + _peerRegion);
                if (!string.IsNullOrEmpty(_peerAction)) GUILayout.Label("PARTNER ACTION " + _peerAction);
                if (!string.IsNullOrEmpty(_peerRegion)) GUILayout.Label("PARTNER ENEMY HP " + _peerEnemyHp);
                if (_peerLastSeen > 0f && Time.unscaledTime - _peerLastSeen > 5f)
                    GUILayout.Label("PARTNER STATE DELAYED");
            }

            GUI.enabled = !_busy;
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("CO-OP MATCH")) StartCoroutine(OpenRoom("/matchmake", new MatchRequest()));
            if (GUILayout.Button("CREATE INVITE")) StartCoroutine(OpenRoom("/friend/create", new MatchRequest()));
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            _codeInput = GUILayout.TextField(_codeInput, 10);
            if (GUILayout.Button("JOIN CODE")) StartCoroutine(OpenRoom("/friend/join",
                new JoinRequest { inviteCode = _codeInput.Trim().ToUpperInvariant() }));
            GUILayout.EndHorizontal();
            if (GUILayout.Button("LEAVE CO-OP")) Leave();
            GUI.enabled = true;
        }

        public void ObserveLocalState(string regionId, string enemyId, int enemyHp, int playerHp)
        {
            _local.regionId = regionId ?? "town";
            _local.enemyId = enemyId ?? "";
            _local.enemyHp = Mathf.Max(0, enemyHp);
            _local.playerHp = Mathf.Max(0, playerHp);
        }

        public void ObserveAttack(string regionId, string enemyId, int damage, int enemyHp)
        {
            if (!_connected) return;
            Send(JsonUtility.ToJson(new ActionMessage
            {
                action = "attack", regionId = regionId, enemyId = enemyId,
                damage = Mathf.Max(0, damage), enemyHp = Mathf.Max(0, enemyHp)
            }));
            SendState();
        }

        public void ObserveDefeat(string regionId, string enemyId)
        {
            if (!_connected) return;
            Send(JsonUtility.ToJson(new ActionMessage
            {
                action = "enemy_defeated", regionId = regionId, enemyId = enemyId
            }));
        }

        private IEnumerator Login()
        {
            _busy = true;
            _status = "인증 중...";
            var response = UnityWebRequest.Post(Server + "/auth/login",
                JsonUtility.ToJson(new LoginRequest { email = _email.Trim(), password = _password }),
                "application/json");
            yield return response.SendWebRequest();
            if (response.result != UnityWebRequest.Result.Success || response.responseCode >= 400)
            {
                _status = "로그인 실패 · 계정과 네트워크를 확인해";
                response.Dispose();
                _busy = false;
                yield break;
            }
            try
            {
                var data = JsonUtility.FromJson<LoginResponse>(response.downloadHandler.text);
                _accessToken = data != null ? data.access_token : "";
                _selfId = data != null && data.user != null ? data.user.id : "";
            }
            catch (Exception) { _accessToken = ""; }
            response.Dispose();
            _password = ""; // 비밀번호는 영구 저장하거나 로그에 기록하지 않는다.
            _status = string.IsNullOrEmpty(_accessToken) ? "인증 응답 오류" : "로그인 성공 · 협동 방을 골라";
            _busy = false;
        }

        private IEnumerator OpenRoom(string endpoint, object body)
        {
            if (string.IsNullOrEmpty(_accessToken) || _busy) yield break;
            _busy = true;
            _status = "방 연결 요청 중...";
            var request = UnityWebRequest.Post(Server + endpoint, JsonUtility.ToJson(body), "application/json");
            request.SetRequestHeader("Authorization", "Bearer " + _accessToken);
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success || request.responseCode >= 400)
            {
                _status = "방 연결 실패 · 초대 코드/서버 상태 확인";
                request.Dispose();
                _busy = false;
                yield break;
            }
            RoomResponse result = null;
            try { result = JsonUtility.FromJson<RoomResponse>(request.downloadHandler.text); }
            catch (Exception) { }
            request.Dispose();
            _busy = false;
            if (result == null || string.IsNullOrEmpty(result.roomId))
            {
                _status = "방 정보가 올바르지 않아";
                yield break;
            }
            LeaveSocket();
            _roomId = result.roomId;
            _inviteCode = result.inviteCode ?? "";
            _manualExit = false;
            _status = "실시간 방 연결 중...";
            Connect();
        }

        private void Connect()
        {
            if (_manualExit || string.IsNullOrEmpty(_roomId) || string.IsNullOrEmpty(_accessToken)) return;
            _nextReconnectAt = Time.unscaledTime + 3f;
            var url = Server.Replace("https:", "wss:") + "/room/" + Uri.EscapeDataString(_roomId)
                + "?token=" + Uri.EscapeDataString(_accessToken);
#if UNITY_WEBGL && !UNITY_EDITOR
            DaechungWsOpen(url, gameObject.name);
#else
            _ = ConnectNative(url);
#endif
        }

        private void Update()
        {
#if !UNITY_WEBGL || UNITY_EDITOR
            while (true)
            {
                string raw;
                lock (_incoming)
                {
                    if (_incoming.Count == 0) break;
                    raw = _incoming.Dequeue();
                }
                OnMultiplayerSocket(raw);
            }
#endif
            if (_connected && Time.unscaledTime >= _nextStateAt) SendState();
            if (!_manualExit && !_connected && !_transportOpen &&
                !string.IsNullOrEmpty(_roomId) && Time.unscaledTime >= _nextReconnectAt)
            {
                _status = "연결 끊김 · 재접속 중...";
                Connect();
            }
        }

        // WebGL .jslib / Android 소켓 수신. 이벤트는 Unity 메인 스레드에서만 처리한다.
        public void OnMultiplayerSocket(string raw)
        {
            if (string.IsNullOrEmpty(raw) || raw.Length > 16384) return;
            Incoming message;
            try { message = JsonUtility.FromJson<Incoming>(raw); }
            catch (Exception) { return; }
            if (message == null) return;
            switch (message.type)
            {
                case "transport_open":
                    _transportOpen = true;
                    _status = "소켓 연결됨 · 서버 참가 응답 확인 중";
                    break;
                case "transport_closed":
                    _transportOpen = false;
                    _connected = false;
                    _participantCount = 0;
                    _peerName = "";
                    _nextReconnectAt = Time.unscaledTime + 3f;
                    if (!_manualExit) _status = "네트워크 연결 끊김 · 복구 예정";
                    break;
                case "connected":
                    _transportOpen = true;
                    _connected = true;
                    _selfId = message.userId ?? _selfId;
                    UpdateParticipants(message.players);
                    _status = "방 연결 성공 · 상대 클라이언트 대기/동기화";
                    SendState();
                    break;
                case "presence":
                    UpdateParticipants(message.players);
                    break;
                case "state":
                    if (message.userId == _selfId || message.state == null) break;
                    _peerRegion = message.state.regionId ?? "";
                    _peerEnemyHp = message.state.enemyHp;
                    _peerLastSeen = Time.unscaledTime;
                    break;
                case "event":
                    if (message.userId == _selfId) break;
                    if (message.action == "attack" || message.action == "enemy_defeated")
                    {
                        _peerAction = (message.action ?? "") + " / " + (message.enemyId ?? "")
                            + " / enemy HP " + message.enemyHp;
                        _peerLastSeen = Time.unscaledTime;
                        RemoteActionVersion++;
                    }
                    // 원격 이벤트는 표시 전용이다. 임의 보상·전투 손실 조작은 금지한다.
                    break;
            }
        }

        private void UpdateParticipants(Participant[] players)
        {
            _participantCount = players != null ? players.Length : 0;
            _peerName = "";
            if (players == null) return;
            foreach (var p in players)
            {
                if (p != null && !string.IsNullOrEmpty(p.userId) && p.userId != _selfId)
                {
                    _peerName = p.nickname ?? "player";
                    break;
                }
            }
        }

        private void SendState()
        {
            if (!_connected) return;
            _local.sequence = ++_sequence;
            Send(JsonUtility.ToJson(new StateMessage { state = _local }));
            _nextStateAt = Time.unscaledTime + StateIntervalSeconds;
        }

        private void Send(string data)
        {
            if (!_transportOpen || string.IsNullOrEmpty(data)) return;
#if UNITY_WEBGL && !UNITY_EDITOR
            DaechungWsSend(gameObject.name, data);
#else
            _ = SendNative(data);
#endif
        }

        private void Leave()
        {
            _manualExit = true;
            LeaveSocket();
            _roomId = "";
            _inviteCode = "";
            _status = "로그인 유지 · 방에서 나왔어";
            _participantCount = 0;
            _peerName = "";
        }

        private void LeaveSocket()
        {
            _manualExit = true;
            _connected = false;
            _transportOpen = false;
#if UNITY_WEBGL && !UNITY_EDITOR
            DaechungWsClose(gameObject.name);
#else
            _socketCancellation?.Cancel();
            try { _socket?.Abort(); } catch (Exception) { }
#endif
        }

#if !UNITY_WEBGL || UNITY_EDITOR
        private void QueueIncoming(string data)
        {
            lock (_incoming) { _incoming.Enqueue(data); }
        }

        private async Task ConnectNative(string url)
        {
            _socketCancellation?.Cancel();
            var cancel = new CancellationTokenSource();
            _socketCancellation = cancel;
            var socket = new ClientWebSocket();
            _socket = socket;
            try
            {
                await socket.ConnectAsync(new Uri(url), cancel.Token);
                QueueIncoming("{\"type\":\"transport_open\"}");
                var chunk = new byte[8192];
                using (var stream = new System.IO.MemoryStream())
                {
                    while (socket.State == WebSocketState.Open && !cancel.IsCancellationRequested)
                    {
                        var result = await socket.ReceiveAsync(new ArraySegment<byte>(chunk), cancel.Token);
                        if (result.MessageType == WebSocketMessageType.Close) break;
                        if (result.MessageType != WebSocketMessageType.Text) continue;
                        stream.Write(chunk, 0, result.Count);
                        if (stream.Length > 16384) break;
                        if (!result.EndOfMessage) continue;
                        QueueIncoming(Encoding.UTF8.GetString(stream.ToArray()));
                        stream.SetLength(0);
                    }
                }
            }
            catch (Exception) { /* 네트워크 오류는 재접속 상태에서 복구 */ }
            finally
            {
                if (_socket == socket)
                {
                    _socket = null;
                    QueueIncoming("{\"type\":\"transport_closed\"}");
                }
                socket.Dispose();
            }
        }

        private async Task SendNative(string data)
        {
            var socket = _socket;
            if (socket == null || socket.State != WebSocketState.Open) return;
            try
            {
                var bytes = Encoding.UTF8.GetBytes(data);
                await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text,
                    true, _socketCancellation != null ? _socketCancellation.Token : CancellationToken.None);
            }
            catch (Exception) { }
        }
#endif
        private void OnDestroy() { LeaveSocket(); }
    }
}
