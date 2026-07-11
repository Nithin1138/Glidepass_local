import 'dart:async';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../services/connection_service.dart';
import '../models/history_model.dart';
import '../widgets/aurora_background.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class CommandCenterScreen extends StatefulWidget {
  const CommandCenterScreen({super.key});

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
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _typingStatusTimer?.cancel();
    _textController.dispose();
    super.dispose();
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
          backgroundColor: const Color(0xFF0D0D10),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: AppTheme.borderColor),
          ),
          title: const Column(
            children: [
              Icon(LucideIcons.checkCircle, color: AppTheme.accentColor, size: 40),
              SizedBox(height: 12),
              Text(
                'Injection Completed!',
                style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          content: const Text(
            'Your text has been typed onto the laptop. Select what you would like to do next:',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actionsOverflowButtonSpacing: 8,
          actions: [
            AnimatedButton(
              onTap: () {
                Navigator.of(context).pop();
                _refillCode();
              },
              decoration: BoxDecoration(
                color: AppTheme.accentColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('REFILL PREVIOUS CODE', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
            AnimatedButton(
              onTap: () {
                Navigator.of(context).pop();
                _clearText();
              },
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: const Text('CLEAR AREA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Dismiss', style: TextStyle(color: AppTheme.textMuted)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _sendToLaptop() async {
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
    await _apiService.stopPasting();
    setState(() {
      _isTyping = false;
      _typingSecondsRemaining = 0;
      _countdownTimer?.cancel();
    });
    _showToast('Typing engine halted');
  }

  void _showHistoryDrawer() async {
    _showToast('Loading history...');
    final items = await _apiService.fetchHistory();
    setState(() {
      _history = items;
    });

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0B0B0B),
      barrierColor: Colors.black85,
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
                    const Row(
                      children: [
                        Icon(LucideIcons.history, color: AppTheme.accentColor, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Saved History',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppTheme.textMuted),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: _history.isEmpty
                      ? const Center(
                          child: Text(
                            'No history items found.',
                            style: TextStyle(color: AppTheme.textMuted),
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
                                  _textController.text = item.content;
                                  Navigator.of(context).pop();
                                  _showToast('Snippet loaded from history');
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.02),
                                    border: Border.all(color: AppTheme.borderColor),
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
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                          Text(
                                            '${item.timestamp} (${item.mode})',
                                            style: const TextStyle(
                                              fontSize: 10,
                                              color: AppTheme.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        item.content,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontFamily: 'monospace',
                                          color: AppTheme.textMuted,
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
        content: Text(message),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final expectedMinutes = (_textController.text.split(RegExp(r'\s+')).length / _wpm).toStringAsFixed(1);

    return Scaffold(
      body: Stack(
        children: [
          const AuroraBackground(),
          SafeArea(
            child: Column(
              children: [
                // Top Header Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(LucideIcons.arrowLeft, color: Colors.white70),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                          const Text(
                            'COMMAND CENTER',
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: AppTheme.accentColor,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          // History Button
                          IconButton(
                            icon: const Icon(LucideIcons.history, color: AppTheme.accentColor, size: 18),
                            onPressed: _showHistoryDrawer,
                          ),
                          // Refill Button
                          IconButton(
                            icon: const Icon(LucideIcons.rotateCcw, color: AppTheme.accentColor, size: 18),
                            onPressed: _refillCode,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Live Sync & Disconnect buttons row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _liveSync = !_liveSync;
                            });
                          },
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 14,
                            borderColor: _liveSync ? AppTheme.accentColor : null,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  LucideIcons.refreshCw,
                                  size: 16,
                                  color: _liveSync ? AppTheme.accentColor : AppTheme.textMuted,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'LIVE SYNC',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: _liveSync ? Colors.white : AppTheme.textMuted,
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
                          onTap: () async {
                            await ConnectionService().disconnect();
                            if (mounted) {
                              Navigator.of(context).pushNamedAndRemoveUntil('/connect', (route) => false);
                            }
                          },
                          child: const GlassmorphicCard(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 14,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.link2Off, size: 16, color: AppTheme.redStatus),
                                SizedBox(width: 8),
                                Text(
                                  'DISCONNECT',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.redStatus,
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
                
                // Input Area / Frosted text wrapper
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Stack(
                      children: [
                        // Input Field
                        Positioned.fill(
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.all(16),
                            borderRadius: 20,
                            child: TextField(
                              controller: _textController,
                              maxLines: null,
                              expands: true,
                              keyboardType: TextInputType.multiline,
                              style: const TextStyle(color: AppTheme.textMain, fontSize: 16, height: 1.5),
                              decoration: const InputDecoration(
                                hintText: 'Type or paste content here...',
                                hintStyle: TextStyle(color: Colors.white24),
                                border: InputBorder.none,
                              ),
                              onChanged: (text) {
                                if (_liveSync && text.isNotEmpty) {
                                  // Debounced or direct sync
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
                        // Countdown/Typing Overlay
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
                                      border: Border.all(color: AppTheme.accentColor, width: 2),
                                    ),
                                    child: Text(
                                      '${_typingSecondsRemaining}s',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentColor,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Typing...',
                                    style: TextStyle(
                                      color: AppTheme.textMuted,
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
                
                // Status Sync message
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      Icon(
                        _liveSync ? LucideIcons.checkCircle : LucideIcons.pauseCircle,
                        size: 14,
                        color: _liveSync ? const Color(0xFF00F59B) : AppTheme.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _liveSync
                            ? 'Live Sync ON: Pressing keys is synchronized.'
                            : 'Live Sync OFF: Dispatch manually with button below.',
                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                
                // Mode Grid Selector
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    children: [
                      // Flash Mode
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _mode = 'flash'),
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                            borderRadius: 14,
                            borderColor: _mode == 'flash' ? AppTheme.accentColor : null,
                            child: Column(
                              children: [
                                Icon(LucideIcons.zap, size: 16, color: _mode == 'flash' ? AppTheme.accentColor : Colors.white70),
                                const SizedBox(height: 4),
                                const Text('Flash', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                                const Text('Instant paste', style: TextStyle(fontSize: 9, color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Inline/Inject Mode
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _mode = 'inject'),
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                            borderRadius: 14,
                            borderColor: _mode == 'inject' ? AppTheme.accentColor : null,
                            child: Column(
                              children: [
                                Icon(LucideIcons.alignLeft, size: 16, color: _mode == 'inject' ? AppTheme.accentColor : Colors.white70),
                                const SizedBox(height: 4),
                                const Text('Inline', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                                const Text('One line flash', style: TextStyle(fontSize: 9, color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Typing Mode
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _mode = 'type'),
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                            borderRadius: 14,
                            borderColor: _mode == 'type' ? AppTheme.accentColor : null,
                            child: Column(
                              children: [
                                Icon(LucideIcons.keyboard, size: 16, color: _mode == 'type' ? AppTheme.accentColor : Colors.white70),
                                const SizedBox(height: 4),
                                const Text('Typing', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                                const Text('Human sim', style: TextStyle(fontSize: 9, color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Typing Speed WPM options
                if (_mode == 'type')
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Coding Mode (Handle IDE auto-brackets)', style: TextStyle(fontSize: 11, color: Colors.white70)),
                            Switch(
                              value: _isCoding,
                              activeColor: AppTheme.accentColor,
                              onChanged: (val) => setState(() => _isCoding = val),
                            ),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TYPING SPEED', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
                            Text('$_wpm WPM', style: const TextStyle(fontSize: 12, color: AppTheme.accentColor, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Slider(
                          min: 30,
                          max: 120,
                          divisions: 18,
                          value: _wpm.toDouble(),
                          onChanged: (val) => setState(() => _wpm = val.round()),
                        ),
                        Center(
                          child: Text(
                            'Expected Time: ${expectedMinutes}m',
                            style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                
                // Send To Laptop Button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: AnimatedButton(
                    onTap: _sendToLaptop,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.accentColor, Color(0xFF009BF5)],
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
                
                // Bottom options: Fetch, Select Copy, Halt, Clear
                Padding(
                  padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 20.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 3.5,
                    children: [
                      GestureDetector(
                        onTap: _fetchFromLaptop,
                        child: const GlassmorphicCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 12,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.download, size: 14, color: Colors.white70),
                              SizedBox(width: 6),
                              Text('Fetch', style: TextStyle(fontSize: 12, color: Colors.white70)),
                            ],
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _triggerCopy,
                        child: const GlassmorphicCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 12,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.copy, size: 14, color: Colors.white70),
                              SizedBox(width: 6),
                              Text('Select Copy', style: TextStyle(fontSize: 12, color: Colors.white70)),
                            ],
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _stopPasting,
                        child: GlassmorphicCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 12,
                          borderColor: AppTheme.redStatus.withOpacity(0.4),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.square, size: 14, color: AppTheme.redStatus),
                              SizedBox(width: 6),
                              Text('Stop Pasting', style: TextStyle(fontSize: 12, color: AppTheme.redStatus)),
                            ],
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _clearText,
                        child: const GlassmorphicCard(
                          padding: EdgeInsets.zero,
                          borderRadius: 12,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.trash2, size: 14, color: Colors.white70),
                              SizedBox(width: 6),
                              Text('Clear Area', style: TextStyle(fontSize: 12, color: Colors.white70)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
