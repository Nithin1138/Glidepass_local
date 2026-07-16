import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'http_client.dart';
import 'connection_service.dart';
import '../models/history_model.dart';
import '../models/file_model.dart';
import '../models/resource_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final ConnectionService _connectionService = ConnectionService();

  bool encryptionEnabled = false;

  String _encryptXor(String plaintext, String key) {
    if (key.isEmpty) return plaintext;
    final plaintextBytes = utf8.encode(plaintext);
    final keyBytes = utf8.encode(key);
    final cipherBytes = List<int>.generate(plaintextBytes.length, (i) {
      return plaintextBytes[i] ^ keyBytes[i % keyBytes.length];
    });
    return base64.encode(cipherBytes);
  }

  String _decryptXor(String ciphertext, String key) {
    if (key.isEmpty || ciphertext.isEmpty) return ciphertext;
    try {
      final cipherBytes = base64.decode(ciphertext);
      final keyBytes = utf8.encode(key);
      final plaintextBytes = List<int>.generate(cipherBytes.length, (i) {
        return cipherBytes[i] ^ keyBytes[i % keyBytes.length];
      });
      return utf8.decode(plaintextBytes);
    } catch (_) {
      return ciphertext;
    }
  }

  String _buildUrl(String path, [Map<String, String>? queryParams]) {
    final baseUrl = _connectionService.serverUrl ?? 'http://127.0.0.1:8000';
    final sid = _connectionService.sessionId ?? '';
    final uri = Uri.parse('$baseUrl$path');
    
    final newParams = Map<String, String>.from(uri.queryParameters);
    newParams['sid'] = sid;
    if (queryParams != null) {
      newParams.addAll(queryParams);
    }
    
    return uri.replace(queryParameters: newParams).toString();
  }

  // --- Paste / Command Center ---
  
  Future<Map<String, dynamic>> sendPaste({
    required String text,
    required String mode,
    required int wpm,
    required bool isCoding,
    String language = '',
  }) async {
    final url = _buildUrl('/paste');
    final sid = _connectionService.sessionId ?? '';
    final payloadText = encryptionEnabled ? _encryptXor(text, sid) : text;

    try {
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': payloadText,
          'encrypted': encryptionEnabled,
          'mode': mode,
          'wpm': wpm,
          'is_coding': isCoding,
          'language': language,
        }),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'status': 'error', 'message': 'HTTP Status ${response.statusCode}'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> fetchClipboard() async {
    final Map<String, String> queryParams = {};
    if (encryptionEnabled) {
      queryParams['encrypted'] = 'true';
    }
    final url = _buildUrl('/get_clipboard', queryParams);
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success' && data['encrypted'] == true) {
          final sid = _connectionService.sessionId ?? '';
          data['text'] = _decryptXor(data['text'] ?? '', sid);
        }
        return data;
      }
      return {'status': 'error', 'message': 'Failed to fetch clipboard'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendCopyCommand() async {
    final url = _buildUrl('/copy');
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'status': 'error', 'message': 'Failed to trigger selection copy'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<void> stopPasting() async {
    final url = _buildUrl('/stop');
    try {
      await httpClient.get(Uri.parse(url));
    } catch (e) {
      debugPrint('Failed to stop pasting: $e');
    }
  }

  Future<List<HistoryItem>> fetchHistory() async {
    final url = _buildUrl('/history');
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success' && data['history'] != null) {
          final list = data['history'] as List;
          return list.map((item) => HistoryItem.fromJson(item)).toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch history: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> checkTypingStatus() async {
    final url = _buildUrl('/typing_status');
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to check typing status: $e');
    }
    return {'is_typing': false};
  }

  // --- Resource Catalog ---

  Future<List<Hub>> fetchHubs() async {
    final url = _buildUrl('/api/hubs');
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['hubs'] != null) {
          final list = data['hubs'] as List;
          return list
              .map((h) => Hub.fromJson(h))
              .where((h) => h.visibility != 'private')
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch hubs: $e');
    }
    return [];
  }

  Future<List<ResourceSnippet>> fetchResources(String hubId) async {
    final url = _buildUrl('/api/resources', {'hubId': hubId});
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['resources'] != null) {
          final list = data['resources'] as List;
          return list.map((r) => ResourceSnippet.fromJson(r)).toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch resources: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> setSetting(String key, dynamic value) async {
    final url = _buildUrl('/api/settings');
    try {
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'key': key, 'value': value}),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'status': 'error', 'message': 'Failed to save setting'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> fetchUploadProgress() async {
    final url = _buildUrl('/api/benchmark/upload_progress');
    try {
      final response = await httpClient.get(Uri.parse(url)).timeout(const Duration(milliseconds: 500));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'status': 'error', 'message': 'HTTP ${response.statusCode}'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<void> sendTelemetry(String event) async {
    final url = _buildUrl('/api/telemetry/event');
    try {
      await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'event': event}),
      );
    } catch (e) {
      debugPrint('Failed to send telemetry: $e');
    }
  }

  Future<bool> sendResource(String resourceId) async {
    final url = _buildUrl('/api/resources/$resourceId');
    try {
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
    } catch (e) {
      debugPrint('Failed to send resource metric: $e');
    }
    return false;
  }

  Future<bool> receiveResource(String text, String title) async {
    final url = _buildUrl('/receive_resource');
    try {
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'content': text,
          'title': title,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
    } catch (e) {
      debugPrint('Failed to receive resource: $e');
    }
    return false;
  }

  // --- File Sharing ---

  Future<List<SharedFile>> fetchFiles({bool showAll = false}) async {
    final url = _buildUrl('/api/files/list', {'show_all': showAll ? 'true' : 'false'});
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success' && data['files'] != null) {
          final list = data['files'] as List;
          return list.map((f) => SharedFile.fromJson(f)).toList();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch files: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> fetchStorageHealth() async {
    try {
      final res = await http.get(Uri.parse(_buildUrl('/api/system/storage'))).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      return {};
    } catch (e) {
      debugPrint('[ApiService] fetchStorageHealth error: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> cleanCache() async {
    try {
      final res = await http.post(Uri.parse(_buildUrl('/api/system/clean_cache'))).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      return {};
    } catch (e) {
      debugPrint('[ApiService] cleanCache error: $e');
      return {};
    }
  }

  Future<String> fetchFileTextPreview(String filename) async {
    try {
      final url = _buildUrl('/api/files/preview_text/${Uri.encodeComponent(filename)}');
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 'success') {
          return data['content'] ?? '';
        }
      }
      return 'Failed to load preview.';
    } catch (e) {
      debugPrint('[ApiService] fetchFileTextPreview error: $e');
      return 'Error loading preview: $e';
    }
  }

  Future<int> fetchPdfInfo(String filename) async {
    try {
      final url = _buildUrl('/api/files/pdf_info/${Uri.encodeComponent(filename)}');
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 'success') {
          return data['page_count'] ?? 0;
        }
      }
      return 0;
    } catch (e) {
      debugPrint('[ApiService] fetchPdfInfo error: $e');
      return 0;
    }
  }

  Future<bool> deleteFile(String filename) async {
    final url = _buildUrl('/api/files/delete/${Uri.encodeComponent(filename)}');
    try {
      final response = await httpClient.delete(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
    } catch (e) {
      debugPrint('Failed to delete file: $e');
    }
    return false;
  }

  Future<bool> shareFile(String filename) async {
    final url = _buildUrl('/api/files/share/${Uri.encodeComponent(filename)}');
    try {
      final response = await httpClient.post(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
    } catch (e) {
      debugPrint('Failed to share file: $e');
    }
    return false;
  }

  Future<Map<String, dynamic>> checkFeatureLimits() async {
    final url = _buildUrl('/limits');
    try {
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to check feature limits: $e');
    }
    return {'status': 'error'};
  }

  Future<bool> disconnectDevice(String deviceName) async {
    final url = _buildUrl('/api/connections/disconnect');
    try {
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'device_name': deviceName}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
    } catch (e) {
      debugPrint('Failed to disconnect device $deviceName: $e');
    }
    return false;
  }

  Future<http.StreamedResponse> uploadFileDirect({
    required File file,
    required String filename,
    required String mode,
    String? uploader,
    required Function(int sent, int total) onProgress,
  }) async {
    final baseUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId ?? '';
    var url = '$baseUrl/api/files/upload?mode=$mode&sid=$sid';
    if (uploader != null) {
      url += '&uploader=${Uri.encodeComponent(uploader)}';
    }

    final request = MultipartRequestWithProgress(
      'POST',
      Uri.parse(url),
      onProgress: onProgress,
    );

    request.files.add(await http.MultipartFile.fromPath(
      'file',
      file.path,
      filename: filename,
    ));

    return await BypassTunnelClient().send(request);
  }

  Future<Map<String, dynamic>> fetchLicenseStatus({bool force = false}) async {
    if (_connectionService.serverUrl == null) {
      return {'status': 'error', 'message': 'No server connected'};
    }
    try {
      final url = _buildUrl('/api/license/status', force ? {'force': 'true'} : null);
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to fetch license status: $e');
    }
    return {'status': 'error', 'message': 'Connection error'};
  }

  Future<Map<String, dynamic>> activateLicenseKey(String key) async {
    // 1. Get HWID via python3
    String hwid = '';
    try {
      String pythonExecutable = 'python3';
      if (Platform.isWindows) {
        pythonExecutable = 'python';
      }
      // Assuming platform_utils.py is available in the current working directory of the process
      final result = await Process.run(pythonExecutable, ['-c', 'from platform_utils import get_hardware_id; print(get_hardware_id())']);
      hwid = result.stdout.toString().trim();
    } catch (e) {
      debugPrint('Failed to get HWID: $e');
    }

    // 2. Fetch remotely
    try {
      final url = 'https://lanpad.app/api/monetization/verify';
      final response = await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'key': key, 'hwid': hwid}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final res = jsonDecode(response.body);
        if (res['valid'] == true) {
          // Write to ~/.lanpad_license.json
          String homeDir = Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'] ?? '';
          final file = File('$homeDir/.lanpad_license.json');
          await file.writeAsString(jsonEncode({
            "key": key,
            "tier": res['tier'] ?? 'Basic',
            "expires_at": res['expires_at'] ?? '2099-12-31T23:59:59Z',
            "hwid": hwid,
            "last_checked": DateTime.now().millisecondsSinceEpoch / 1000,
          }));
          return {'status': 'success', 'message': 'Activated successfully'};
        } else {
          return {'status': 'error', 'message': res['error'] ?? 'Invalid activation key'};
        }
      }
    } catch (e) {
      debugPrint('Failed to activate license remotely: $e');
    }
    return {'status': 'error', 'message': 'Connection error'};
  }

  Future<Map<String, dynamic>> fetchAdminStatus({bool force = false}) async {
    if (_connectionService.serverUrl == null) {
      return {'status': 'error', 'message': 'No server connected'};
    }
    try {
      final url = _buildUrl('/api/admin/status', force ? {'force': 'true'} : null);
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to fetch admin status: $e');
    }
    return {'status': 'error', 'message': 'Connection error'};
  }

  Future<Map<String, dynamic>> checkForUpdates() async {
    if (_connectionService.serverUrl == null) {
      return {'status': 'error', 'update_available': false, 'message': 'No server connected'};
    }
    try {
      final url = _buildUrl('/api/update/check');
      final response = await httpClient.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to check for updates: $e');
    }
    return {'status': 'error', 'update_available': false};
  }

  Future<void> logTelemetryEvent(String event) async {
    if (_connectionService.serverUrl == null) return;
    try {
      final url = _buildUrl('/api/telemetry/event');
      await httpClient.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'event': event}),
      );
    } catch (e) {
      debugPrint('Failed to log telemetry event: $e');
    }
  }
}

class MultipartRequestWithProgress extends http.MultipartRequest {
  final Function(int, int) onProgress;

  MultipartRequestWithProgress(
    String method,
    Uri url, {
    required this.onProgress,
  }) : super(method, url);

  @override
  http.ByteStream finalize() {
    final byteStream = super.finalize();
    final totalLength = contentLength;
    int bytesSent = 0;

    return http.ByteStream(byteStream.map((chunk) {
      bytesSent += chunk.length;
      onProgress(bytesSent, totalLength);
      return chunk;
    }));
  }
}
