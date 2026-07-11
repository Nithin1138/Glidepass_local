import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

class ConnectionService extends ChangeNotifier {
  static final ConnectionService _instance = ConnectionService._internal();
  factory ConnectionService() => _instance;
  ConnectionService._internal();

  String? _serverUrl;
  String? _sessionId;
  bool _isConnected = false;
  bool _isConnecting = false;
  String? _tunnelUrl;
  String? _lanIp;

  String? get serverUrl => _serverUrl;
  String? get sessionId => _sessionId;
  bool get isConnected => _isConnected;
  bool get isConnecting => _isConnecting;
  String? get tunnelUrl => _tunnelUrl;
  String? get lanIp => _lanIp;

  bool get isLocalConnection {
    if (_serverUrl == null) return false;
    final uri = Uri.tryParse(_serverUrl!);
    if (uri == null) return false;
    final host = uri.host;
    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.');
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _serverUrl = prefs.getString(AppConstants.keyServerUrl);
    _sessionId = prefs.getString(AppConstants.keySessionId);
    
    if (_serverUrl != null && _sessionId != null) {
      // Try to auto-connect / verify
      await checkConnection();
    }
  }

  Future<bool> connect(String url, String sid) async {
    _isConnecting = true;
    notifyListeners();
    
    // Normalize URL
    var targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'http://$targetUrl';
    }
    // Remove trailing slash if present
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.substring(0, targetUrl.length - 1);
    }

    try {
      final response = await http.get(
        Uri.parse('$targetUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          _serverUrl = targetUrl;
          _sessionId = sid;
          _isConnected = true;
          _tunnelUrl = data['tunnel_url'];
          _lanIp = data['lan_ip'];
          
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.keyServerUrl, targetUrl);
          await prefs.setString(AppConstants.keySessionId, sid);
          
          _isConnecting = false;
          notifyListeners();
          return true;
        }
      }
    } catch (e) {
      debugPrint('Failed to connect to $targetUrl: $e');
    }
    
    _isConnecting = false;
    notifyListeners();
    return false;
  }

  Future<void> disconnect() async {
    _serverUrl = null;
    _sessionId = null;
    _isConnected = false;
    _tunnelUrl = null;
    _lanIp = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyServerUrl);
    await prefs.remove(AppConstants.keySessionId);
    
    notifyListeners();
  }

  Future<bool> checkConnection() async {
    if (_serverUrl == null) return false;
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          _isConnected = true;
          _tunnelUrl = data['tunnel_url'];
          _lanIp = data['lan_ip'];
          notifyListeners();
          return true;
        }
      }
    } catch (e) {
      debugPrint('Connection check failed: $e');
    }
    _isConnected = false;
    notifyListeners();
    return false;
  }

  Future<bool> switchConnection() async {
    if (!_isConnected) return false;
    
    String? targetUrl;
    if (isLocalConnection) {
      // Switch to Tunnel URL
      if (_tunnelUrl != null && _tunnelUrl!.isNotEmpty) {
        targetUrl = _tunnelUrl;
      }
    } else {
      // Switch to LAN Direct URL
      if (_lanIp != null && _lanIp!.isNotEmpty) {
        targetUrl = 'http://$_lanIp:8000';
      }
    }

    if (targetUrl != null && _sessionId != null) {
      return await connect(targetUrl, _sessionId!);
    }
    return false;
  }
}
