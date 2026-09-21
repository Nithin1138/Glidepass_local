import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:window_manager/window_manager.dart';
import '../desktop_state.dart';

class RemoteControlView extends StatefulWidget {
  final DesktopState state;
  final String? initialTargetUrl;
  final String? initialToken;

  const RemoteControlView({
    super.key,
    required this.state,
    this.initialTargetUrl,
    this.initialToken,
  });

  @override
  State<RemoteControlView> createState() => _RemoteControlViewState();
}

class _RemoteControlViewState extends State<RemoteControlView> {
  String _targetUrl = '';
  String _sessionToken = '';
  bool _isConnected = false;
  bool _isConnecting = false;
  String _targetDeviceName = 'Remote Workstation';

  int _currentStep = 1; // 1: Select Workstation Device, 2: Enter Pairing PIN
  bool _isVerifyingPin = false;
  String? _connectionError;

  // Stream state
  Uint8List? _currentFrame;
  bool _isFetchingFrame = false;
  Timer? _streamTimer;
  int _refreshIntervalMs = 200; // 5 FPS default
  int _remoteScreenWidth = 1920;
  int _remoteScreenHeight = 1080;
  int _lastLatencyMs = 0;
  int _fpsCounter = 0;
  int _displayFps = 0;
  Timer? _fpsTimer;

  // Viewport & Zoom
  String _zoomMode = 'fit'; // 'fit', 'fill'
  bool _isFullscreen = false;
  bool _showVirtualKeyboard = false;
  bool _directKeyboardEnabled = true;

  // Manual connect controllers
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();
  final FocusNode _screenFocusNode = FocusNode();

  // Mouse throttle
  DateTime _lastMoveSent = DateTime.now();
  DateTime _lastClickTime = DateTime.now();

