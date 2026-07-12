import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/connection_service.dart';
import '../services/api_service.dart';
import '../widgets/aurora_background.dart';
import '../widgets/connection_pill.dart';
import '../widgets/animated_button.dart';
import '../widgets/liquid_glass_card.dart';
import '../widgets/app_logo.dart';
import '../config/theme.dart';
import 'main_navigation_screen.dart';
import 'connect_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final ConnectionService _connectionService = ConnectionService();
  int _pasteCount = 0;
  int _filesCount = 0;
  bool _isSwitchingMode = false;
  
  final ApiService _apiService = ApiService();
  String _clipboardText = '';
  bool _isSyncingClipboard = false;
  bool _isPushingClipboard = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _connectionService.addListener(_onConnectionChanged);
    _loadStats();
    _fetchCurrentClipboard();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _connectionService.removeListener(_onConnectionChanged);
    _pulseController.dispose();
    super.dispose();
  }

  void _onConnectionChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadStats() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _pasteCount = prefs.getInt('paste_count') ?? 0;
      _filesCount = prefs.getInt('files_count') ?? 0;
    });
  }

  Future<void> _fetchCurrentClipboard() async {
    if (!_connectionService.isConnected) return;
    final res = await _apiService.fetchClipboard();
    if (res['status'] == 'success' && res['text'] != null) {
      if (mounted) {
        setState(() {
          _clipboardText = res['text'];
        });
      }
    }
  }

  Future<void> _syncClipboard() async {
    if (_isSyncingClipboard || !_connectionService.isConnected) return;
    setState(() => _isSyncingClipboard = true);
    _triggerHaptic();
    
    final res = await _apiService.fetchClipboard();
    setState(() => _isSyncingClipboard = false);

    if (res['status'] == 'success' && res['text'] != null) {
      final text = res['text'] as String;
      if (text.isNotEmpty) {
        await Clipboard.setData(ClipboardData(text: text));
        setState(() => _clipboardText = text);
        _showToast('Copied laptop clipboard to mobile!');
      } else {
        _showToast('Laptop clipboard is empty');
      }
    } else {
      _showToast('Failed to pull clipboard', isError: true);
    }
  }

  Future<void> _pushClipboard() async {
    if (_isPushingClipboard || !_connectionService.isConnected) return;
    setState(() => _isPushingClipboard = true);
    _triggerHaptic();

    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      final text = data?.text ?? '';
      if (text.isEmpty) {
        _showToast('Mobile clipboard is empty', isError: true);
        setState(() => _isPushingClipboard = false);
        return;
      }

      // Send to server (we can hit copy endpoint with post body, or let's simulate paste on target computer)
      final url = _connectionService.serverUrl;
      final sid = _connectionService.sessionId;
      if (url != null && sid != null) {
        final response = await http.post(
          Uri.parse('$url/api/paste'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'text': text, 'sid': sid}),
        ).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final resData = jsonDecode(response.body);
          if (resData['status'] == 'success') {
            setState(() => _clipboardText = text);
            _showToast('Pushed mobile clipboard to laptop!');
            _loadStats();
          } else {
            _showToast('Failed to push: ${resData['message']}', isError: true);
          }
        } else {
          _showToast('Push failed: server error', isError: true);
        }
      }
    } catch (e) {
      _showToast('Error pushing clipboard: $e', isError: true);
    } finally {
      setState(() => _isPushingClipboard = false);
    }
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _toggleConnectionMode() async {
    if (_isSwitchingMode || !_connectionService.isConnected) return;

    final isLan = _connectionService.isLocalConnection;
    if (isLan) {
      final tunnel = _connectionService.tunnelUrl;
      if (tunnel == null || tunnel.isEmpty) {
        _showToast('Relay not available – start a tunnel on the server', isError: true);
        return;
      }
    } else {
      final lan = _connectionService.lanIp;
      if (lan == null || lan.isEmpty) {
        _showToast('LAN not available – check Wi-Fi', isError: true);
        return;
      }
    }

    setState(() => _isSwitchingMode = true);
    _triggerHaptic();

    final success = await _connectionService.switchConnection();
    setState(() => _isSwitchingMode = false);

    if (success) {
      final newMode = _connectionService.isLocalConnection ? 'LAN Direct' : 'Hybrid Relay';
      _showToast('Switched to $newMode');
    } else {
      _showToast('Could not switch – check connection', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLan = _connectionService.isLocalConnection;

    return AnimatedBuilder(
      animation: Listenable.merge([
        AppTheme.themeModeNotifier,
        AppTheme.accentColorNotifier,
      ]),
      builder: (context, _) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          body: Stack(
            children: [
              const AuroraBackground(),

          // Header Bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 14,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const ConnectionPill(),
                LiquidGlassCard(
                  padding: const EdgeInsets.all(10),
                  borderRadius: 12,
                  isFlat: true,
                  child: Icon(LucideIcons.bell, size: 20, color: context.textMain),
                ),
              ],
            ),
          ),

          // Scrollable Body
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 68, 20, 110),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 10),

                  // Logo + Title
                  Center(
                    child: Column(
                      children: [
                        const AppLogo(size: 68, animate: true),
                        const SizedBox(height: 10),
                        Text(
                          'LANPAD',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 5.0,
                            color: context.textMain,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Remote Control  ·  File Bridge',
                          style: TextStyle(fontSize: 11, color: context.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 26),

                  // ── Stats Strip ──────────────────────────────────────
                  LiquidGlassCard(
                    isFlat: true,
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem(LucideIcons.keyboard, 'Pastes', '$_pasteCount'),
                        Container(width: 1, height: 26, color: context.borderColor),
                        _buildStatItem(LucideIcons.files, 'Files', '$_filesCount'),
                        Container(width: 1, height: 26, color: context.borderColor),
                        _buildStatItem(
                          isLan ? LucideIcons.wifi : LucideIcons.globe,
                          'Path',
                          isLan ? 'LAN' : 'Relay',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),



                  // ── Target Computers ─────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'TARGET COMPUTERS',
                        style: TextStyle(
                          color: context.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.5,
                        ),
                      ),
                      Icon(LucideIcons.monitor, color: context.textMuted, size: 14),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_connectionService.devices.isEmpty)
                    LiquidGlassCard(
                      isFlat: false,
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.laptop, size: 36, color: context.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            'No Laptop Paired',
                            style: TextStyle(
                              color: context.textMain,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Pair a laptop to start using LANpad',
                            style: TextStyle(color: context.textMuted, fontSize: 12),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          AnimatedButton(
                            onTap: () async {
                              _triggerHaptic();
                              final success = await Navigator.of(context).push<bool>(
                                MaterialPageRoute(
                                  builder: (context) => const ConnectScreen(isAddingDevice: true),
                                ),
                              );
                              if (success == true) {
                                _loadStats();
                                setState(() {});
                              }
                            },
                            padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 24),
                            decoration: BoxDecoration(
                              color: AppTheme.accentColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.scan_qr_code, color: Colors.white, size: 16),
                                SizedBox(width: 8),
                                Text(
                                  'Pair Laptop',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._connectionService.devices.asMap().entries.map((entry) {
                      final index = entry.key;
                      final device = entry.value;
                      final isActive = _connectionService.serverUrl == device['url'];

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10.0),
                        child: AnimatedButton(
                          onTap: () async {
                            if (isActive) return;
                            _triggerHaptic();
                            final success = await _connectionService.selectDevice(index);
                            _showToast(
                              success
                                  ? 'Switched to ${device['name']}'
                                  : 'Failed to connect to ${device['name']}',
                              isError: !success,
                            );
                          },
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppTheme.accentColor.withOpacity(0.08)
                                : context.cardBg,
                            border: Border.all(
                              color: isActive
                                  ? AppTheme.accentColor.withOpacity(0.55)
                                  : context.borderColor,
                              width: isActive ? 1.5 : 1.0,
                            ),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? AppTheme.accentColor.withOpacity(0.14)
                                      : context.borderColor.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(11),
                                ),
                                child: Icon(
                                  LucideIcons.laptop,
                                  color: isActive ? AppTheme.accentColor : context.textMuted,
                                  size: 19,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      device['name'] ?? 'Device',
                                      style: TextStyle(
                                        color: context.textMain,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      device['url'] ?? '',
                                      style: TextStyle(color: context.textMuted, fontSize: 11),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              if (isActive)
                                AnimatedBuilder(
                                  animation: _pulseAnimation,
                                  builder: (context, _) => Opacity(
                                    opacity: _pulseAnimation.value,
                                    child: Container(
                                      width: 9,
                                      height: 9,
                                      margin: const EdgeInsets.only(right: 6),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF00E676),
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: Color(0xFF00E676),
                                            blurRadius: 7,
                                            spreadRadius: 1,
                                          )
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              IconButton(
                                icon: const Icon(LucideIcons.trash_2, size: 16, color: AppTheme.redStatus),
                                onPressed: () async {
                                  _triggerHaptic();
                                  await _connectionService.removeDevice(index);
                                  _showToast('Device removed');
                                  if (_connectionService.devices.isEmpty && context.mounted) {
                                    Navigator.of(context).pushReplacement(
                                      PageRouteBuilder(
                                        pageBuilder: (context, animation, secondaryAnimation) => const ConnectScreen(),
                                        transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                          return FadeTransition(opacity: animation, child: child);
                                        },
                                        transitionDuration: const Duration(milliseconds: 400),
                                      ),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 12),

                  // ── Add Laptop + Disconnect row ───────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: AnimatedButton(
                          onTap: () async {
                            _triggerHaptic();
                            final success = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (context) => const ConnectScreen(isAddingDevice: true),
                              ),
                            );
                            if (success == true) {
                              _loadStats();
                              setState(() {});
                            }
                          },
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          decoration: BoxDecoration(
                            color: context.cardBg,
                            border: Border.all(color: context.borderColor),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.circle_plus, color: AppTheme.accentColor, size: 16),
                              const SizedBox(width: 8),
                              Text(
                                'Add Laptop',
                                style: TextStyle(
                                  color: context.textMain,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: AnimatedButton(
                          onTap: () async {
                            _triggerHaptic();
                            await _connectionService.disconnect();
                            if (context.mounted) {
                              Navigator.of(context).pushReplacement(
                                PageRouteBuilder(
                                  pageBuilder: (context, animation, secondaryAnimation) =>
                                      const ConnectScreen(),
                                  transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                    return FadeTransition(opacity: animation, child: child);
                                  },
                                  transitionDuration: const Duration(milliseconds: 400),
                                ),
                              );
                            }
                          },
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          decoration: BoxDecoration(
                            color: AppTheme.redStatus.withOpacity(0.07),
                            border: Border.all(
                              color: AppTheme.redStatus.withOpacity(0.45),
                              width: 1.2,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.log_out, color: AppTheme.redStatus, size: 16),
                              SizedBox(width: 8),
                              Text(
                                'Disconnect',
                                style: TextStyle(
                                  color: AppTheme.redStatus,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  },
);
  }

  Widget _buildModeTab({
    required String label,
    required IconData icon,
    required bool isSelected,
    required bool isAvailable,
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.accentColor.withOpacity(0.85)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppTheme.accentColor.withOpacity(0.3),
                      blurRadius: 10,
                    )
                  ]
                : [],
          ),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    size: 13,
                    color: isSelected
                        ? Colors.white
                        : isAvailable
                            ? context.textMuted
                            : context.textMuted.withOpacity(0.35),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected
                          ? Colors.white
                          : isAvailable
                              ? context.textMuted
                              : context.textMuted.withOpacity(0.35),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 14, color: AppTheme.accentColor),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: context.textMain,
          ),
        ),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 10, color: context.textMuted)),
      ],
    );
  }
}
