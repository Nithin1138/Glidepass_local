import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'notification_service.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  Function(String)? _onFilesChanged;

  bool get isConnected => _isConnected;

  void connect(String baseUrl, String sid, {required Function(String) onFilesChanged}) {
    if (_isConnected) disconnect();
    
    _onFilesChanged = onFilesChanged;
    
    // Normalize base URL to ws:// or wss://
    var wsUrl = baseUrl.replaceFirst('http://', 'ws://').replaceFirst('https://', 'wss://');
    wsUrl = '$wsUrl/ws/connect?sid=$sid&client=desktop';

    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _isConnected = true;
      
      _channel!.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onDone: () {
          _isConnected = false;
          debugPrint('WebSocket closed');
        },
        onError: (error) {
          _isConnected = false;
          debugPrint('WebSocket error: $error');
        },
      );
    } catch (e) {
      _isConnected = false;
      debugPrint('Failed to connect to WebSocket: $e');
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message.toString());
      if (data['event'] == 'files_changed') {
        if (_onFilesChanged != null) {
          _onFilesChanged!('files_changed');
        }
        NotificationService().showFileReceivedNotification();
      } else if (data['event'] == 'paste_received') {
        final preview = data['preview']?.toString() ?? '';
        NotificationService().showPasteReceivedNotification(preview);
      }
    } catch (e) {
      debugPrint('Error handling WebSocket message: $e');
    }
  }

  void disconnect() {
    try {
      _channel?.sink.close();
    } catch (e) {
      debugPrint('Error closing WebSocket: $e');
    }
    _channel = null;
    _isConnected = false;
  }
}
