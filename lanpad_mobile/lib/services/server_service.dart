import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_web_socket/shelf_web_socket.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ServerService {
  static final ServerService _instance = ServerService._internal();
  factory ServerService() => _instance;
  ServerService._internal();

  HttpServer? _server;
  final List<WebSocketChannel> _wsClients = [];
  final Map<String, String> _connectedDevices = {}; // ip -> name
  String _sessionToken = '';
  String _deviceName = '';
  bool _isTyping = false;

  static const MethodChannel _platformChannel = MethodChannel('lanpad/system');

  String get sessionToken => _sessionToken;
  String get sessionCode => _sessionToken.length >= 6 ? _sessionToken.substring(_sessionToken.length - 6) : _sessionToken;
  String get deviceName => _deviceName;
  bool get isRunning => _server != null;
  int get connectedClientsCount => _wsClients.length + _connectedDevices.length;
  List<String> get connectedDeviceNames => _connectedDevices.values.toList();

  final StreamController<void> _statusController = StreamController<void>.broadcast();
  Stream<void> get onStatusChanged => _statusController.stream;

  Future<void> startServer() async {
    if (_server != null) return;

    // Generate numeric session token
    final random = Random();
    _sessionToken = List.generate(32, (_) => random.nextInt(10).toString()).join();

    // Fetch or generate stable device name
    final prefs = await SharedPreferences.getInstance();
    _deviceName = prefs.getString('device_name') ?? '';
    if (_deviceName.isEmpty) {
      final adjectives = ['Active', 'Bold', 'Bright', 'Calm', 'Clever', 'Cool', 'Cozy', 'Elite', 'Fresh', 'Happy'];
      final animals = ['Bear', 'Cat', 'Dog', 'Eagle', 'Falcon', 'Fox', 'Koala', 'Lion', 'Panda', 'Tiger'];
      _deviceName = '${adjectives[random.nextInt(adjectives.length)]}${animals[random.nextInt(animals.length)]}';
      await prefs.setString('device_name', _deviceName);
    }

    final router = Router();

    // CORS & Auth Middleware
    Middleware checkAuth() {
      return (Handler innerHandler) {
        return (Request request) async {
          final sid = request.url.queryParameters['sid'];
          if (sid != _sessionToken && sid != sessionCode) {
            return Response.forbidden(jsonEncode({'status': 'error', 'message': 'Unauthorized session'}));
          }
          return await innerHandler(request);
        };
      };
    }

    // ── Routes ───────────────────────────────────────────────────────────
    
    // Connection Info (open endpoint for pairing validation)
    router.get('/api/connection/info', (Request request) {
      return Response.ok(
        jsonEncode({
          'status': 'success',
          'session_code': sessionCode,
          'device_name': _deviceName,
          'lan_ip': 'localhost',
        }),
        headers: {'Content-Type': 'application/json'},
      );
    });

    // Active connections count
    router.get('/api/connections', (Request request) {
      return Response.ok(
        jsonEncode({
          'count': connectedClientsCount,
          'devices': connectedDeviceNames,
        }),
        headers: {'Content-Type': 'application/json'},
      );
    });

    // Active session token for local tools
    router.get('/api/benchmark/token', (Request request) {
      return Response.ok(
        jsonEncode({'session_token': _sessionToken}),
        headers: {'Content-Type': 'application/json'},
      );
    });

    // List shared files
    router.get('/api/files/list', (Request request) async {
      final clientDevice = request.url.queryParameters['client_device'];
      if (clientDevice != null && clientDevice.isNotEmpty) {
        final connInfo = request.context['shelf.io.connection_info'] as HttpConnectionInfo?;
        final ip = connInfo?.remoteAddress.address ?? 'unknown';
        _connectedDevices[ip] = clientDevice;
        _statusController.add(null);
      }

      final dir = await _getSharedDir();
      final List<Map<String, dynamic>> files = [];
      if (await dir.exists()) {
        await for (final entity in dir.list()) {
          if (entity is File && !p.basename(entity.path).startsWith('.')) {
            final stat = await entity.stat();
            files.add({
              'name': p.basename(entity.path),
              'size': stat.size,
              'mtime': stat.modified.millisecondsSinceEpoch / 1000.0,
            });
          }
        }
      }

      return Response.ok(
        jsonEncode({'status': 'success', 'files': files}),
        headers: {'Content-Type': 'application/json'},
      );
    });

    // File download
    router.get('/api/files/download/<filename>', (Request request, String filename) async {
      final dir = await _getSharedDir();
      final file = File(p.join(dir.path, filename));
      if (await file.exists()) {
        return Response.ok(
          file.openRead(),
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="$filename"',
          },
        );
      }
      return Response.notFound('File not found');
    });

    // File upload (Supports simple streaming binary or multipart)
    router.post('/api/files/upload', (Request request) async {
      final filename = request.url.queryParameters['filename'] ?? 'uploaded_file';
      final dir = await _getSharedDir();
      final file = File(p.join(dir.path, filename));
      
      final sink = file.openWrite();
      await request.read().forEach(sink.add);
      await sink.close();

      _broadcastToWebSockets(jsonEncode({'event': 'files_changed'}));
      return Response.ok(jsonEncode({'status': 'success', 'filename': filename}));
    });

    // Remote Copy Endpoint (Write to Local System Clipboard)
    router.post('/copy', (Request request) async {
      final body = await request.readAsString();
      final data = jsonDecode(body);
      final text = data['text'] ?? '';
      
      await Clipboard.setData(ClipboardData(text: text));
      _broadcastToWebSockets(jsonEncode({'event': 'clipboard_changed', 'text': text}));
      
      return Response.ok(jsonEncode({'status': 'success'}));
    });

    // Remote Paste Endpoint (Keyboard simulation)
    router.post('/paste', (Request request) async {
      final body = await request.readAsString();
      final data = jsonDecode(body);
      final text = data['text'] ?? '';

      _isTyping = true;
      _statusController.add(null);

      // Perform typing via Platform Channel
      try {
        await _platformChannel.invokeMethod('simulateTyping', {'text': text});
      } catch (e) {
        // Fallback or ignore
      }

      _isTyping = false;
      _statusController.add(null);

      return Response.ok(jsonEncode({'status': 'success'}));
    });

    // WebSocket Handler
    final wsHandler = webSocketHandler((webSocket, _) {
      final channel = webSocket as WebSocketChannel;
      _wsClients.add(channel);
      _statusController.add(null);

      channel.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message);
            if (data['event'] == 'ping') {
              channel.sink.add(jsonEncode({'event': 'pong'}));
            }
          } catch (_) {}
        },
        onDone: () {
          _wsClients.remove(channel);
          _statusController.add(null);
        },
      );
    });

    router.get('/ws', wsHandler);

    final cascade = Cascade().add(router);
    _server = await shelf_io.serve(cascade.handler, '0.0.0.0', 8000);
    _statusController.add(null);
  }

  Future<void> stopServer() async {
    if (_server == null) return;
    await _server!.close(force: true);
    _server = null;
    _wsClients.clear();
    _connectedDevices.clear();
    _statusController.add(null);
  }

  Future<Directory> _getSharedDir() async {
    final downloads = await getDownloadsDirectory();
    final path = p.join(downloads?.path ?? '', 'LANpad');
    final dir = Directory(path);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  void _broadcastToWebSockets(String message) {
    for (final client in _wsClients) {
      client.sink.add(message);
    }
  }
}
