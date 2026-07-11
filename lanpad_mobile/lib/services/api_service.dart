import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'connection_service.dart';
import '../models/history_model.dart';
import '../models/file_model.dart';
import '../models/resource_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final ConnectionService _connectionService = ConnectionService();

  String _buildUrl(String path, [Map<String, String>? queryParams]) {
    final baseUrl = _connectionService.serverUrl;
    if (baseUrl == null) throw Exception('No server connected');

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
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': text,
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
    final url = _buildUrl('/get_clipboard');
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'status': 'error', 'message': 'Failed to fetch clipboard'};
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendCopyCommand() async {
    final url = _buildUrl('/copy');
    try {
      final response = await http.get(Uri.parse(url));
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
      await http.get(Uri.parse(url));
    } catch (e) {
      debugPrint('Failed to stop pasting: $e');
    }
  }

  Future<List<HistoryItem>> fetchHistory() async {
    final url = _buildUrl('/history');
    try {
      final response = await http.get(Uri.parse(url));
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
      final response = await http.get(Uri.parse(url));
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
      final response = await http.get(Uri.parse(url));
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
      final response = await http.get(Uri.parse(url));
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

  Future<bool> sendResource(String resourceId) async {
    final url = _buildUrl('/api/resources/$resourceId');
    try {
      final response = await http.post(
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
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': text,
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

  Future<List<SharedFile>> fetchFiles() async {
    final url = _buildUrl('/api/files/list');
    try {
      final response = await http.get(Uri.parse(url));
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

  Future<bool> deleteFile(String filename) async {
    final url = _buildUrl('/api/files/delete/${Uri.encodeComponent(filename)}');
    try {
      final response = await http.delete(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
    } catch (e) {
      debugPrint('Failed to delete file: $e');
    }
    return false;
  }

  Future<Map<String, dynamic>> checkFeatureLimits() async {
    final url = _buildUrl('/limits');
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Failed to check feature limits: $e');
    }
    return {'status': 'error'};
  }

  Future<http.StreamedResponse> uploadFileDirect({
    required File file,
    required String filename,
    required String mode,
    required Function(int sent, int total) onProgress,
  }) async {
    final baseUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId ?? '';
    final encodedFilename = Uri.encodeComponent(filename);
    final fileLength = await file.length();

    // 1. Call preallocate endpoint to set file size and open file descriptor on server
    final preallocateUrl = '$baseUrl/api/files/preallocate?filename=$encodedFilename&size=$fileLength&mode=$mode&sid=$sid';
    try {
      final preResp = await http.post(Uri.parse(preallocateUrl));
      if (preResp.statusCode != 200) {
        throw Exception('Preallocation failed: Status ${preResp.statusCode}');
      }
    } catch (e) {
      throw Exception('Preallocation request failed: $e');
    }

    final url = '$baseUrl/api/files/upload_direct?filename=$encodedFilename&offset=0&mode=$mode&sid=$sid';

    final request = http.StreamedRequest('POST', Uri.parse(url));
    request.headers['Content-Type'] = 'application/octet-stream';
    request.headers['Content-Length'] = fileLength.toString();

    final fileStream = file.openRead();
    int byteCount = 0;

    fileStream.listen(
      (data) {
        byteCount += data.length;
        request.sink.add(data);
        onProgress(byteCount, fileLength);
      },
      onDone: () => request.sink.close(),
      onError: (e) => request.sink.addError(e),
      cancelOnError: true,
    );

    return await http.Client().send(request);
  }
}
