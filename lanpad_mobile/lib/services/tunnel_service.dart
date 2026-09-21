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
  String _activeProvider = ''; // 'cloudflared', 'pinggy', 'localhost.run'

  String? get tunnelUrl => _tunnelUrl;
  bool get isConnecting => _isConnecting;
  bool get isRunning => _process != null;
  String get activeProvider => _activeProvider;

  final StreamController<void> _statusController = StreamController<void>.broadcast();
  Stream<void> get onStatusChanged => _statusController.stream;

  /// URL regex patterns for each tunnel provider
  static final _cfPattern = RegExp(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com');
  static final _pinggyPattern = RegExp(
    r'https://[a-zA-Z0-9-]+\.(?:run\.pinggy-free\.link|free\.pinggy\.net|pinggy\.link)',
  );
  static final _lhrPattern = RegExp(r'https://[a-zA-Z0-9-]+\.lhr\.life');

  Future<void> startTunnel({int port = 8000}) async {
    if (_process != null || _isConnecting) return;

    _isConnecting = true;
    _tunnelUrl = null;
    _activeProvider = '';
    _statusController.add(null);

    // Strategy:
    // 1. Check if cloudflared is already installed locally (NO download). If found, use it.
    // 2. If not, try native SSH via Pinggy (port 443, works on nearly all networks).
    // 3. If Pinggy fails, try localhost.run via SSH.
    // 4. As a last resort, attempt downloading cloudflared in background.

    // --- Step 1: Try cloudflared if already installed ---
    final existingBin = await _findExistingCloudflared();
    if (existingBin != null) {
      print("[TunnelService] Found existing cloudflared: $existingBin");
      final success = await _startCloudflared(existingBin, port);
      if (success) return;
    }

    // --- Step 2: Try Pinggy SSH tunnel (port 443, zero downloads) ---
    print("[TunnelService] Trying Pinggy SSH tunnel (port 443)...");
    final pinggyOk = await _startPinggyTunnel(port);
    if (pinggyOk) return;

    // --- Step 3: Try localhost.run SSH tunnel ---
    print("[TunnelService] Trying localhost.run SSH tunnel...");
    final lhrOk = await _startLocalhostRunTunnel(port);
    if (lhrOk) return;

    // --- Step 4: Download cloudflared as last resort ---
    print("[TunnelService] All SSH tunnels failed, downloading cloudflared...");
    final downloadedBin = await _downloadCloudflared();
    if (downloadedBin != null) {
      final success = await _startCloudflared(downloadedBin, port);
      if (success) return;
    }

    // All methods failed
    print("[TunnelService] All tunnel methods failed.");
    _process = null;
    _tunnelUrl = null;
    _isConnecting = false;
    _activeProvider = '';
    _statusController.add(null);
  }

  Future<void> stopTunnel() async {
    if (_process == null) return;
    _process!.kill(ProcessSignal.sigterm);
    _process = null;
    _tunnelUrl = null;
    _isConnecting = false;
    _activeProvider = '';
    _statusController.add(null);
  }

  // ─── Cloudflared (only if already installed) ───────────────────────

  Future<bool> _startCloudflared(String binPath, int port) async {
    try {
      if (Platform.isMacOS) {
        try {
          await Process.run('xattr', ['-d', 'com.apple.quarantine', binPath]);
        } catch (_) {}
      }

      _process = await Process.start(
        binPath,
        ['tunnel', '--protocol', 'http2', '--url', 'http://127.0.0.1:$port'],
      );

      final completer = Completer<bool>();
      Timer? timeout;

      void handleLine(String line) {
        if (_tunnelUrl != null) return;
        final match = _cfPattern.firstMatch(line);
        if (match != null) {
          _tunnelUrl = match.group(0);
          _isConnecting = false;
          _activeProvider = 'cloudflared';
          _statusController.add(null);
          _notifyPythonServerOfTunnel(_tunnelUrl!);
          timeout?.cancel();
          if (!completer.isCompleted) completer.complete(true);
        }
      }

      _process!.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);
      _process!.stderr.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);

      _process!.exitCode.then((code) {
        if (_activeProvider == 'cloudflared') {
          _process = null;
          _tunnelUrl = null;
          _isConnecting = false;
          _activeProvider = '';
          _statusController.add(null);
        }
        if (!completer.isCompleted) completer.complete(false);
      });

      // Wait up to 15s for URL
      timeout = Timer(const Duration(seconds: 15), () {
        if (!completer.isCompleted) {
          _process?.kill();
          _process = null;
          completer.complete(false);
        }
      });

      return await completer.future;
    } catch (e) {
      print("[TunnelService] cloudflared start error: $e");
      _process = null;
      return false;
    }
  }

  // ─── Pinggy SSH Tunnel (port 443, zero downloads) ─────────────────

  Future<bool> _startPinggyTunnel(int port) async {
    try {
      final sshPath = await _findSsh();
      if (sshPath == null) {
        print("[TunnelService] SSH not found on system");
        return false;
      }

      _process = await Process.start(sshPath, [
        '-p', '443',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ConnectTimeout=10',
        '-R', '0:localhost:$port',
        'a.pinggy.io',
      ]);

      final completer = Completer<bool>();
      Timer? timeout;

      void handleLine(String line) {
        if (_tunnelUrl != null) return;
        final match = _pinggyPattern.firstMatch(line);
        if (match != null) {
          _tunnelUrl = match.group(0);
          _isConnecting = false;
          _activeProvider = 'pinggy';
          _statusController.add(null);
          _notifyPythonServerOfTunnel(_tunnelUrl!);
          timeout?.cancel();
          if (!completer.isCompleted) completer.complete(true);
        }
      }

      _process!.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);
      _process!.stderr.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);

      _process!.exitCode.then((code) {
        if (_activeProvider == 'pinggy') {
          _process = null;
          _tunnelUrl = null;
          _isConnecting = false;
          _activeProvider = '';
          _statusController.add(null);
        }
        if (!completer.isCompleted) completer.complete(false);
      });

      // Wait up to 12s for URL
      timeout = Timer(const Duration(seconds: 12), () {
        if (!completer.isCompleted) {
          print("[TunnelService] Pinggy timed out after 12s");
          _process?.kill();
          _process = null;
          completer.complete(false);
        }
      });

      return await completer.future;
    } catch (e) {
      print("[TunnelService] Pinggy SSH error: $e");
      _process = null;
      return false;
    }
  }

  // ─── localhost.run SSH Tunnel ──────────────────────────────────────

  Future<bool> _startLocalhostRunTunnel(int port) async {
    try {
      final sshPath = await _findSsh();
      if (sshPath == null) return false;

      _process = await Process.start(sshPath, [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ConnectTimeout=10',
        '-R', '80:localhost:$port',
        'nokey@localhost.run',
      ]);

      final completer = Completer<bool>();
      Timer? timeout;

      void handleLine(String line) {
        if (_tunnelUrl != null) return;
        final lhrMatch = _lhrPattern.firstMatch(line);
        // localhost.run sometimes returns a direct https://xxxxx.localhost.run URL
        final lrMatch = RegExp(r'https://[a-zA-Z0-9-]+\.localhost\.run').firstMatch(line);
        final matchUrl = lhrMatch?.group(0) ?? lrMatch?.group(0);
        if (matchUrl != null) {
          _tunnelUrl = matchUrl;
          _isConnecting = false;
          _activeProvider = 'localhost.run';
          _statusController.add(null);
          _notifyPythonServerOfTunnel(_tunnelUrl!);
          timeout?.cancel();
          if (!completer.isCompleted) completer.complete(true);
        }
      }

      _process!.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);
      _process!.stderr.transform(utf8.decoder).transform(const LineSplitter()).listen(handleLine);

      _process!.exitCode.then((code) {
        if (_activeProvider == 'localhost.run') {
          _process = null;
          _tunnelUrl = null;
          _isConnecting = false;
          _activeProvider = '';
          _statusController.add(null);
        }
        if (!completer.isCompleted) completer.complete(false);
      });

      // Wait up to 12s
      timeout = Timer(const Duration(seconds: 12), () {
        if (!completer.isCompleted) {
          print("[TunnelService] localhost.run timed out after 12s");
          _process?.kill();
          _process = null;
          completer.complete(false);
        }
      });

      return await completer.future;
    } catch (e) {
      print("[TunnelService] localhost.run SSH error: $e");
      _process = null;
      return false;
    }
  }

  // ─── SSH Discovery ────────────────────────────────────────────────

  Future<String?> _findSsh() async {
    // On Windows 10/11, OpenSSH is built-in at C:\Windows\System32\OpenSSH\ssh.exe
    // On macOS/Linux, ssh is in /usr/bin/ssh
    final checkCmd = Platform.isWindows ? 'where' : 'which';
    try {
      final result = await Process.run(checkCmd, ['ssh']);
      if (result.exitCode == 0) {
        final path = result.stdout.toString().trim().split('\n').first.trim();
        if (path.isNotEmpty) return path;
      }
    } catch (_) {}

    // Direct path fallback
    if (Platform.isWindows) {
      final winSsh = r'C:\Windows\System32\OpenSSH\ssh.exe';
      if (File(winSsh).existsSync()) return winSsh;
    } else {
      if (File('/usr/bin/ssh').existsSync()) return '/usr/bin/ssh';
    }
    return null;
  }

  // ─── Cloudflared Binary Discovery (NO download) ───────────────────

  Future<String?> _findExistingCloudflared() async {
    // 1. Check system PATH
    try {
      final checkCmd = Platform.isWindows ? 'where' : 'which';
      final checkRes = await Process.run(checkCmd, ['cloudflared']);
      if (checkRes.exitCode == 0) {
        final path = checkRes.stdout.toString().trim();
        if (path.isNotEmpty && File(path).existsSync()) {
          return path;
        }
      }
    } catch (_) {}

    // 2. Check ~/.lanpad/cloudflared
    try {
      final home = Platform.isWindows
          ? Platform.environment['USERPROFILE']
          : Platform.environment['HOME'];
      if (home != null) {
        final binName = Platform.isWindows ? 'cloudflared.exe' : 'cloudflared';
        final homeBinPath = p.join(home, '.lanpad', binName);
        if (File(homeBinPath).existsSync()) return homeBinPath;
      }
    } catch (_) {}

    // 3. Check app support directory
    try {
      final supportDir = await getApplicationSupportDirectory();
      final binName = Platform.isWindows ? 'cloudflared.exe' : 'cloudflared';
      final binPath = p.join(supportDir.path, binName);
      if (File(binPath).existsSync()) return binPath;
    } catch (_) {}

    return null;
  }

  // ─── Cloudflared Download (last resort) ───────────────────────────

  Future<String?> _downloadCloudflared() async {
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

    try {
      final supportDir = await getApplicationSupportDirectory();
      final binName = Platform.isWindows ? 'cloudflared.exe' : 'cloudflared';
      final binPath = p.join(supportDir.path, binName);
      final file = File(binPath);

      print("[TunnelService] Downloading cloudflared from: $url");
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 30);
      final request = await client.getUrl(Uri.parse(url));
      final response = await request.close().timeout(const Duration(seconds: 120));
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

  // ─── Notify Python Server ─────────────────────────────────────────

  Future<void> _notifyPythonServerOfTunnel(String url) async {
    try {
      final client = HttpClient();
      final uri = Uri.parse('http://127.0.0.1:8000/api/tunnel/set?url=${Uri.encodeQueryComponent(url)}');
      final request = await client.postUrl(uri);
      await request.close();
      print("[TunnelService] Successfully updated python server with tunnel url: $url (via $_activeProvider)");
    } catch (e) {
      print("[TunnelService] Failed to notify python server of tunnel url: $e");
    }
  }
}
