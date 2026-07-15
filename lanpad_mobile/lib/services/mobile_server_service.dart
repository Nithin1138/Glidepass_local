import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';

class MobileServerService {
  static final MobileServerService _instance = MobileServerService._internal();
  factory MobileServerService() => _instance;
  MobileServerService._internal();

  HttpServer? _server;
  String _sessionToken = '';
  final List<WebSocket> _sockets = [];

  String get sessionToken => _sessionToken;
  String get sessionCode => _sessionToken.length >= 6 ? _sessionToken.substring(_sessionToken.length - 6) : _sessionToken;

  Future<void> start() async {
    if (!Platform.isAndroid && !Platform.isIOS) return;
    if (_server != null) return;

    // Generate random 6 digit numeric code or random token
    final rand = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
    _sessionToken = 'mob_$rand';

    try {
      _server = await HttpServer.bind(InternetAddress.anyIPv4, 8000, shared: true);
      debugPrint('[MobileServer] Listening on port 8000...');
      
      _server!.listen((HttpRequest request) async {
        final path = request.uri.path;
        
        // Handle WebSocket Upgrade
        if (path.startsWith('/ws/connect') && WebSocketTransformer.isUpgradeRequest(request)) {
          final socket = await WebSocketTransformer.upgrade(request);
          _sockets.add(socket);
          debugPrint('[MobileServer] Active WebSocket client connected.');
          socket.listen(
            (msg) {},
            onDone: () => _sockets.remove(socket),
            onError: (_) => _sockets.remove(socket),
          );
          return;
        }

        // Handle normal requests
        request.response.headers.add('Access-Control-Allow-Origin', '*');
        request.response.headers.add('Access-Control-Allow-Headers', '*');
        request.response.headers.add('Access-Control-Allow-Methods', '*');

        if (request.method == 'OPTIONS') {
          request.response..statusCode = 200..close();
          return;
        }

        if (path == '/api/connection/info') {
          final friendlyName = Platform.isAndroid ? 'Android Device' : 'iOS Device';
          final responseData = {
            'status': 'success',
            'device_name': friendlyName,
            'session_code': sessionCode,
            'session_token': _sessionToken,
            'lan_ip': '127.0.0.1',
          };
          request.response
            ..statusCode = 200
            ..headers.contentType = ContentType.json
            ..write(jsonEncode(responseData));
          await request.response.close();
        } else if (path == '/api/connections') {
          request.response
            ..statusCode = 200
            ..headers.contentType = ContentType.json
            ..write(jsonEncode({
              'count': _sockets.length,
              'devices': _sockets.map((s) => 'Remote Client').toList(),
            }));
          await request.response.close();
        } else {
          request.response..statusCode = 404..close();
        }
      });
    } catch (e) {
      debugPrint('[MobileServer] Error starting: $e');
    }
  }

  void broadcastFilesChanged() {
    for (var s in _sockets) {
      try {
        s.add(jsonEncode({'event': 'files_changed'}));
      } catch (_) {}
    }
  }

  void broadcastPasteReceived(String preview) {
    for (var s in _sockets) {
      try {
        s.add(jsonEncode({'event': 'paste_received', 'preview': preview}));
      } catch (_) {}
    }
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
    _sockets.clear();
  }
}
