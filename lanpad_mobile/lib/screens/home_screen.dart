import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/connection_service.dart';
import '../widgets/nebula_background.dart';
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

class _HomeScreenState extends State<HomeScreen> {
  final ConnectionService _connectionService = ConnectionService();
  int _pasteCount = 0;
  int _filesCount = 0;

  @override
  void initState() {
    super.initState();
    _connectionService.addListener(_onConnectionChanged);
    _loadStats();
  }

  @override
  void dispose() {
    _connectionService.removeListener(_onConnectionChanged);
    super.dispose();
  }

  void _onConnectionChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _loadStats() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _pasteCount = prefs.getInt('paste_count') ?? 0;
      _filesCount = prefs.getInt('files_count') ?? 0;
    });
  }

  Future<void> _openSupport() async {
    _triggerHaptic();
    final url = Uri.parse('https://lanpad.app/support');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
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

  void _navigateToTab(int index) {
    _triggerHaptic();
    final navState = MainNavigationScreen.of(context);
    if (navState != null) {
      navState.setIndex(index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;

    return Scaffold(
      body: Stack(
        children: [
          const NebulaBackground(),
          
          // Header Actions
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const ConnectionPill(),
                
                Row(
                  children: [
                    // Notification Button
                    GestureDetector(
                      onTap: () {
                        _triggerHaptic();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text(
                              'Notifications synchronized with local device',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: AppTheme.accentColor,
                          ),
                        );
                      },
                      child: LiquidGlassCard(
                        padding: const EdgeInsets.all(10),
                        borderRadius: 12,
                        isFlat: true,
                        child: Icon(
                          LucideIcons.bell,
                          size: 20,
                          color: AppTheme.textMain,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Dashboard Contents
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24.0, 80.0, 24.0, 110.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  
                  // App Logo with Bobbing Animation
                  Center(
                    child: Column(
                      children: [
                        const AppLogo(size: 90, animate: true),
                        const SizedBox(height: 12),
                        Text(
                          'LANPAD',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 4.0,
                            color: AppTheme.textMain,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  Text(
                    'Linked Up',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Connected to laptop command center. Ready to bridge your data.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  // Stats Summary Panel
                  LiquidGlassCard(
                    isFlat: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem('Keyboard Injects', _pasteCount.toString()),
                        Container(width: 1, height: 30, color: AppTheme.borderColor),
                        _buildStatItem('Files Shared', _filesCount.toString()),
                        Container(width: 1, height: 30, color: AppTheme.borderColor),
                        _buildStatItem(
                          'Path', 
                          _connectionService.isLocalConnection ? 'LAN' : 'Tunnel',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  // Devices Switcher Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'TARGET COMPUTERS',
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.5,
                        ),
                      ),
                      Icon(LucideIcons.monitor, color: AppTheme.textMuted, size: 14),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Devices Switcher list
                  if (_connectionService.devices.isEmpty)
                    LiquidGlassCard(
                      isFlat: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12.0),
                        child: Center(
                          child: Text(
                            'No target devices registered',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                          ),
                        ),
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
                            _triggerHaptic();
                            if (isActive) return;
                            final success = await _connectionService.selectDevice(index);
                            if (success) {
                              _showToast('Switched to ${device['name']}');
                            } else {
                              _showToast('Failed to connect to ${device['name']}', isError: true);
                            }
                          },
                          decoration: BoxDecoration(
                            color: isActive 
                                ? AppTheme.accentColor.withOpacity(0.08) 
                                : AppTheme.cardBg,
                            border: Border.all(
                              color: isActive 
                                  ? AppTheme.accentColor.withOpacity(0.6) 
                                  : AppTheme.borderColor,
                              width: isActive ? 1.5 : 1.0,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isActive 
                                      ? AppTheme.accentColor.withOpacity(0.12) 
                                      : AppTheme.borderColor.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  LucideIcons.laptop,
                                  color: isActive ? AppTheme.accentColor : AppTheme.textMuted,
                                  size: 16,
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
                                        color: AppTheme.textMain,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      device['url'] ?? '',
                                      style: TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              if (isActive)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Colors.green,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.greenAccent,
                                        blurRadius: 6,
                                        spreadRadius: 1,
                                      )
                                    ]
                                  ),
                                ),
                              IconButton(
                                icon: const Icon(LucideIcons.trash_2, size: 16, color: AppTheme.redStatus),
                                onPressed: () {
                                  _triggerHaptic();
                                  _connectionService.removeDevice(index);
                                  _showToast('Device removed');
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  const SizedBox(height: 12),

                  // Add Another Device Button
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
                    decoration: BoxDecoration(
                      color: AppTheme.cardBg,
                      border: Border.all(color: AppTheme.borderColor),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.circle_plus, color: AppTheme.accentColor, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Add Another Device',
                          style: TextStyle(
                            color: AppTheme.textMain,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Highlighted Disconnect Button
                  AnimatedButton(
                    onTap: () async {
                      _triggerHaptic();
                      await _connectionService.disconnect();
                      if (context.mounted) {
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
                    decoration: BoxDecoration(
                      color: AppTheme.redStatus.withOpacity(0.08),
                      border: Border.all(color: AppTheme.redStatus.withOpacity(0.5), width: 1.5),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.log_out, color: AppTheme.redStatus, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Disconnect Server',
                          style: TextStyle(
                            color: AppTheme.redStatus,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 35),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: AppTheme.accentColor,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: AppTheme.textMuted),
        ),
      ],
    );
  }
}
