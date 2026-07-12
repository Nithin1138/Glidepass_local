import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:path/path.dart' as p;

class ServerService {
  static final ServerService _instance = ServerService._internal();
  factory ServerService() => _instance;
  ServerService._internal();

  Process? _process;
  String _sessionToken = '';
  String _deviceName = '';
  int _connectedCount = 0;
  List<String> _connectedDevices = [];

  bool get isRunning => _process != null;
  String get sessionToken => _sessionToken;
  String get sessionCode => _sessionToken.length >= 6 ? _sessionToken.substring(_sessionToken.length - 6) : _sessionToken;
  String get deviceName => _deviceName;
  int get connectedClientsCount => _connectedCount;
  List<String> get connectedDeviceNames => _connectedDevices;

  final StreamController<void> _statusController = StreamController<void>.broadcast();
  Stream<void> get onStatusChanged => _statusController.stream;

  Timer? _statusTimer;

  Future<void> startServer() async {
    if (_process != null) return;

    // To support running from both IDE (cwd=lanpad_mobile) and build folders, let's find app.py:
    String workingDir = Directory.current.path;
    if (!File(p.join(workingDir, 'app.py')).existsSync()) {
      workingDir = p.dirname(workingDir);
    }

    try {
      // Launch background Python server (runs the exact same app.py backend)
      _process = await Process.start(
        'python3',
        ['app.py'],
        workingDirectory: workingDir,
      );

      // Stream process output for debug logging
      _process!.stdout.transform(utf8.decoder).listen((data) {
        print("[python stdout] $data");
      });
      _process!.stderr.transform(utf8.decoder).listen((data) {
        print("[python stderr] $data");
      });

      _process!.exitCode.then((_) {
        _stopTracking();
      });

      // Start polling the Python server for active status, tokens, and connections
      _startTracking();
    } catch (e) {
      print("[ServerService] Failed to start python server: $e");
      _stopTracking();
    }
  }

  Future<void> stopServer() async {
    if (_process == null) return;
    _process!.kill(ProcessSignal.sigterm);
    _stopTracking();
  }

  void _startTracking() {
    _statusTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (_process == null) return;
      try {
        final client = HttpClient();
        client.connectionTimeout = const Duration(milliseconds: 500);

        // 1. Fetch Session Token
        if (_sessionToken.isEmpty) {
          final tokenReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/benchmark/token'));
          final tokenResp = await tokenReq.close();
          if (tokenResp.statusCode == 200) {
            final dataStr = await tokenResp.transform(utf8.decoder).join();
            final data = jsonDecode(dataStr);
            _sessionToken = data['session_token'] ?? '';
          }
        }

        // 2. Fetch Connection Info / Device Name
        if (_deviceName.isEmpty) {
          final infoReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/connection/info'));
          final infoResp = await infoReq.close();
          if (infoResp.statusCode == 200) {
            final dataStr = await infoResp.transform(utf8.decoder).join();
            final data = jsonDecode(dataStr);
            _deviceName = data['device_name'] ?? '';
          }
        }

        // 3. Fetch Connected Devices List & Count
        final connReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/connections'));
        final connResp = await connReq.close();
        if (connResp.statusCode == 200) {
          final dataStr = await connResp.transform(utf8.decoder).join();
          final data = jsonDecode(dataStr);
          _connectedCount = data['count'] ?? 0;
          final List<dynamic> devs = data['devices'] ?? [];
          _connectedDevices = devs.map((d) => d.toString()).toList();
        }

        _statusController.add(null);
      } catch (_) {
        // Server might not be fully started yet
      }
    });
  }

  void _stopTracking() {
    _statusTimer?.cancel();
    _statusTimer = null;
    _process = null;
    _sessionToken = '';
    _deviceName = '';
    _connectedCount = 0;
    _connectedDevices.clear();
    _statusController.add(null);
  }
}
