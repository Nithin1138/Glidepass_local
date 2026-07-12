import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class TunnelService {
  static final TunnelService _instance = TunnelService._internal();
  factory TunnelService() => _instance;
  TunnelService._internal();

  Process? _process;
  String? _tunnelUrl;
  bool _isConnecting = false;

  String? get tunnelUrl => _tunnelUrl;
  bool get isConnecting => _isConnecting;
  bool get isRunning => _process != null;

  final StreamController<void> _statusController = StreamController<void>.broadcast();
  Stream<void> get onStatusChanged => _statusController.stream;

  Future<void> startTunnel() async {
    if (_process != null || _isConnecting) return;

    _isConnecting = true;
    _tunnelUrl = null;
    _statusController.add(null);

    try {
      final binPath = await _getOrDownloadBinary();
      if (binPath == null) {
        throw Exception('Could not obtain cloudflared binary');
      }

      print("[TunnelService] Spawning cloudflared process: $binPath");
      // Launch process: cloudflared tunnel --url http://127.0.0.1:8000
      _process = await Process.start(
        binPath,
        ['tunnel', '--url', 'http://127.0.0.1:8000'],
      );

      void handleLine(String line) {
        if (_tunnelUrl == null) {
          final match = RegExp(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com').firstMatch(line);
          if (match != null) {
            _tunnelUrl = match.group(0);
            _isConnecting = false;
            _statusController.add(null);
            _notifyPythonServerOfTunnel(_tunnelUrl!);
          }
        }
      }

      _process!.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);
      _process!.stderr.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);

      _process!.exitCode.then((code) {
        _process = null;
        _tunnelUrl = null;
        _isConnecting = false;
        _statusController.add(null);
      });

    } catch (e) {
      _process = null;
      _tunnelUrl = null;
      _isConnecting = false;
      _statusController.add(null);
    }
  }

  Future<void> stopTunnel() async {
    if (_process == null) return;
    _process!.kill(ProcessSignal.sigterm);
    _process = null;
    _tunnelUrl = null;
    _isConnecting = false;
    _statusController.add(null);
  }

  Future<String?> _getOrDownloadBinary() async {
    // 1. Check if 'cloudflared' is available globally in the system PATH
    try {
      final checkCmd = Platform.isWindows ? 'where' : 'which';
      final checkRes = await Process.run(checkCmd, ['cloudflared']);
      if (checkRes.exitCode == 0) {
        final path = checkRes.stdout.toString().trim();
        if (path.isNotEmpty && File(path).existsSync()) {
          print("[TunnelService] Found cloudflared globally: $path");
          return path;
        }
      }
    } catch (_) {}

    // 2. Check the standard home directory cache folder (~/.lanpad/cloudflared)
    try {
      final home = Platform.isWindows ? Platform.environment['USERPROFILE'] : Platform.environment['HOME'];
      if (home != null) {
        final homeBinName = Platform.isWindows ? 'cloudflared.exe' : 'cloudflared';
        final homeBinPath = p.join(home, '.lanpad', homeBinName);
        if (File(homeBinPath).existsSync()) {
          print("[TunnelService] Found cached cloudflared in home: $homeBinPath");
          return homeBinPath;
        }
      }
    } catch (_) {}

    // 3. Fallback to application support directory
    final supportDir = await getApplicationSupportDirectory();
    final binName = Platform.isWindows ? 'cloudflared.exe' : 'cloudflared';
    final binPath = p.join(supportDir.path, binName);
    final file = File(binPath);

    if (await file.exists()) {
      print("[TunnelService] Found cloudflared in app support: $binPath");
      return binPath;
    }

    // Download Cloudflare binary dynamically if not found anywhere
    String url;
    if (Platform.isMacOS) {
      final isAppleSilicon = await _isAppleSiliconMac();
      url = isAppleSilicon
          ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64'
          : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64';
    } else if (Platform.isWindows) {
      url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
    } else {
      return null;
    }

    print("[TunnelService] Downloading cloudflared from: $url");
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse(url));
      final response = await request.close();
      if (response.statusCode == 200) {
        final sink = file.openWrite();
        await response.forEach(sink.add);
        await sink.close();

        if (!Platform.isWindows) {
          await Process.run('chmod', ['+x', binPath]);
        }
        return binPath;
      }
    } catch (e) {
      print("[TunnelService] Failed downloading cloudflared: $e");
    }
    return null;
  }

  Future<bool> _isAppleSiliconMac() async {
    if (!Platform.isMacOS) return false;
    try {
      final result = await Process.run('uname', ['-m']);
      return result.stdout.toString().trim() == 'arm64';
    } catch (_) {
      return false;
    }
  }

  Future<void> _notifyPythonServerOfTunnel(String url) async {
    try {
      final client = HttpClient();
      final uri = Uri.parse('http://127.0.0.1:8000/api/tunnel/set?url=${Uri.encodeQueryComponent(url)}');
      final request = await client.postUrl(uri);
      await request.close();
      print("[TunnelService] Successfully updated python server with tunnel url: $url");
    } catch (e) {
      print("[TunnelService] Failed to notify python server of tunnel url: $e");
    }
  }
}
