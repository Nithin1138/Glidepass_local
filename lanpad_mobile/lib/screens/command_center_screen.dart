import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/connection_service.dart';
import '../models/history_model.dart';
import '../widgets/aurora_background.dart';
import '../widgets/liquid_glass_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class CommandCenterScreen extends StatefulWidget {
  const CommandCenterScreen({super.key});

  static final TextEditingController externalController = TextEditingController();

  @override
  State<CommandCenterScreen> createState() => _CommandCenterScreenState();
}

class _CommandCenterScreenState extends State<CommandCenterScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _textController = TextEditingController();
  
  String _mode = 'flash'; // 'flash', 'inject', 'type'
  bool _liveSync = false;
  bool _isCoding = false;
  int _wpm = 40;
  bool _isTyping = false;
  int _typingSecondsRemaining = 0;
  Timer? _countdownTimer;
  Timer? _typingStatusTimer;
  
  List<HistoryItem> _history = [];
  String _lastSentText = '';

  @override
  void initState() {
    super.initState();
    _checkInitialTypingStatus();
    _startTypingStatusPolling();
    // Copy any text shared via externalController
    if (CommandCenterScreen.externalController.text.isNotEmpty) {
      _textController.text = CommandCenterScreen.externalController.text;
      CommandCenterScreen.externalController.clear();
    }
    // Also listen to changes while this state is active
    CommandCenterScreen.externalController.addListener(_onExternalTextChange);
  }

  void _onExternalTextChange() {
    if (mounted && CommandCenterScreen.externalController.text.isNotEmpty) {
      setState(() {
        _textController.text = CommandCenterScreen.externalController.text;
      });
      CommandCenterScreen.externalController.clear();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _typingStatusTimer?.cancel();
    CommandCenterScreen.externalController.removeListener(_onExternalTextChange);
    _textController.dispose();
    super.dispose();
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  // Poll typing status from server
  void _startTypingStatusPolling() {
    _typingStatusTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted) return;
      final status = await _apiService.checkTypingStatus();
      final serverIsTyping = status['is_typing'] ?? false;
      if (serverIsTyping != _isTyping) {
        setState(() {
          _isTyping = serverIsTyping;
          if (!_isTyping) {
            _countdownTimer?.cancel();
            _typingSecondsRemaining = 0;
          }
        });
      }
    });
  }

  Future<void> _checkInitialTypingStatus() async {
    final status = await _apiService.checkTypingStatus();
    setState(() {
      _isTyping = status['is_typing'] ?? false;
    });
  }

  void _startCountdown(int seconds) {
    _countdownTimer?.cancel();
    setState(() {
      _typingSecondsRemaining = seconds;
      _isTyping = true;
    });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_typingSecondsRemaining > 0) {
          _typingSecondsRemaining--;
        } else {
          _isTyping = false;
          _countdownTimer?.cancel();
          _showCompletionModal();
        }
      });
    });
  }

  void _showCompletionModal() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: context.bgColor,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: context.borderColor),
          ),
          title: Column(
            children: [
              Icon(LucideIcons.circle_check, color: AppTheme.accentColor, size: 40),
              const SizedBox(height: 12),
              Text(
                'Injection Completed!',
                style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 18, color: context.textMain),
              ),
            ],
          ),
          content: Text(
            'Your text has been typed onto the laptop. Select what you would like to do next:',
            textAlign: TextAlign.center,
            style: TextStyle(color: context.textMuted, fontSize: 13),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actionsOverflowButtonSpacing: 8,
          actions: [
            AnimatedButton(
              onTap: () {
                _triggerHaptic();
                Navigator.of(context).pop();
                _refillCode();
              },
              decoration: BoxDecoration(
                color: AppTheme.accentColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('REFILL PREVIOUS CODE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            AnimatedButton(
              onTap: () {
                _triggerHaptic();
                Navigator.of(context).pop();
                _clearText();
              },
              decoration: BoxDecoration(
                color: context.cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.borderColor),
              ),
              child: Text('CLEAR AREA', style: TextStyle(color: context.textMain, fontWeight: FontWeight.bold)),
            ),
            TextButton(
              onPressed: () {
                _triggerHaptic();
                Navigator.of(context).pop();
              },
              child: Text('Dismiss', style: TextStyle(color: context.textMuted)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _sendToLaptop() async {
    _triggerHaptic();
    final text = _textController.text.trim();
    if (text.isEmpty) {
      _showToast('Cannot send empty content', isError: true);
      return;
    }

    _lastSentText = _textController.text;
    final typingWords = text.split(RegExp(r'\s+')).length;
    final estimatedSeconds = (typingWords / _wpm * 60).round();

    final result = await _apiService.sendPaste(
      text: _textController.text,
      mode: _mode,
      wpm: _wpm,
      isCoding: _isCoding,
    );

    if (result['status'] == 'success') {
      _showToast('Dispatched successfully');
      
      // Save stats preference
      final prefs = await SharedPreferences.getInstance();
      final current = prefs.getInt('paste_count') ?? 0;
      await prefs.setInt('paste_count', current + 1);

      if (_mode == 'type') {
        _startCountdown(estimatedSeconds);
      } else {
        if (!_liveSync) {
          _textController.clear();
        }
      }
    } else {
      _showToast(result['message'] ?? 'Failed to send text', isError: true);
    }
  }

  Future<void> _fetchFromLaptop() async {
    _triggerHaptic();
    final result = await _apiService.fetchClipboard();
    if (result['status'] == 'success' && result['text'] != null) {
      setState(() {
        _textController.text = result['text'];
      });
      _showToast('Clipboard content loaded');
    } else {
      _showToast(result['message'] ?? 'Failed to fetch laptop clipboard', isError: true);
    }
  }

  Future<void> _triggerCopy() async {
    _triggerHaptic();
    final result = await _apiService.sendCopyCommand();
    if (result['status'] == 'success') {
      _showToast('Copy command triggered');
      // Wait briefly, then auto fetch
      await Future.delayed(const Duration(milliseconds: 600));
      _fetchFromLaptop();
    } else {
      _showToast('Failed to trigger copy', isError: true);
    }
  }

  void _refillCode() {
    if (_lastSentText.isNotEmpty) {
      setState(() {
        _textController.text = _lastSentText;
      });
      _showToast('Refilled previous snippet');
    } else {
      _showToast('No previous text to refill', isError: true);
    }
  }

  void _clearText() {
    setState(() {
      _textController.clear();
    });
    _showToast('Cleared area');
  }

  Future<void> _stopPasting() async {
    _triggerHaptic();
    await _apiService.stopPasting();
    setState(() {
      _isTyping = false;
      _typingSecondsRemaining = 0;
      _countdownTimer?.cancel();
    });
    _showToast('Typing engine halted');
  }

  void _showHistoryDrawer() async {
    _triggerHaptic();
    final items = await _apiService.fetchHistory();
    setState(() {
      _history = items;
    });

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: context.bgColor,
      barrierColor: Colors.black54,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.history, color: AppTheme.accentColor, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Saved History',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: context.textMain,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: context.textMuted),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: _history.isEmpty
                      ? Center(
                          child: Text(
                            'No history items found.',
                            style: TextStyle(color: context.textMuted),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _history.length,
                          itemBuilder: (context, index) {
                            final item = _history[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: GestureDetector(
                                onTap: () {
                                  _triggerHaptic();
                                  _textController.text = item.content;
                                  Navigator.of(context).pop();
                                  _showToast('Snippet loaded from history');
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: context.cardBg,
                                    border: Border.all(color: context.borderColor),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            item.title,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: context.textMain,
                                            ),
                                          ),
                                          Text(
                                            '${item.timestamp} (${item.mode})',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: context.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        item.content,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontFamily: 'monospace',
                                          color: context.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final expectedMinutes = (_textController.text.split(RegExp(r'\s+')).length / _wpm).toStringAsFixed(1);
    final isDark = AppTheme.isDark;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          const AuroraBackground(),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 140),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                // Top Header Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CONTROL PANEL',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                          color: AppTheme.accentColor,
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: Icon(LucideIcons.history, color: AppTheme.accentColor, size: 20),
                            onPressed: _showHistoryDrawer,
                          ),
                          IconButton(
                            icon: Icon(LucideIcons.rotate_ccw, color: AppTheme.accentColor, size: 20),
                            onPressed: _refillCode,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Live Sync Settings Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            _triggerHaptic();
                            setState(() {
                              _liveSync = !_liveSync;
                            });
                          },
                          child: LiquidGlassCard(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 14,
                            borderColor: _liveSync ? AppTheme.accentColor : null,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  LucideIcons.refresh_cw,
                                  size: 16,
                                  color: _liveSync ? AppTheme.accentColor : context.textMuted,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'LIVE SYNC',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: _liveSync ? context.textMain : context.textMuted,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: _triggerCopy,
                          child: LiquidGlassCard(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 14,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.copy, size: 16, color: AppTheme.accentColor),
                                const SizedBox(width: 8),
                                Text(
                                  'PULL COPY',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: context.textMain,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                
                // Input Text Area
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: SizedBox(
                    height: 180,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: LiquidGlassCard(
                            padding: const EdgeInsets.all(16),
                            borderRadius: 20,
                            isFlat: false,
                            child: TextField(
                              controller: _textController,
                              maxLines: null,
                              expands: true,
                              keyboardType: TextInputType.multiline,
                              style: TextStyle(color: context.textMain, fontSize: 16, height: 1.5),
                              decoration: InputDecoration(
                                hintText: 'Type snippet or instructions...',
                                hintStyle: TextStyle(color: context.textMuted.withOpacity(0.4)),
                                border: InputBorder.none,
                              ),
                              onChanged: (text) {
                                if (_liveSync && text.isNotEmpty) {
                                  _apiService.sendPaste(
                                    text: text,
                                    mode: 'flash',
                                    wpm: _wpm,
                                    isCoding: _isCoding,
                                  );
                                }
                              },
                            ),
                          ),
                        ),
                        if (_isTyping)
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.85),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 80,
                                    height: 80,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppTheme.accentColor, width: 2.5),
                                    ),
                                    child: Text(
                                      '${_typingSecondsRemaining}s',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentColor,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'TYPING Snip...',
                                    style: TextStyle(
                                      color: context.textMain,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  AnimatedButton(
                                    onTap: _stopPasting,
                                    decoration: BoxDecoration(
                                      color: AppTheme.redStatus.withOpacity(0.2),
                                      border: Border.all(color: AppTheme.redStatus),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Text('STOP PASTE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                
                // Live status sync line
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      Icon(
                        _liveSync ? LucideIcons.circle_check : LucideIcons.circle_pause,
                        size: 14,
                        color: _liveSync ? const Color(0xFF00F59B) : context.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _liveSync
                            ? 'Live Sync ON: Pressing keys is synchronized.'
                            : 'Live Sync OFF: Dispatch manually with button below.',
                        style: TextStyle(fontSize: 10, color: context.textMuted),
                      ),
                    ],
                  ),
                ),
                
                // Mode Selectors
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    children: [
                      _buildModeCard('flash', LucideIcons.zap, 'Flash', 'Instant paste'),
                      const SizedBox(width: 8),
                      _buildModeCard('inject', LucideIcons.text_align_start, 'Inline', 'One line flash'),
                      const SizedBox(width: 8),
                      _buildModeCard('type', LucideIcons.keyboard, 'Typing', 'Human sim'),
                    ],
                  ),
                ),
                
                // Typing Speed Controls
                if (_mode == 'type')
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Coding Mode (Handle IDE auto-brackets)', style: TextStyle(fontSize: 11, color: context.textMain)),
                            Switch(
                              value: _isCoding,
                              activeColor: AppTheme.accentColor,
                              onChanged: (val) {
                                _triggerHaptic();
                                setState(() => _isCoding = val);
                              },
                            ),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('TYPING SPEED', style: TextStyle(fontSize: 10, color: context.textMuted, fontWeight: FontWeight.bold)),
                            Text('$_wpm WPM', style: TextStyle(fontSize: 12, color: AppTheme.accentColor, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Slider(
                          min: 30,
                          max: 120,
                          divisions: 18,
                          value: _wpm.toDouble(),
                          onChanged: (val) {
                            setState(() => _wpm = val.round());
                          },
                          onChangeEnd: (_) => _triggerHaptic(),
                        ),
                        Center(
                          child: Text(
                            'Expected Time: ${expectedMinutes}m',
                            style: TextStyle(fontSize: 10, color: context.textMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                
                // Send To Laptop Dispatch Button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: AnimatedButton(
                    onTap: _sendToLaptop,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.accentColor, AppTheme.accentColor.withOpacity(0.75)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.zap, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'SEND TO LAPTOP',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            letterSpacing: 0.5,
                          ),
                        ),
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

  Widget _buildModeCard(String modeValue, IconData icon, String title, String subtitle) {
    final isSelected = _mode == modeValue;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _triggerHaptic();
          setState(() => _mode = modeValue);
        },
        child: LiquidGlassCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          borderRadius: 14,
          borderColor: isSelected ? AppTheme.accentColor : null,
          child: Column(
            children: [
              Icon(icon, size: 16, color: isSelected ? AppTheme.accentColor : context.textMuted),
              const SizedBox(height: 4),
              Text(
                title, 
                style: TextStyle(
                  fontSize: 12, 
                  fontWeight: FontWeight.bold, 
                  color: isSelected ? AppTheme.accentColor : context.textMain,
                ),
              ),
              Text(subtitle, style: TextStyle(fontSize: 9, color: context.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
