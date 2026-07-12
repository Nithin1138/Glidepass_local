import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'http_client.dart';
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
  String? _connectedDeviceName;
  List<Map<String, String>> _devices = [];
  String? lastSwitchError;

  String? get serverUrl => _serverUrl;
  String? get sessionId => _sessionId;
  bool get isConnected => _isConnected;
  bool get isConnecting => _isConnecting;
  String? get tunnelUrl => _tunnelUrl;
  String? get lanIp => _lanIp;
  String? get connectedDeviceName => _connectedDeviceName;
  List<Map<String, String>> get devices => _devices;

  bool get isLocalConnection {
    if (_serverUrl == null) return false;
    if (_tunnelUrl == null || _tunnelUrl!.trim().isEmpty) {
      final uri = Uri.tryParse(_serverUrl!);
      if (uri == null) return false;
      final host = uri.host;
      return host == 'localhost' ||
          host == '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host.startsWith('172.') ||
          host.endsWith('.local');
    }
    
    String cleanUrl(String url) {
      var u = url.trim().toLowerCase();
      if (u.startsWith('http://')) u = u.substring(7);
      if (u.startsWith('https://')) u = u.substring(8);
      if (u.endsWith('/')) u = u.substring(0, u.length - 1);
      return u;
    }
    
    return cleanUrl(_serverUrl!) != cleanUrl(_tunnelUrl!);
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _serverUrl = prefs.getString(AppConstants.keyServerUrl);
    _sessionId = prefs.getString(AppConstants.keySessionId);
    _tunnelUrl = prefs.getString(AppConstants.keyTunnelUrl);
    _lanIp = prefs.getString(AppConstants.keyLanIp);
    _connectedDeviceName = prefs.getString('connected_device_name');
    
    final String? devicesJson = prefs.getString('devices_list');
    if (devicesJson != null) {
      try {
        final List<dynamic> decoded = jsonDecode(devicesJson);
        _devices = decoded.map((item) => Map<String, String>.from(item)).toList();
      } catch (e) {
        debugPrint('Failed to load devices list: $e');
      }
    }
    
    if (_serverUrl != null && _sessionId != null) {
      // Try to auto-connect / verify
      await checkConnection();
    }
  }

  Future<String?> connect(String url, String sid) async {
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
      final response = await httpClient.get(
        Uri.parse('$targetUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          // Verify session code matches
          final serverCode = data['session_code']?.toString();
          if (serverCode != null && serverCode.isNotEmpty && serverCode.trim().toLowerCase() != sid.trim().toLowerCase()) {
            debugPrint('Connection failed: Session code mismatch.');
            _isConnecting = false;
            notifyListeners();
            return 'Session code mismatch.';
          }

          _serverUrl = targetUrl;
          _sessionId = sid;
          _isConnected = true;
          _tunnelUrl = data['tunnel_url'];
          _lanIp = data['lan_ip'];
          // Use server-provided device name
          final serverDeviceName = data['device_name']?.toString();
          _connectedDeviceName = serverDeviceName?.isNotEmpty == true
              ? serverDeviceName
              : null;

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.keyServerUrl, targetUrl);
          await prefs.setString(AppConstants.keySessionId, sid);
          await prefs.setString(AppConstants.keyTunnelUrl, _tunnelUrl ?? '');
          await prefs.setString(AppConstants.keyLanIp, _lanIp ?? '');
          if (_connectedDeviceName != null) {
            await prefs.setString('connected_device_name', _connectedDeviceName!);
          }

          // Register or update device in the list with the real server name
          final resolvedName = _connectedDeviceName ?? 'Laptop';
          final existingIndex = _devices.indexWhere((d) => d['url'] == targetUrl);
          if (existingIndex != -1) {
            _devices[existingIndex]['sid'] = sid;
            _devices[existingIndex]['name'] = resolvedName;
          } else {
            _devices.add({
              'url': targetUrl,
              'sid': sid,
              'name': resolvedName,
            });
          }
          await prefs.setString('devices_list', jsonEncode(_devices));

          _isConnecting = false;
          notifyListeners();
          return null;
        } else {
          _isConnecting = false;
          notifyListeners();
          return 'Server returned error: ${data['message'] ?? 'Unknown'}';
        }
      } else {
        _isConnecting = false;
        notifyListeners();
        return 'HTTP Error: ${response.statusCode}';
      }
    } catch (e) {
      debugPrint('Failed to connect to $targetUrl: $e');
      _isConnecting = false;
      notifyListeners();
      return e.toString();
    }
  }

  Future<void> disconnect() async {
    _serverUrl = null;
    _sessionId = null;
    _isConnected = false;
    _tunnelUrl = null;
    _lanIp = null;
    _connectedDeviceName = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyServerUrl);
    await prefs.remove(AppConstants.keySessionId);
    await prefs.remove(AppConstants.keyTunnelUrl);
    await prefs.remove(AppConstants.keyLanIp);
    await prefs.remove('connected_device_name');

    notifyListeners();
  }

  Future<bool> checkConnection() async {
    if (_serverUrl == null) return false;
    try {
      final response = await httpClient.get(
        Uri.parse('$_serverUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          _isConnected = true;
          _tunnelUrl = data['tunnel_url'];
          _lanIp = data['lan_ip'];
          final sdn = data['device_name']?.toString();
          if (sdn != null && sdn.isNotEmpty) {
            _connectedDeviceName = sdn;
          }

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.keyTunnelUrl, _tunnelUrl ?? '');
          await prefs.setString(AppConstants.keyLanIp, _lanIp ?? '');
          if (_connectedDeviceName != null) {
            await prefs.setString('connected_device_name', _connectedDeviceName!);
          }

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
    lastSwitchError = null;
    if (!_isConnected || _sessionId == null || _serverUrl == null) {
      lastSwitchError = 'Not currently connected to any device.';
      return false;
    }

    // Always try to fetch the freshest connection info from the current active server
    // before switching. This prevents using stale tunnel URLs if the backend was restarted.
    try {
      final resp = await httpClient.get(
        Uri.parse('$_serverUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 2));
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        if (data['status'] == 'success') {
          _tunnelUrl = data['tunnel_url']?.toString();
          _lanIp = data['lan_ip']?.toString();
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.keyTunnelUrl, _tunnelUrl ?? '');
          await prefs.setString(AppConstants.keyLanIp, _lanIp ?? '');
        }
      }
    } catch (e) {
      debugPrint('[Switch] Pre-switch info refresh failed: $e');
    }

    String? targetUrl;

    if (isLocalConnection) {
      // LAN → try Tunnel
      if (_tunnelUrl != null && _tunnelUrl!.trim().isNotEmpty) {
        targetUrl = _tunnelUrl;
      } else {
        final prefs = await SharedPreferences.getInstance();
        final storedTunnel = prefs.getString(AppConstants.keyTunnelUrl);
        if (storedTunnel != null && storedTunnel.isNotEmpty) {
          targetUrl = storedTunnel;
        }
      }
    } else {
      // Relay → try LAN direct
      if (_lanIp != null && _lanIp!.trim().isNotEmpty) {
        int port = 8000;
        for (final d in _devices) {
          final uri = Uri.tryParse(d['url']?.toString() ?? '');
          if (uri != null) {
            final h = uri.host;
            if (h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.') || h == 'localhost' || h == '127.0.0.1') {
              port = uri.port;
              break;
            }
          }
        }
        targetUrl = 'http://$_lanIp:$port';
      } else {
        final prefs = await SharedPreferences.getInstance();
        final storedLan = prefs.getString(AppConstants.keyLanIp);
        if (storedLan != null && storedLan.isNotEmpty) {
          targetUrl = 'http://$storedLan:8000';
        }
      }
    }

    if (targetUrl == null || targetUrl.trim().isEmpty) {
      if (isLocalConnection) {
        lastSwitchError = 'Relay URL is not available. Please start the Tunnel in the laptop launcher.';
      } else {
        lastSwitchError = 'LAN connection details not found. Connect locally first.';
      }
      return false;
    }

    debugPrint('[Switch] Attempting connect: $targetUrl');
    final errorMsg = await connect(targetUrl!, _sessionId!);
    debugPrint('[Switch] Result: $errorMsg');
    if (errorMsg != null) {
      lastSwitchError = 'Failed to connect to target: $errorMsg';
    }
    return errorMsg == null;
  }

  Future<bool> selectDevice(int index) async {
    if (index < 0 || index >= _devices.length) return false;
    final device = _devices[index];
    final url = device['url']!;
    final sid = device['sid']!;
    final errorMsg = await connect(url, sid);
    return errorMsg == null;
  }

  Future<void> removeDevice(int index) async {
    if (index < 0 || index >= _devices.length) return;
    final device = _devices[index];
    final isActive = _serverUrl == device['url'];
    
    _devices.removeAt(index);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('devices_list', jsonEncode(_devices));
    
    if (isActive) {
      if (_devices.isNotEmpty) {
        await selectDevice(0);
      } else {
        await disconnect();
      }
    } else {
      notifyListeners();
    }
  }
}