  @override
  void initState() {
    super.initState();

    // Check if valid remote workstation was passed
    if (widget.initialTargetUrl != null && widget.initialTargetUrl!.isNotEmpty) {
      final clean = widget.initialTargetUrl!.trim();
      if (!_isSelfConnection(clean)) {
        _targetUrl = clean;
        _sessionToken = widget.initialToken ?? '';
        _targetDeviceName = 'Remote Workstation';
        _currentStep = _sessionToken.isNotEmpty ? 2 : 1;
      }
    } else if (widget.state.connectedRemoteHubs.isNotEmpty) {
      // Pick first remote hub that is NOT self
      final validHubs = widget.state.connectedRemoteHubs.where((h) {
        final u = (h['url'] ?? '').toString();
        return !_isSelfConnection(u);
      }).toList();

      if (validHubs.isNotEmpty) {
        final hub = validHubs.first;
        _targetUrl = hub['url'] ?? '';
        _sessionToken = hub['token'] ?? '';
        _targetDeviceName = hub['name'] ?? 'Remote Workstation';
      }
    }

    _urlController.text = _targetUrl;
    _codeController.text = _sessionToken;

    // NOTE: Never auto-connect on init. Connections require explicit 2-step verification.

    _fpsTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _displayFps = _fpsCounter;
          _fpsCounter = 0;
        });
      }
    });
  }

  @override
  void dispose() {
    _streamTimer?.cancel();
    _fpsTimer?.cancel();
    _urlController.dispose();
    _codeController.dispose();
    _screenFocusNode.dispose();
    super.dispose();
  }

  bool _isSelfConnection(String url) {
    final lower = url.trim().toLowerCase();
    if (lower.isEmpty) return false;
    if (lower.contains('127.0.0.1') || lower.contains('localhost')) return true;
    final localIp = widget.state.localIp.trim().toLowerCase();
    if (localIp.isNotEmpty && lower.contains(localIp)) return true;
    return false;
  }

  void _disconnectSession() {
    _streamTimer?.cancel();
    _streamTimer = null;
    if (mounted) {
      setState(() {
        _isConnected = false;
        _isConnecting = false;
        _isVerifyingPin = false;
        _currentFrame = null;
        _fpsCounter = 0;
        _displayFps = 0;
        _currentStep = 1;
        _connectionError = null;
      });
      widget.state.onShowToast('Disconnected from remote workstation');
    }
  }

  Future<void> _verifyPinAndConnect() async {
    final pin = _codeController.text.trim();
    if (pin.isEmpty) {
      setState(() => _connectionError = 'Please enter the 6-character session PIN.');
      return;
    }

    if (_targetUrl.isEmpty) {
      setState(() => _currentStep = 1);
      return;
    }

    var cleanUrl = _targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://$cleanUrl';
    }
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }

    if (_isSelfConnection(cleanUrl)) {
      setState(() {
        _connectionError = 'Self-connection blocked: You cannot remote control this same computer (mirror loop).';
        _currentStep = 1;
      });
      return;
    }

    setState(() {
      _isVerifyingPin = true;
      _connectionError = null;
    });

    try {
      bool pinValid = false;
      try {
        final verifyRes = await http.post(
          Uri.parse('$cleanUrl/api/device/verify_code'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'code': pin}),
        ).timeout(const Duration(seconds: 4));

        if (verifyRes.statusCode == 200) {
          pinValid = true;
        } else if (verifyRes.statusCode == 401) {
          if (mounted) {
            setState(() {
              _isVerifyingPin = false;
              _connectionError = 'Incorrect PIN code. Please check the 6-character code on the remote device.';
            });
          }
          return;
        }
      } catch (_) {
        // Fallback for older host builds: verify by testing screen_meta endpoint with pin as sid
        try {
          final testRes = await http.get(
            Uri.parse('$cleanUrl/api/device/screen_meta?sid=$pin'),
          ).timeout(const Duration(seconds: 4));
          if (testRes.statusCode == 200) {
            pinValid = true;
          }
        } catch (_) {}
      }

      if (!pinValid) {
        if (mounted) {
          setState(() {
            _isVerifyingPin = false;
            _connectionError = 'Could not verify PIN with remote workstation. Please check IP address and PIN.';
          });
        }
        return;
      }

      _sessionToken = pin;
      _targetUrl = cleanUrl;
      _isVerifyingPin = false;
      _startConnection();
    } catch (e) {
      if (mounted) {
        setState(() {
          _isVerifyingPin = false;
          _connectionError = 'Connection failed: $e';
        });
      }
    }
  }

  void _startConnection() {
    if (_targetUrl.isEmpty) return;
    var cleanUrl = _targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://$cleanUrl';
    }
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }

    if (_isSelfConnection(cleanUrl)) {
      setState(() {
        _connectionError = 'Self-connection blocked: You cannot remote control this same machine.';
        _isConnecting = false;
        _isConnected = false;
        _currentStep = 1;
      });
      return;
    }

    setState(() {
      _targetUrl = cleanUrl;
      _isConnecting = true;
      _connectionError = null;
    });

    _fetchScreenMeta().then((_) {
      if (mounted) {
        setState(() {
          _isConnected = true;
          _isConnecting = false;
        });
        _scheduleNextFrame();
        _screenFocusNode.requestFocus();
      }
    }).catchError((e) {
      if (mounted) {
        setState(() {
          _isConnecting = false;
          _isConnected = false;
          _connectionError = 'Connection failed: $e';
        });
        widget.state.onShowToast('Connection failed: $e', isError: true);
      }
    });
  }

  Future<void> _fetchScreenMeta() async {
    final start = DateTime.now();
    try {
      final res = await http.get(
        Uri.parse('$_targetUrl/api/device/screen_meta?sid=$_sessionToken'),
      ).timeout(const Duration(seconds: 4));
      _lastLatencyMs = DateTime.now().difference(start).inMilliseconds;
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 'success') {
          _remoteScreenWidth = data['width'] ?? 1920;
          _remoteScreenHeight = data['height'] ?? 1080;
          if (data['title'] != null && data['title'].toString().isNotEmpty) {
            _targetDeviceName = data['title'];
          }
        }
      }
    } catch (_) {}
  }

  void _scheduleNextFrame() {
    _streamTimer?.cancel();
    if (!_isConnected || _refreshIntervalMs <= 0) return;

    _streamTimer = Timer(Duration(milliseconds: _refreshIntervalMs), () async {
      if (!mounted || !_isConnected) return;
      await _fetchLatestFrame();
      _scheduleNextFrame();
    });
  }

  Future<void> _fetchLatestFrame() async {
    if (_isFetchingFrame) return;
    _isFetchingFrame = true;
    final start = DateTime.now();
    try {
      final res = await http.get(
        Uri.parse('$_targetUrl/api/device/screen?t=${DateTime.now().millisecondsSinceEpoch}&sid=$_sessionToken'),
      ).timeout(const Duration(seconds: 3));

      if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
        if (mounted) {
          setState(() {
            _currentFrame = res.bodyBytes;
            _lastLatencyMs = DateTime.now().difference(start).inMilliseconds;
            _fpsCounter++;
          });
        }
      }
    } catch (_) {} finally {
      _isFetchingFrame = false;
    }
  }

  // ── Mouse & Pointer Event Handling ─────────────────────────────────────────

  void _handlePointerHover(PointerHoverEvent event, Size renderSize) {
    if (!_isConnected) return;
    final now = DateTime.now();
    if (now.difference(_lastMoveSent).inMilliseconds < 45) return;
    _lastMoveSent = now;

    final coords = _translateCoordinates(event.localPosition, renderSize);
    if (coords == null) return;
    _sendMouseAction('move', coords.dx, coords.dy);
  }

  void _handlePointerDown(PointerDownEvent event, Size renderSize) {
    _screenFocusNode.requestFocus();
    if (!_isConnected) return;

    final coords = _translateCoordinates(event.localPosition, renderSize);
    if (coords == null) return;

    final isRightClick = event.buttons == kSecondaryMouseButton;
    if (isRightClick) {
      _sendMouseAction('right_click', coords.dx, coords.dy);
      return;
    }

    final now = DateTime.now();
    final isDouble = now.difference(_lastClickTime).inMilliseconds < 300;
    _lastClickTime = now;

    if (isDouble) {
      _sendMouseAction('double_click', coords.dx, coords.dy);
    } else {
      _sendMouseAction('click', coords.dx, coords.dy);
    }
  }

  void _handlePointerSignal(PointerSignalEvent event, Size renderSize) {
    if (!_isConnected) return;
    if (event is PointerScrollEvent) {
      final coords = _translateCoordinates(event.localPosition, renderSize);
      final deltaY = (event.scrollDelta.dy / 20.0).clamp(-15.0, 15.0);
      final deltaX = (event.scrollDelta.dx / 20.0).clamp(-15.0, 15.0);
      _sendScrollAction(deltaY.round(), deltaX.round(), coords?.dx, coords?.dy);
    }
  }

  Offset? _translateCoordinates(Offset localPos, Size renderSize) {
    if (renderSize.width <= 0 || renderSize.height <= 0) return null;

    final aspectRemote = _remoteScreenWidth / _remoteScreenHeight;
    final aspectRender = renderSize.width / renderSize.height;

    double actualW, actualH, offX, offY;

    if (_zoomMode == 'fill') {
      actualW = renderSize.width;
      actualH = renderSize.height;
      offX = 0;
      offY = 0;
    } else {
      // 'fit' letterbox
      if (aspectRender > aspectRemote) {
        actualH = renderSize.height;
        actualW = actualH * aspectRemote;
        offX = (renderSize.width - actualW) / 2;
        offY = 0;
      } else {
        actualW = renderSize.width;
        actualH = actualW / aspectRemote;
        offX = 0;
        offY = (renderSize.height - actualH) / 2;
      }
    }

    final xWithin = localPos.dx - offX;
    final yWithin = localPos.dy - offY;

    if (xWithin < 0 || xWithin > actualW || yWithin < 0 || yWithin > actualH) {
      return null;
    }

    final xPct = (xWithin / actualW).clamp(0.0, 1.0);
    final yPct = (yWithin / actualH).clamp(0.0, 1.0);
    return Offset(xPct, yPct);
  }

  Future<void> _sendMouseAction(String action, double xPct, double yPct) async {
    try {
      await http.post(
        Uri.parse('$_targetUrl/api/device/mouse_action?sid=$_sessionToken'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': action,
          'x_pct': xPct,
          'y_pct': yPct,
        }),
      );
    } catch (_) {}
  }

  Future<void> _sendScrollAction(int deltaY, int deltaX, double? xPct, double? yPct) async {
    try {
      await http.post(
        Uri.parse('$_targetUrl/api/device/scroll?sid=$_sessionToken'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'delta_y': deltaY,
          'delta_x': deltaX,
          'x_pct': xPct ?? 0.5,
          'y_pct': yPct ?? 0.5,
        }),
      );
    } catch (_) {}
  }

  // ── Keyboard Passthrough ───────────────────────────────────────────────────

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (!_isConnected || !_directKeyboardEnabled) {
      return KeyEventResult.ignored;
    }

    if (event is KeyDownEvent) {
      final keyLabel = _resolveKeyLabel(event.logicalKey);
      if (keyLabel != null) {
        final mods = <String>[];
        if (HardwareKeyboard.instance.isControlPressed) mods.add('ctrl');
        if (HardwareKeyboard.instance.isAltPressed) mods.add('alt');
        if (HardwareKeyboard.instance.isShiftPressed) mods.add('shift');
        if (HardwareKeyboard.instance.isMetaPressed) mods.add('meta');

        _sendKeyEvent(keyLabel, 'keydown', mods);
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  String? _resolveKeyLabel(LogicalKeyboardKey key) {
    if (key == LogicalKeyboardKey.enter) return 'Enter';
    if (key == LogicalKeyboardKey.backspace) return 'Backspace';
    if (key == LogicalKeyboardKey.escape) return 'Escape';
    if (key == LogicalKeyboardKey.tab) return 'Tab';
    if (key == LogicalKeyboardKey.space) return ' ';
    if (key == LogicalKeyboardKey.arrowUp) return 'ArrowUp';
    if (key == LogicalKeyboardKey.arrowDown) return 'ArrowDown';
    if (key == LogicalKeyboardKey.arrowLeft) return 'ArrowLeft';
    if (key == LogicalKeyboardKey.arrowRight) return 'ArrowRight';
    if (key == LogicalKeyboardKey.pageUp) return 'PageUp';
    if (key == LogicalKeyboardKey.pageDown) return 'PageDown';
    if (key == LogicalKeyboardKey.home) return 'Home';
    if (key == LogicalKeyboardKey.end) return 'End';
    if (key == LogicalKeyboardKey.delete) return 'Delete';

    // F keys
    for (int i = 1; i <= 12; i++) {
      if (key.keyId == LogicalKeyboardKey.f1.keyId + i - 1) {
        return 'F$i';
      }
    }

    if (key.keyLabel.isNotEmpty && key.keyLabel.length == 1) {
      return key.keyLabel;
    }
    return null;
  }

  Future<void> _sendKeyEvent(String key, String type, List<String> mods) async {
    try {
      await http.post(
        Uri.parse('$_targetUrl/api/device/key_event?sid=$_sessionToken'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'key': key,
          'type': type,
          'modifiers': mods,
        }),
      );
    } catch (_) {}
  }

  Future<void> _sendSystemAction(String action) async {
    try {
      await http.post(
        Uri.parse('$_targetUrl/api/device/system_action?sid=$_sessionToken'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'action': action}),
      );
      widget.state.onShowToast('Sent action: $action');
    } catch (_) {}
  }

  Future<void> _sendEmergencyHide() async {
    try {
      await http.post(
        Uri.parse('$_targetUrl/api/exam/emergency_hide?sid=$_sessionToken'),
      );
      widget.state.onShowToast('Emergency Ghost Desktop triggered');
    } catch (_) {}
  }

  Future<void> _syncClipboard() async {
    try {
      final res = await http.get(
        Uri.parse('$_targetUrl/api/device/clipboard?sid=$_sessionToken'),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final remoteText = data['text'] ?? '';
        if (remoteText.toString().isNotEmpty) {
          await Clipboard.setData(ClipboardData(text: remoteText));
          widget.state.onShowToast('Remote clipboard copied to local!');
        } else {
          widget.state.onShowToast('Remote clipboard is empty.');
        }
      }
    } catch (e) {
      widget.state.onShowToast('Clipboard sync error: $e', isError: true);
    }
  }

  Future<void> _toggleFullscreen() async {
    final next = !_isFullscreen;
    setState(() => _isFullscreen = next);
    if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
      await windowManager.setFullScreen(next);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF04060A),
      body: Column(
        children: [
          // ── Header Workstation Ribbon ──────────────────────────────────────
          _buildTopRibbon(),

          // ── Main Canvas Viewport ───────────────────────────────────────────
          Expanded(
            child: _isConnected ? _buildInteractiveCanvas() : _buildConnectPrompt(),
          ),

          // ── Virtual Keyboard Ribbon ────────────────────────────────────────
          if (_showVirtualKeyboard && _isConnected) _buildVirtualKeyboardRibbon(),
        ],
      ),
    );
  }

  Widget _buildTopRibbon() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E17),
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: Row(
        children: [
          // Device / Hub pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isConnected ? const Color(0xFF00F59B) : Colors.amberAccent,
                    boxShadow: [
                      if (_isConnected)
                        BoxShadow(color: const Color(0xFF00F59B).withValues(alpha: 0.5), blurRadius: 6),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _isConnected ? _targetDeviceName : 'Remote Screen Gateway',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                if (_isConnected) ...[
                  const SizedBox(width: 8),
                  Text(
                    '${_lastLatencyMs}ms • $_displayFps FPS',
                    style: GoogleFonts.jetBrainsMono(fontSize: 11, color: Colors.white54),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Hub Switcher dropdown if multiple hubs
          if (_isConnected && widget.state.connectedRemoteHubs.length > 1)
            PopupMenuButton<Map<String, dynamic>>(
              icon: const Icon(LucideIcons.arrow_down_up, size: 16, color: Colors.white70),
              tooltip: 'Switch Remote Device',
              onSelected: (hub) {
                final u = hub['url'] ?? '';
                if (!_isSelfConnection(u)) {
                  setState(() {
                    _targetUrl = u;
                    _sessionToken = hub['token'] ?? '';
                    _targetDeviceName = hub['name'] ?? 'Workstation';
                  });
                  _startConnection();
                }
              },
              itemBuilder: (context) => widget.state.connectedRemoteHubs
                  .where((h) => !_isSelfConnection(h['url'] ?? ''))
                  .map((h) {
                return PopupMenuItem(
                  value: h,
                  child: Text(h['name'] ?? h['url']),
                );
              }).toList(),
            ),

          const Spacer(),

          if (_isConnected) ...[
            // FPS / Refresh Interval Selector
            Container(
              height: 32,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                children: [
                  _buildRefreshPill('0.1s', 100),
                  _buildRefreshPill('0.2s', 200),
                  _buildRefreshPill('0.5s', 500),
                  _buildRefreshPill('1.0s', 1000),
                  _buildRefreshPill('Pause', -1),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Zoom Mode toggle
            IconButton(
              icon: Icon(
                _zoomMode == 'fit' ? LucideIcons.minimize_2 : LucideIcons.maximize_2,
                size: 16,
                color: Colors.white70,
              ),
              tooltip: 'Toggle Fit / Fill Scale',
              onPressed: () {
                setState(() {
                  _zoomMode = _zoomMode == 'fit' ? 'fill' : 'fit';
                });
              },
            ),

            // Direct Keyboard toggle
            IconButton(
              icon: Icon(
                LucideIcons.keyboard,
                size: 16,
                color: _directKeyboardEnabled ? const Color(0xFF38BDF8) : Colors.white38,
              ),
              tooltip: _directKeyboardEnabled ? 'Direct Keyboard: ACTIVE' : 'Direct Keyboard: OFF',
              onPressed: () {
                setState(() => _directKeyboardEnabled = !_directKeyboardEnabled);
                widget.state.onShowToast(
                  _directKeyboardEnabled ? 'Direct Keyboard Passthrough Enabled' : 'Direct Keyboard Disabled',
                );
              },
            ),

            // Virtual PC keyboard toggle
            IconButton(
              icon: Icon(
                LucideIcons.layout_grid,
                size: 16,
                color: _showVirtualKeyboard ? const Color(0xFF38BDF8) : Colors.white70,
              ),
              tooltip: 'Show Virtual PC Keyboard (F1-F12, Esc, Modifiers)',
              onPressed: () {
                setState(() => _showVirtualKeyboard = !_showVirtualKeyboard);
              },
            ),

            // Quick Hotkeys Menu
            PopupMenuButton<String>(
              icon: const Icon(LucideIcons.zap, size: 16, color: Colors.amberAccent),
              tooltip: 'System Shortcuts & Actions',
              onSelected: (action) {
                if (action == 'switch_app') _sendSystemAction('switch_app');
                if (action == 'show_desktop') _sendSystemAction('show_desktop');
                if (action == 'lock_screen') _sendSystemAction('lock_screen');
                if (action == 'ghost') _sendEmergencyHide();
                if (action == 'clipboard') _syncClipboard();
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'switch_app', child: Text('🔄 Switch App (Alt+Tab / Cmd+Tab)')),
                const PopupMenuItem(value: 'show_desktop', child: Text('🖥️ Show Desktop (Win+D)')),
                const PopupMenuItem(value: 'clipboard', child: Text('📋 Sync Remote Clipboard')),
                const PopupMenuItem(value: 'lock_screen', child: Text('🔒 Lock Screen')),
                const PopupMenuItem(value: 'ghost', child: Text('👻 Emergency Ghost Desktop')),
              ],
            ),

            // Fullscreen toggle
            IconButton(
              icon: Icon(_isFullscreen ? LucideIcons.shrink : LucideIcons.expand, size: 16, color: Colors.white70),
              tooltip: 'Toggle Fullscreen',
              onPressed: _toggleFullscreen,
            ),

            // Reconnect / Refresh Frame Now
            IconButton(
              icon: const Icon(LucideIcons.refresh_cw, size: 16, color: Colors.white70),
              tooltip: 'Capture Fresh Frame Now',
              onPressed: _fetchLatestFrame,
            ),

            const SizedBox(width: 8),

            // Disconnect button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE11D48),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              ),
              icon: const Icon(LucideIcons.log_out, size: 13),
              label: const Text('Disconnect', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
              onPressed: _disconnectSession,
            ),
          ] else if (_currentStep == 2) ...[
            TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: Colors.white70,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              ),
              icon: const Icon(LucideIcons.arrow_left, size: 14),
              label: const Text('Change Target', style: TextStyle(fontSize: 12)),
              onPressed: () => setState(() {
                _currentStep = 1;
                _connectionError = null;
              }),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRefreshPill(String label, int ms) {
    final active = _refreshIntervalMs == ms;
    return GestureDetector(
      onTap: () {
        setState(() => _refreshIntervalMs = ms);
        _scheduleNextFrame();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF0077C0) : Colors.transparent,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: active ? FontWeight.bold : FontWeight.normal,
            color: active ? Colors.white : Colors.white60,
          ),
        ),
      ),
    );
  }

  Widget _buildInteractiveCanvas() {
    return Focus(
      focusNode: _screenFocusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final renderSize = Size(constraints.maxWidth, constraints.maxHeight);

          return Listener(
            onPointerDown: (e) => _handlePointerDown(e, renderSize),
            onPointerSignal: (e) => _handlePointerSignal(e, renderSize),
            child: MouseRegion(
              cursor: SystemMouseCursors.precise,
              onHover: (e) => _handlePointerHover(e, renderSize),
              child: Center(
                child: _currentFrame != null
                    ? Image.memory(
                        _currentFrame!,
                        gaplessPlayback: true,
                        filterQuality: FilterQuality.medium,
                        fit: _zoomMode == 'fill' ? BoxFit.fill : BoxFit.contain,
                        width: constraints.maxWidth,
                        height: constraints.maxHeight,
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(color: Color(0xFF0077C0)),
                          const SizedBox(height: 16),
                          Text(
                            'Connecting to remote display stream...',
                            style: GoogleFonts.inter(color: Colors.white70, fontSize: 13),
                          ),
                        ],
                      ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildConnectPrompt() {
    final validHubs = widget.state.connectedRemoteHubs.where((h) {
      final u = (h['url'] ?? '').toString();
      return !_isSelfConnection(u);
    }).toList();

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 540),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: const Color(0xFF0B101B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Step Badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.25)),
                    ),
                    child: const Icon(LucideIcons.monitor, color: Color(0xFF38BDF8), size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Remote Screen Gateway',
                              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: (_currentStep == 1 ? const Color(0xFF38BDF8) : const Color(0xFF00F59B)).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: (_currentStep == 1 ? const Color(0xFF38BDF8) : const Color(0xFF00F59B)).withValues(alpha: 0.4),
                                ),
                              ),
                              child: Text(
                                'STEP $_currentStep OF 2',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: _currentStep == 1 ? const Color(0xFF38BDF8) : const Color(0xFF00F59B),
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'UltraViewer / AnyDesk style desktop control with low latency.',
                          style: GoogleFonts.inter(color: Colors.white60, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Step Progress Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Row(
                  children: [
                    _buildStepIndicator(
                      stepNum: 1,
                      label: 'Target Workstation',
                      isActive: _currentStep == 1,
                      isCompleted: _currentStep > 1,
                    ),
                    const Expanded(
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Divider(color: Colors.white24, thickness: 1),
                      ),
                    ),
                    _buildStepIndicator(
                      stepNum: 2,
                      label: 'Security PIN',
                      isActive: _currentStep == 2,
                      isCompleted: _isConnected,
                    ),
                  ],
                ),
              ),

              // Error banner if any
              if (_connectionError != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF5252).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFF5252).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.circle_alert, color: Color(0xFFFF5252), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _connectionError!,
                          style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFFFF8080)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Step 1: Workstation Selection
              if (_currentStep == 1) ...[
                if (validHubs.isNotEmpty) ...[
                  Text(
                    'DISCOVERED WORKSTATIONS ON LAN',
                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8),
                  ),
                  const SizedBox(height: 10),
                  for (final hub in validHubs)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0077C0).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(LucideIcons.laptop, color: Color(0xFF38BDF8), size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  hub['name'] ?? 'Remote PC',
                                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                                ),
                                Text(
                                  hub['url'] ?? '',
                                  style: GoogleFonts.jetBrainsMono(fontSize: 11, color: Colors.white54),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0077C0),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                            icon: const Icon(LucideIcons.arrow_right, size: 14),
                            label: const Text('Select', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            onPressed: () {
                              final u = hub['url'] ?? '';
                              if (_isSelfConnection(u)) {
                                setState(() => _connectionError = 'Self-connection blocked: Cannot control this same device.');
                                return;
                              }
                              setState(() {
                                _targetUrl = u;
                                _urlController.text = u;
                                _targetDeviceName = hub['name'] ?? 'Remote Workstation';
                                _sessionToken = hub['token'] ?? '';
                                _codeController.text = _sessionToken;
                                _connectionError = null;
                                _currentStep = 2;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Expanded(child: Divider(color: Colors.white12)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'OR ENTER IP / RELAY ADDRESS',
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white38),
                        ),
                      ),
                      const Expanded(child: Divider(color: Colors.white12)),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],

                Text(
                  'Target Workstation URL or IP',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _urlController,
                  style: GoogleFonts.jetBrainsMono(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'e.g. 192.168.1.150:8000 or http://...',
                    hintStyle: const TextStyle(color: Colors.white30, fontSize: 12),
                    prefixIcon: const Icon(LucideIcons.globe, color: Color(0xFF38BDF8), size: 18),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF38BDF8))),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  onChanged: (val) {
                    _targetUrl = val;
                    if (_connectionError != null) setState(() => _connectionError = null);
                  },
                ),
                const SizedBox(height: 6),
                Text(
                  'Tip: Check the local IP address on the other computer\'s LANpad dashboard.',
                  style: GoogleFonts.inter(color: Colors.white38, fontSize: 11),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0077C0),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      final raw = _urlController.text.trim();
                      if (raw.isEmpty) {
                        setState(() => _connectionError = 'Please enter the target workstation IP or URL.');
                        return;
                      }
                      var formatted = raw;
                      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
                        formatted = 'http://$formatted';
                      }
                      if (_isSelfConnection(formatted)) {
                        setState(() => _connectionError = 'Self-connection blocked: You cannot remote control this same computer. Mirroring yourself creates an infinite loop and freezes the screen.');
                        return;
                      }
                      setState(() {
                        _targetUrl = formatted;
                        _targetDeviceName = 'Remote Workstation';
                        _currentStep = 2;
                        _connectionError = null;
                      });
                    },
                    icon: const Icon(LucideIcons.arrow_right, size: 16),
                    label: const Text('Proceed to Security PIN →', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
              ],

              // Step 2: 6-Character PIN Verification
              if (_currentStep == 2) ...[
                // Selected Target Host Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.laptop, color: Color(0xFF38BDF8), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _targetDeviceName,
                              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                            Text(
                              _targetUrl,
                              style: GoogleFonts.jetBrainsMono(fontSize: 11, color: Colors.white54),
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF38BDF8),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                        icon: const Icon(LucideIcons.pencil, size: 12),
                        label: const Text('Change', style: TextStyle(fontSize: 11)),
                        onPressed: () => setState(() {
                          _currentStep = 1;
                          _connectionError = null;
                        }),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                Text(
                  'Enter 6-Digit Pairing PIN',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white70),
                ),
                const SizedBox(height: 4),
                Text(
                  'Look at the remote workstation\'s screen or GlidePass dashboard to find its 6-character session PIN.',
                  style: GoogleFonts.inter(fontSize: 12, color: Colors.white54, height: 1.3),
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: _codeController,
                  maxLength: 6,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  textCapitalization: TextCapitalization.characters,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 6,
                  ),
                  decoration: InputDecoration(
                    hintText: '••••••',
                    hintStyle: GoogleFonts.jetBrainsMono(
                      color: Colors.white24,
                      fontSize: 22,
                      letterSpacing: 6,
                    ),
                    counterText: '',
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF00F59B), width: 2)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onSubmitted: (_) => _verifyPinAndConnect(),
                ),
                const SizedBox(height: 20),

                Row(
                  children: [
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white70,
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => setState(() {
                          _currentStep = 1;
                          _connectionError = null;
                        }),
                        child: const Text('← Back'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00F59B),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: (_isVerifyingPin || _isConnecting) ? null : _verifyPinAndConnect,
                        icon: (_isVerifyingPin || _isConnecting)
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                            : const Icon(LucideIcons.power, size: 16),
                        label: Text(
                          _isVerifyingPin ? 'Verifying PIN...' : (_isConnecting ? 'Connecting...' : 'Verify & Start Remote Control'),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator({
    required int stepNum,
    required String label,
    required bool isActive,
    required bool isCompleted,
  }) {
    final color = isCompleted
        ? const Color(0xFF00F59B)
        : (isActive ? const Color(0xFF38BDF8) : Colors.white24);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: isCompleted || isActive ? 0.2 : 0.05),
            border: Border.all(color: color, width: 1.5),
          ),
          child: Center(
            child: isCompleted
                ? const Icon(LucideIcons.check, size: 12, color: Color(0xFF00F59B))
                : Text(
                    '$stepNum',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isActive ? Colors.white : Colors.white38,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isActive || isCompleted ? FontWeight.w600 : FontWeight.normal,
            color: isActive || isCompleted ? Colors.white : Colors.white38,
          ),
        ),
      ],
    );
  }

  Widget _buildVirtualKeyboardRibbon() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: const Color(0xFF080C14),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildKeyBtn('Esc', () => _sendKeyEvent('Escape', 'keydown', [])),
            const SizedBox(width: 4),
            for (int i = 1; i <= 12; i++) ...[
              _buildKeyBtn('F$i', () => _sendKeyEvent('F$i', 'keydown', [])),
              const SizedBox(width: 4),
            ],
            const SizedBox(width: 8),
            _buildKeyBtn('Win/⌘', () => _sendKeyEvent('Meta', 'keydown', []), color: const Color(0xFF0077C0)),
            const SizedBox(width: 4),
            _buildKeyBtn('Alt/⌥', () => _sendKeyEvent('Alt', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('Ctrl', () => _sendKeyEvent('Control', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('Tab', () => _sendKeyEvent('Tab', 'keydown', [])),
            const SizedBox(width: 8),
            _buildKeyBtn('PgUp', () => _sendKeyEvent('PageUp', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('PgDn', () => _sendKeyEvent('PageDown', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('Home', () => _sendKeyEvent('Home', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('End', () => _sendKeyEvent('End', 'keydown', [])),
            const SizedBox(width: 8),
            _buildKeyBtn('▲', () => _sendKeyEvent('ArrowUp', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('▼', () => _sendKeyEvent('ArrowDown', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('◀', () => _sendKeyEvent('ArrowLeft', 'keydown', [])),
            const SizedBox(width: 4),
            _buildKeyBtn('▶', () => _sendKeyEvent('ArrowRight', 'keydown', [])),
            const SizedBox(width: 8),
            _buildKeyBtn('Copy', () => _sendKeyEvent('c', 'keydown', ['ctrl'])),
            const SizedBox(width: 4),
            _buildKeyBtn('Paste', () => _sendKeyEvent('v', 'keydown', ['ctrl'])),
            const SizedBox(width: 4),
            _buildKeyBtn('Enter', () => _sendKeyEvent('Enter', 'keydown', []), color: const Color(0xFF00F59B), textColor: Colors.black),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyBtn(String label, VoidCallback onTap, {Color? color, Color? textColor}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color ?? Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.white12),
        ),
        child: Text(
          label,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: textColor ?? Colors.white,
          ),
        ),
      ),
    );
  }
}
