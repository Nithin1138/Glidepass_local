import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../config/theme.dart';
import '../widgets/liquid_glass_card.dart';
import '../services/connection_service.dart';
import '../widgets/aurora_background.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nicknameController = TextEditingController();
  final ConnectionService _connectionService = ConnectionService();
  
  String _hapticLevel = 'light';
  int _pasteCount = 0;
  int _filesCount = 0;
  int _latencyMs = -1;
  bool _isTestingLatency = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadStats();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _nicknameController.text = prefs.getString('nickname') ?? 'Guest User';
      _hapticLevel = prefs.getString('haptic_level') ?? 'light';
    });
  }

  Future<void> _loadStats() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _pasteCount = prefs.getInt('paste_count') ?? 0;
      _filesCount = prefs.getInt('files_count') ?? 0;
    });
  }

  Future<void> _saveNickname(String val) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('nickname', val.trim());
    // No setState needed for text typing, but can be added if needed.
  }

  Future<void> _saveHapticLevel(String val) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('haptic_level', val);
    setState(() {
      _hapticLevel = val;
    });
    AppTheme.hapticLevelNotifier.value = val;
    
    // Trigger tick feedback to feel the settings change
    if (val == 'light') {
      HapticFeedback.lightImpact();
    } else if (val == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  Future<void> _saveThemeMode(bool isDarkSelected) async {
    final mode = isDarkSelected ? ThemeMode.dark : ThemeMode.light;
    setState(() {
      // Trigger local build update
    });
    AppTheme.themeModeNotifier.value = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('theme_mode', isDarkSelected ? 1 : 0);
    
    // Trigger feedback
    _triggerHaptic();
  }

  Future<void> _saveAccentColor(Color color) async {
    setState(() {
      // Trigger rebuild to update checkmarks
    });
    AppTheme.accentColorNotifier.value = color;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('accent_color', color.value);
    
    _triggerHaptic();
  }

  void _triggerHaptic() {
    if (_hapticLevel == 'light') {
      HapticFeedback.lightImpact();
    } else if (_hapticLevel == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  Future<void> _testLatency() async {
    if (_connectionService.serverUrl == null) return;
    
    setState(() {
      _isTestingLatency = true;
      _latencyMs = -1;
    });

    final stopwatch = Stopwatch()..start();
    try {
      final response = await http.get(
        Uri.parse('${_connectionService.serverUrl}/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}'),
      ).timeout(const Duration(seconds: 4));
      
      stopwatch.stop();
      if (response.statusCode == 200) {
        setState(() {
          _latencyMs = stopwatch.elapsedMilliseconds;
        });
      } else {
        setState(() {
          _latencyMs = -2; // Fail
        });
      }
    } catch (_) {
      setState(() {
        _latencyMs = -2;
      });
    } finally {
      setState(() {
        _isTestingLatency = false;
      });
      _triggerHaptic();
    }
  }

  @override
  void dispose() {
    _nicknameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    
    return Scaffold(
      body: Stack(
        children: [
          const AuroraBackground(),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 100), // Bottom padding to clear float bar
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'SETTINGS',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontFamily: 'Outfit',
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                          color: AppTheme.accentColor,
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          isDark ? LucideIcons.moon : LucideIcons.sun,
                          color: AppTheme.accentColor,
                        ),
                        onPressed: () => _saveThemeMode(!isDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Neumorphic Profile Circle Card
                  Center(
                    child: Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.accentColor.withOpacity(0.2),
                            blurRadius: 15,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: CircleAvatar(
                        radius: 45,
                        backgroundColor: AppTheme.cardBg,
                        child: Icon(
                          LucideIcons.laptop,
                          size: 40,
                          color: AppTheme.accentColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Nickname Card
                  LiquidGlassCard(
                    isFlat: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'DEVICE NICKNAME',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _nicknameController,
                          style: TextStyle(color: AppTheme.textMain, fontSize: 14, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            hintText: 'Enter name',
                            hintStyle: TextStyle(color: AppTheme.textMuted.withOpacity(0.5)),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 4),
                          ),
                          onChanged: _saveNickname,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Theme Color Customizer
                  LiquidGlassCard(
                    isFlat: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'LIQUID GLASS THEME ACCENT',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: AppTheme.presetAccents.map((color) {
                            final isSelected = AppTheme.accentColor == color;
                            return GestureDetector(
                              onTap: () => _saveAccentColor(color),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: color,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected 
                                      ? (isDark ? Colors.white : Colors.black87) 
                                      : Colors.transparent,
                                    width: 2.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: color.withOpacity(0.4),
                                      blurRadius: isSelected ? 8 : 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: isSelected 
                                  ? const Icon(LucideIcons.check, size: 16, color: Colors.white)
                                  : null,
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Haptics Card
                  LiquidGlassCard(
                    isFlat: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'TACTILE HAPTIC FEEDBACK',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            _buildHapticButton('none', 'Off'),
                            const SizedBox(width: 8),
                            _buildHapticButton('light', 'Light'),
                            const SizedBox(width: 8),
                            _buildHapticButton('medium', 'Medium'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Stats & Latency Card
                  LiquidGlassCard(
                    isFlat: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'CONNECTION STATS',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildStatItem('Keys Sent', _pasteCount.toString()),
                            _buildStatItem('Files Shared', _filesCount.toString()),
                            _buildStatItem(
                              'Connection',
                              _connectionService.isConnected 
                                ? (_connectionService.isLocalConnection ? 'LAN' : 'TUNNEL')
                                : 'Offline',
                            ),
                          ],
                        ),
                        const Divider(color: Colors.white10, height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Server Latency',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMain),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _latencyMs == -1 
                                      ? 'Not tested' 
                                      : _latencyMs == -2 
                                          ? 'Request timeout' 
                                          : '$_latencyMs ms',
                                  style: TextStyle(
                                    fontSize: 13, 
                                    fontWeight: FontWeight.bold, 
                                    color: _latencyMs == -1 
                                        ? AppTheme.textMuted 
                                        : _latencyMs == -2 
                                            ? AppTheme.redStatus 
                                            : AppTheme.greenStatus,
                                  ),
                                ),
                              ],
                            ),
                            ElevatedButton(
                              onPressed: _connectionService.isConnected && !_isTestingLatency
                                  ? _testLatency
                                  : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.accentColor,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              ),
                              child: _isTestingLatency
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Test Speed', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Help Guide
                  LiquidGlassCard(
                    isFlat: false,
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        title: Text(
                          'LOCAL DISCOVERY GUIDE',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: AppTheme.accentColor,
                          ),
                        ),
                        trailing: Icon(LucideIcons.chevron_down, size: 16, color: AppTheme.accentColor),
                        children: [
                          const SizedBox(height: 8),
                          Text(
                            'To connect LANpad mobile app directly to your laptop without a cloud proxy, ensure both devices are connected to the SAME Wi-Fi router network.',
                            style: TextStyle(fontSize: 12, color: AppTheme.textMain, height: 1.4),
                          ),
                          const SizedBox(height: 8),
                          _buildGuideStep('1', 'Open LANpad on your computer.'),
                          _buildGuideStep('2', 'Scan the QR code displayed on the desktop command dashboard using the mobile scan button.'),
                          _buildGuideStep('3', 'If scan fails, manually enter your laptop\'s local IP address (e.g. http://192.168.1.10:8000).'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHapticButton(String level, String label) {
    final isSelected = _hapticLevel == level;
    final isDark = context.isDark;

    return Expanded(
      child: GestureDetector(
        onTap: () => _saveHapticLevel(level),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected 
              ? AppTheme.accentColor 
              : AppTheme.cardBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected 
                ? AppTheme.accentColor 
                : AppTheme.borderColor,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isSelected 
                  ? Colors.white 
                  : AppTheme.textMain,
              ),
            ),
          ),
        ),
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

  Widget _buildGuideStep(String stepNumber, String instruction) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 8,
            backgroundColor: AppTheme.accentColor.withOpacity(0.2),
            child: Text(stepNumber, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.accentColor)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              instruction,
              style: TextStyle(fontSize: 11, color: AppTheme.textMuted, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }
}
