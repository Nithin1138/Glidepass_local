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
  List<Map<String, String>> _devices = [];

  String? get serverUrl => _serverUrl;
  String? get sessionId => _sessionId;
  bool get isConnected => _isConnected;
  bool get isConnecting => _isConnecting;
  String? get tunnelUrl => _tunnelUrl;
  String? get lanIp => _lanIp;
  List<Map<String, String>> get devices => _devices;

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
    _tunnelUrl = prefs.getString(AppConstants.keyTunnelUrl);
    _lanIp = prefs.getString(AppConstants.keyLanIp);
    
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
          await prefs.setString(AppConstants.keyTunnelUrl, _tunnelUrl ?? '');
          await prefs.setString(AppConstants.keyLanIp, _lanIp ?? '');
          
          // Automatically register device in the list
          String name = 'Device ${_devices.length + 1}';
          final parsedUri = Uri.tryParse(targetUrl);
          if (parsedUri != null) {
            name = parsedUri.host;
            if (name == '127.0.0.1' || name == 'localhost') {
              name = 'Local Laptop';
            } else if (name.startsWith('192.168.')) {
              name = 'Laptop (${name.split('.').last})';
            }
          }
          final existingIndex = _devices.indexWhere((d) => d['url'] == targetUrl);
          if (existingIndex != -1) {
            _devices[existingIndex]['sid'] = sid;
          } else {
            _devices.add({
              'url': targetUrl,
              'sid': sid,
              'name': name,
            });
          }
          await prefs.setString('devices_list', jsonEncode(_devices));
          
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
    await prefs.remove(AppConstants.keyTunnelUrl);
    await prefs.remove(AppConstants.keyLanIp);
    
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
          
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.keyTunnelUrl, _tunnelUrl ?? '');
          await prefs.setString(AppConstants.keyLanIp, _lanIp ?? '');
          
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
    if (!_isConnected || _sessionId == null) {
      debugPrint('[Switch] Cannot switch: not connected or no session ID');
      return false;
    }

    String? targetUrl;

    if (isLocalConnection) {
      // Currently on LAN → switch to Tunnel (relay)
      if (_tunnelUrl != null && _tunnelUrl!.isNotEmpty) {
        targetUrl = _tunnelUrl;
        debugPrint('[Switch] LAN → Relay (direct): $targetUrl');
      } else {
        // Fallback: search devices list for any remote Cloudflare or public tunnel URL
        final remoteDevice = _devices.firstWhere(
          (d) {
            final url = d['url'] ?? '';
            return url.contains('.trycloudflare.com') || url.contains('lanpad.app') || url.contains('.locallink');
          },
          orElse: () => {},
        );
        if (remoteDevice.isNotEmpty) {
          targetUrl = remoteDevice['url'];
          debugPrint('[Switch] LAN → Relay (from devices list): $targetUrl');
        }
      }
    } else {
      // Currently on Relay → switch to LAN Direct
      // Try to find any LAN device URL from the devices list
      final lanDevice = _devices.firstWhere(
        (d) {
          final uri = Uri.tryParse(d['url'] ?? '');
          if (uri == null) return false;
          final h = uri.host;
          return h == 'localhost' || h == '127.0.0.1' ||
              h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.');
        },
        orElse: () => {},
      );

      if (lanDevice.isNotEmpty) {
        targetUrl = lanDevice['url'];
        debugPrint('[Switch] Relay → LAN (from devices list): $targetUrl');
      } else if (_lanIp != null && _lanIp!.isNotEmpty) {
        // Fallback: construct from lanIp.
        // Try to check if the user had a previous LAN URL's port, default to 8000
        targetUrl = 'http://$_lanIp:8000';
        debugPrint('[Switch] Relay → LAN (constructed fallback): $targetUrl');
      }
    }

    if (targetUrl != null) {
      debugPrint('[Switch] Connecting to switch target: $targetUrl');
      final success = await connect(targetUrl, _sessionId!);
      debugPrint('[Switch] Switch connection result: $success');
      return success;
    }

    debugPrint('[Switch] Switch failed: No target URL found');
    return false;
  }

  Future<bool> selectDevice(int index) async {
    if (index < 0 || index >= _devices.length) return false;
    final device = _devices[index];
    final url = device['url']!;
    final sid = device['sid']!;
    return await connect(url, sid);
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
