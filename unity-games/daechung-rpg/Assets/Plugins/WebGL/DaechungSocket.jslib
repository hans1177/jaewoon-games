// 파일명: DaechungSocket.jslib
// 역할: 동일한 Unity 플레이 화면에서 기존 인증형 Cloudflare 방 WebSocket 접속.
mergeInto(LibraryManager.library, {
  DaechungWsOpen: function(urlPointer, objectPointer) {
    var url = UTF8ToString(urlPointer);
    var objectName = UTF8ToString(objectPointer);
    if (!Module.daechungSockets) Module.daechungSockets = {};
    var sockets = Module.daechungSockets;
    var old = sockets[objectName];
    if (old) { delete sockets[objectName]; try { old.close(); } catch (_) {} }
    var socket;
    try { socket = new WebSocket(url); }
    catch (_) {
      SendMessage(objectName, "OnMultiplayerSocket", '{"type":"transport_closed"}');
      return;
    }
    sockets[objectName] = socket;
    socket.onopen = function() {
      if (sockets[objectName] !== socket) return;
      SendMessage(objectName, "OnMultiplayerSocket", '{"type":"transport_open"}');
    };
    socket.onmessage = function(event) {
      if (sockets[objectName] !== socket) return;
      if (typeof event.data !== 'string' || event.data.length > 16384) return;
      SendMessage(objectName, "OnMultiplayerSocket", event.data);
    };
    socket.onerror = function() { /* onclose drives state recovery */ };
    socket.onclose = function() {
      if (sockets[objectName] !== socket) return;
      delete sockets[objectName];
      SendMessage(objectName, "OnMultiplayerSocket", '{"type":"transport_closed"}');
    };
  },
  DaechungWsSend: function(objectPointer, messagePointer) {
    var objectName = UTF8ToString(objectPointer);
    var data = UTF8ToString(messagePointer);
    var socket = Module.daechungSockets && Module.daechungSockets[objectName];
    if (socket && socket.readyState === WebSocket.OPEN && data.length <= 16384)
      socket.send(data);
  },
  DaechungWsClose: function(objectPointer) {
    var objectName = UTF8ToString(objectPointer);
    var sockets = Module.daechungSockets || {};
    var socket = sockets[objectName];
    delete sockets[objectName];
    if (socket) try { socket.close(1000, 'leave'); } catch (_) {}
  }
});
