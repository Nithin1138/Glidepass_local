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

  bool _isIntentionalShutdown = false;

  bool get isRunning => _process != null;
  bool get isStarting => _isStarting;
  bool get isServerReady => _process != null && _sessionToken.isNotEmpty;
  String get sessionToken => _sessionToken;
  String get sessionCode => _sessionToken.length >= 6 ? _sessionToken.substring(_sessionToken.length - 6) : _sessionToken;
  String get deviceName => _deviceName;
  int get connectedClientsCount => _connectedCount;
  List<String> get connectedDeviceNames => _connectedDevices;

  bool _hasCrashed = false;
  String _crashLog = '';
  bool get hasCrashed => _hasCrashed;
  String get crashLog => _crashLog;

  final StreamController<void> _statusController = StreamController<void>.broadcast();
  Stream<void> get onStatusChanged => _statusController.stream;

  Timer? _statusTimer;
  bool _isStarting = false;

  Future<void> startServer() async {
    if (_process != null || _isStarting) return;
    _isStarting = true;
    _hasCrashed = false;
    _crashLog = '';

    // Free port 8000 before starting to prevent address already in use crashes
    await _freePort();

    final exeDir = p.dirname(Platform.resolvedExecutable);
    String workingDir = '/Users/nithin/Projects/GlidePass';
    if (!Directory(workingDir).existsSync()) {
      if (File(p.join(exeDir, 'main.py')).existsSync()) {
        workingDir = exeDir;
      } else if (File(p.join(Directory.current.path, 'main.py')).existsSync()) {
        workingDir = Directory.current.path;
      } else if (File(p.join(p.dirname(exeDir), 'main.py')).existsSync()) {
        workingDir = p.dirname(exeDir);
      } else if (Platform.isMacOS && File(p.join(exeDir, '..', 'Resources', 'backend', 'main.py')).existsSync()) {
        workingDir = p.normalize(p.join(exeDir, '..', 'Resources', 'backend'));
      } else {
        workingDir = exeDir;
      }
    }

    try {
      Process? proc;
      final String appPyPath = p.join(workingDir, 'main.py');

      final List<String> pythonCandidates = [];
      if (Platform.isWindows) {
        pythonCandidates.addAll([
          // Check common explicit install locations first
          p.join(Platform.environment['LOCALAPPDATA'] ?? '', 'Programs', 'Python', 'Python313', 'python.exe'),
          p.join(Platform.environment['LOCALAPPDATA'] ?? '', 'Programs', 'Python', 'Python312', 'python.exe'),
          p.join(Platform.environment['LOCALAPPDATA'] ?? '', 'Programs', 'Python', 'Python311', 'python.exe'),
          p.join(Platform.environment['LOCALAPPDATA'] ?? '', 'Programs', 'Python', 'Python310', 'python.exe'),
          p.join(Platform.environment['ProgramFiles'] ?? '', 'Python313', 'python.exe'),
          p.join(Platform.environment['ProgramFiles'] ?? '', 'Python312', 'python.exe'),
          p.join(Platform.environment['ProgramFiles'] ?? '', 'Python311', 'python.exe'),
          p.join(Platform.environment['ProgramFiles'] ?? '', 'Python310', 'python.exe'),
          r'C:\Python313\python.exe',
          r'C:\Python312\python.exe',
          r'C:\Python311\python.exe',
          r'C:\Python310\python.exe',
          p.join(exeDir, 'python', 'python.exe'),
          p.join(exeDir, 'backend', 'python.exe'),
          p.join(workingDir, 'python', 'python.exe'),
          'py',
          'python',
          'python3',
        ]);
      } else {
        pythonCandidates.addAll([
          '/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',
          '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
          '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
          '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
          '/opt/homebrew/bin/python3',
          '/usr/local/bin/python3',
          '/usr/bin/python3',
          'python3',
          'python',
        ]);
      }

      for (final pyBin in pythonCandidates) {
        try {
          // On Windows, ignore the Microsoft Store dummy reparse alias
          if (Platform.isWindows && pyBin.toLowerCase().contains(r'microsoft\windowsapps')) {
            continue;
          }

          // Verify the candidate actually runs and is a valid Python interpreter
          if (Platform.isWindows) {
            try {
              final testRun = await Process.run(pyBin, ['-c', 'print("LANPAD_OK")']).timeout(const Duration(milliseconds: 1500));
              if (testRun.exitCode != 0 || !testRun.stdout.toString().contains('LANPAD_OK')) {
                continue;
              }
            } catch (_) {
              continue;
            }
          }

          proc = await Process.start(
            pyBin,
            [appPyPath, '--server-only'],
            workingDirectory: workingDir,
            environment: {
              'PYTHONIOENCODING': 'utf-8',
              'PYTHONUTF8': '1',
            },
          );
          break;
        } catch (_) {
          proc = null;
          continue;
        }
      }

      if (proc == null) {
        _crashLog = Platform.isWindows
            ? "Python was not detected on this Windows PC.\n\n"
              "To run this PC as a LANpad Host/Server, please install Python:\n"
              "  1. Open PowerShell and run:\n"
              "     winget install Python.Python.3.12\n"
              "  2. Or download installer from: https://www.python.org\n\n"
              "If you just want to control or monitor another device,\n"
              "click 'Continue as Remote Client' below (no Python needed!)."
            : "Python 3 was not found on this system.";
        _hasCrashed = true;
        _stopTracking();
        return;
      }

      _process = proc;

      // Stream process output for crash logging without console printing
      _process!.stdout.transform(utf8.decoder).listen((data) {});
      _process!.stderr.transform(utf8.decoder).listen((data) {
        _crashLog += data;
        if (_crashLog.length > 5000) {
          _crashLog = _crashLog.substring(_crashLog.length - 5000);
        }
      });

      _process!.exitCode.then((code) {
        if (code != 0 && !_isIntentionalShutdown) {
          _hasCrashed = true;
        }
        _isIntentionalShutdown = false;
        _stopTracking();
      });

      // Start polling the Python server for active status, tokens, and connections
      _startTracking();
      _isStarting = false;
    } catch (e) {
      _isStarting = false;
      _stopTracking();
    }
  }

  Future<void> _freePort() async {
    try {
      if (Platform.isMacOS || Platform.isLinux) {
        await Process.run('sh', [
          '-c',
          'pid=\$(lsof -t -i tcp:8000) && [ -n "\$pid" ] && kill -9 \$pid || true'
        ]);
      } else if (Platform.isWindows) {
        await Process.run('cmd', [
          '/c',
          'for /f "tokens=5" %a in (\'netstat -aon ^| findstr 8000\') do taskkill /f /pid %a'
        ]);
      }
    } catch (_) {
    }
  }

  Future<void> stopServer() async {
    if (_process == null) return;
    _isIntentionalShutdown = true;
    if (Platform.isWindows) {
      _process!.kill();
    } else {
      _process!.kill(ProcessSignal.sigterm);
    }
    _stopTracking();
  }

  String _lanIp = '';
  String get lanIp => _lanIp;

  HttpClient? _trackingClient;

  void _startTracking() {
    _statusTimer?.cancel();
    _trackingClient?.close(force: true);
    _trackingClient = HttpClient()..connectionTimeout = const Duration(milliseconds: 800);

    _statusTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (_process == null) return;
      try {
        final client = _trackingClient ?? HttpClient();
        bool changed = false;

        // 1. Fetch Session Token
        if (_sessionToken.isEmpty) {
          final tokenReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/benchmark/token'));
          final tokenResp = await tokenReq.close();
          if (tokenResp.statusCode == 200) {
            final dataStr = await tokenResp.transform(utf8.decoder).join();
            final data = jsonDecode(dataStr);
            _sessionToken = data['session_token'] ?? '';
            changed = true;
          }
        }

        // 2. Fetch Connection Info / Device Name / LAN IP
        if (_deviceName.isEmpty || _lanIp.isEmpty) {
          final infoReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/connection/info'));
          final infoResp = await infoReq.close();
          if (infoResp.statusCode == 200) {
            final dataStr = await infoResp.transform(utf8.decoder).join();
            final data = jsonDecode(dataStr);
            _deviceName = data['device_name'] ?? '';
            _lanIp = data['lan_ip'] ?? '';
            changed = true;
          }
        }

        // 3. Fetch Connected Devices List & Count
        final connReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/connections'));
        final connResp = await connReq.close();
        if (connResp.statusCode == 200) {
          final dataStr = await connResp.transform(utf8.decoder).join();
          final data = jsonDecode(dataStr);
          final int newCount = data['count'] ?? 0;
          final List<dynamic> devs = data['devices'] ?? [];
          final List<String> newDevices = devs.map((d) => d.toString()).toList();
          if (newCount != _connectedCount || newDevices.length != _connectedDevices.length) {
            _connectedCount = newCount;
            _connectedDevices = newDevices;
            changed = true;
          }
        }

        if (changed) {
          _statusController.add(null);
        }
      } catch (_) {
        // Server might not be fully started yet
      }
    });
  }

  void _stopTracking() {
    _statusTimer?.cancel();
    _statusTimer = null;
    _trackingClient?.close(force: true);
    _trackingClient = null;
    _process = null;
    _sessionToken = '';
    _deviceName = '';
    _lanIp = '';
    _connectedCount = 0;
    _connectedDevices.clear();
    _statusController.add(null);
  }

  Future<void> refreshConnections() async {
    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(milliseconds: 500);
      final connReq = await client.getUrl(Uri.parse('http://127.0.0.1:8000/api/connections'));
      final connResp = await connReq.close();
      if (connResp.statusCode == 200) {
        final dataStr = await connResp.transform(utf8.decoder).join();
        final data = jsonDecode(dataStr);
        _connectedCount = data['count'] ?? 0;
        final List<dynamic> devs = data['devices'] ?? [];
        _connectedDevices = devs.map((d) => d.toString()).toList();
        _statusController.add(null);
      }
    } catch (_) {}
  }
}
