import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';

class MobileServerService {
  static final MobileServerService _instance = MobileServerService._internal();
  factory MobileServerService() => _instance;
  MobileServerService._internal();

  static final ValueNotifier<bool> isClientConnected = ValueNotifier<bool>(false);
  static String connectedClientName = '';

  HttpServer? _server;
  String _sessionToken = '';
  final List<WebSocket> _sockets = [];

  String get sessionToken => _sessionToken;
  String get sessionCode => _sessionToken.length >= 6 ? _sessionToken.substring(_sessionToken.length - 6) : _sessionToken;

  static Future<String> getFriendlyDeviceName() async {
    final deviceInfo = DeviceInfoPlugin();
    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        final brand = androidInfo.brand;
        final model = androidInfo.model;
        final friendlyBrand = brand.isNotEmpty ? '${brand[0].toUpperCase()}${brand.substring(1)}' : '';
        return friendlyBrand.isNotEmpty ? '$friendlyBrand $model' : model;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return iosInfo.name;
      } else if (Platform.isMacOS) {
        final macInfo = await deviceInfo.macOsInfo;
        return macInfo.computerName;
      }
    } catch (e) {
      debugPrint('Failed to get device info: $e');
    }
    
    var friendlyName = Platform.localHostname;
    if (friendlyName.endsWith('.local')) {
      friendlyName = friendlyName.substring(0, friendlyName.length - 6);
    }
    friendlyName = friendlyName.replaceAll('-', ' ').replaceAll('_', ' ');
    friendlyName = friendlyName.split(' ').map((word) {
      if (word.isEmpty) return '';
      return '${word[0].toUpperCase()}${word.substring(1)}';
    }).join(' ');
    
    return friendlyName.trim().isNotEmpty 
        ? friendlyName 
        : (Platform.isAndroid ? 'Android Device' : 'iOS Device');
  }

  Future<void> start() async {
    if (!Platform.isAndroid && !Platform.isIOS) return;
    if (_server != null) return;

    // Reset pairing notifier on start
    isClientConnected.value = false;
    connectedClientName = '';

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
          final friendlyName = await getFriendlyDeviceName();
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
        } else if (path == '/api/files/list') {
          // If the desktop client lists files, we know it has paired successfully!
          final sid = request.uri.queryParameters['sid'];
          if (sid == _sessionToken || sid == sessionCode) {
            MobileServerService.isClientConnected.value = true;
            MobileServerService.connectedClientName = 'LANpad Laptop';
          }
          request.response
            ..statusCode = 200
            ..headers.contentType = ContentType.json
            ..write(jsonEncode({'status': 'success', 'files': []}));
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
