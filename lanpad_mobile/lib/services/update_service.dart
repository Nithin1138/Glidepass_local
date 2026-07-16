import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'admin_service.dart';
import 'server_service.dart';
import 'tunnel_service.dart';

class UpdateService {
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  bool _isUpdating = false;
  bool get isUpdating => _isUpdating;

  /// Applies the update using the URLs in UpdateInfo.
  /// Reports progress via onProgress(double percent).
  Future<void> applyUpdate({
    required UpdateInfo updateInfo,
    required void Function(double progress) onProgress,
    required void Function(String error) onError,
  }) async {
    if (_isUpdating) return;
    _isUpdating = true;

    try {
      final url = Platform.isMacOS ? updateInfo.macUrl : (Platform.isWindows ? updateInfo.windowsUrl : null);
      if (url == null || url.isEmpty) {
        throw Exception('No download URL provided for this OS');
      }

      final tempDir = await getTemporaryDirectory();
      final uri = Uri.parse(url);
      final filename = uri.pathSegments.last;
      final downloadPath = p.join(tempDir.path, filename);

      final client = http.Client();
      final request = http.Request('GET', uri);
      final response = await client.send(request);

      if (response.statusCode != 200) {
        throw Exception('Failed to download update: HTTP ${response.statusCode}');
      }

      final contentLength = response.contentLength;
      int downloaded = 0;
      final file = File(downloadPath);
      final sink = file.openWrite();

      await for (final chunk in response.stream) {
        sink.add(chunk);
        downloaded += chunk.length;
        if (contentLength != null && contentLength > 0) {
          onProgress(downloaded / contentLength);
        }
      }
      await sink.flush();
      await sink.close();
      client.close();

      // Ensure backend services are cleanly stopped before replacing binary
      try {
        await ServerService().stopServer();
        await TunnelService().stopTunnel();
      } catch (_) {}

      if (Platform.isMacOS) {
        await _applyMacUpdate(downloadPath);
      } else if (Platform.isWindows) {
        await _applyWindowsUpdate(downloadPath);
      } else {
        throw Exception('Unsupported platform for auto-update');
      }
    } catch (e) {
      _isUpdating = false;
      onError(e.toString());
    }
  }

  Future<void> _applyMacUpdate(String downloadPath) async {
    final tempDir = await getTemporaryDirectory();
    final myPid = pid;
    final scriptContent = '''#!/bin/bash
exec > /tmp/lanpad_update.log 2>&1
while kill -0 $myPid 2>/dev/null; do
    sleep 0.5
done
mkdir -p /tmp/LANpad_Mount_Update
hdiutil attach "$downloadPath" -mountpoint /tmp/LANpad_Mount_Update -nobrowse -quiet
if [ -d "/tmp/LANpad_Mount_Update/LANpad.app" ]; then
    rm -rf /Applications/LANpad.app
    cp -R /tmp/LANpad_Mount_Update/LANpad.app /Applications/
    hdiutil detach /tmp/LANpad_Mount_Update -quiet
    xattr -cr /Applications/LANpad.app 2>/dev/null
    open /Applications/LANpad.app
fi
rm -rf /tmp/LANpad_Mount_Update
rm -f "$downloadPath"
''';

    final scriptPath = p.join(tempDir.path, 'lanpad_update.sh');
    final scriptFile = File(scriptPath);
    await scriptFile.writeAsString(scriptContent);

    // Make executable
    await Process.run('chmod', ['755', scriptPath]);

    // Launch background script and exit current process
    await Process.start('bash', [scriptPath], mode: ProcessStartMode.detached);
    exit(0);
  }

  Future<void> _applyWindowsUpdate(String downloadPath) async {
    final tempDir = await getTemporaryDirectory();
    final installDir = p.join(Platform.environment['LOCALAPPDATA'] ?? '', 'LANpad');
    final targetExe = p.join(installDir, 'LANpad.exe');

    final scriptContent = '''@echo off
taskkill /F /IM LANpad.exe >nul 2>&1
timeout /t 2 /nobreak >nul
copy /Y "$downloadPath" "$targetExe" >nul 2>&1
if errorlevel 1 (
    if not exist "$installDir" mkdir "$installDir"
    copy /Y "$downloadPath" "$installDir\\LANpad.exe" >nul 2>&1
    start "" "$installDir\\LANpad.exe"
) else (
    start "" "$targetExe"
)
del "%~f0"
''';

    final scriptPath = p.join(tempDir.path, 'lanpad_update.bat');
    final scriptFile = File(scriptPath);
    await scriptFile.writeAsString(scriptContent);

    await Process.start('cmd', ['/c', scriptPath], mode: ProcessStartMode.detached);
    exit(0);
  }
}
