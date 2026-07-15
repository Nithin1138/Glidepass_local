import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Premium Input Composer view matching the user's uploaded mock design.
class InputView extends StatefulWidget {
  final DesktopState state;
  const InputView({super.key, required this.state});

  @override
  State<InputView> createState() => _InputViewState();
}

class _InputViewState extends State<InputView> {
  final _controller = TextEditingController();
  String _selectedMode = 'Flash'; // 'Flash', 'Type', 'Inject', 'Live Sync'
  int _wpm = 120;
  bool _isCoding = false;

  int _line = 1;
  int _col = 1;
  int _chars = 0;
  int _lines = 1;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_updateEditorStats);
  }

  @override
  void dispose() {
    _controller.removeListener(_updateEditorStats);
    _controller.dispose();
    super.dispose();
  }

  void _updateEditorStats() {
    final text = _controller.text;
    final selection = _controller.selection;

    int line = 1;
    int col = 1;
    if (selection.isValid && selection.baseOffset >= 0 && selection.baseOffset <= text.length) {
      final beforeSelection = text.substring(0, selection.baseOffset);
      final lines = beforeSelection.split('\n');
      line = lines.length;
      col = lines.last.length + 1;
    }

    final totalLines = text.isEmpty ? 1 : text.split('\n').length;

    setState(() {
      _line = line;
      _col = col;
      _chars = text.length;
      _lines = totalLines;
    });
  }

  Future<void> _sendText() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    try {
      // Mapping GUI mode selection to API mode parameters
      String apiMode = 'flash';
      if (_selectedMode == 'Type') apiMode = 'typing';
      else if (_selectedMode == 'Inject') apiMode = 'inject';
      else if (_selectedMode == 'Live Sync') apiMode = 'sync';

      await widget.state.apiService.sendPaste(
        text: text,
        mode: apiMode,
        wpm: _selectedMode == 'Type' ? _wpm : 240,
        isCoding: _selectedMode == 'Type' ? _isCoding : false,
      );
      widget.state.onShowToast('Text sent successfully');
      _controller.clear();
    } catch (e) {
      widget.state.onShowToast('Failed to send: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;
    final isConnected = widget.state.connectionService.isConnected;
    final connectedName = widget.state.connectionService.connectedDeviceName ?? '';
    final isMobile = connectedName.toLowerCase().contains('android') ||
                     connectedName.toLowerCase().contains('ios') ||
                     connectedName.toLowerCase().contains('phone') ||
                     connectedName.toLowerCase().contains('mobile');

    if (isConnected && isMobile) {
      return Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: const Color(0xFF13171C),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF262D35)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 30,
                offset: const Offset(0, 10),
              )
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFB4AB).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  LucideIcons.keyboard_off,
                  color: Color(0xFFFFB4AB),
                  size: 40,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Input Control Not Supported',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Keyboard input injection is only available when controlling another Desktop node. File transfers and Clipboard sync are fully supported for Mobile nodes.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFFC4C7C5),
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Left Column: Editor and Mode Controls (Flex 8) ──────────────────────
        Expanded(
          flex: 8,
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                // Editor Container
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.isDark ? const Color(0xFF0F1216) : const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: kOutlineVariant),
                    ),
                    child: Column(
                      children: [
                        // Editor Header
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border(bottom: BorderSide(color: kOutlineVariant)),
                          ),
                          child: Row(
                            children: [
                              Text('buffer: snippet_alpha.sh',
                                  style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: kOnSurface)),
                              const SizedBox(width: 8),
                              Text('UTF-8',
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: kOnSurfaceVariant.withOpacity(0.5))),
                              const Spacer(),
                              IconButton(
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: _controller.text));
                                  widget.state.onShowToast('Copied to clipboard');
                                },
                                icon: Icon(LucideIcons.copy, size: 16, color: kOnSurfaceVariant),
                                tooltip: 'Copy Buffer',
                              ),
                              IconButton(
                                onPressed: () {
                                  _controller.clear();
                                },
                                icon: Icon(LucideIcons.trash_2, size: 16, color: kOnSurfaceVariant),
                                tooltip: 'Clear Buffer',
                              ),
                            ],
                          ),
                        ),

                        // Editor Text Field
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            maxLines: null,
                            expands: true,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              color: kOnSurface,
                              height: 1.6,
                              fontWeight: FontWeight.w400,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Enter commands, notes, or raw text to transfer...',
                              hintStyle: GoogleFonts.inter(
                                  color: kOnSurfaceVariant.withOpacity(0.5),
                                  fontSize: 14),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.all(20),
                            ),
                          ),
                        ),

                        // Editor Footer
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            border: Border(top: BorderSide(color: kOutlineVariant)),
                          ),
                          child: Row(
                            children: [
                              Text('Ln $_line, Col $_col',
                                  style: GoogleFonts.inter(
                                      fontSize: 11, color: kOnSurfaceVariant)),
                              const Spacer(),
                              Text('CHARS: $_chars',
                                  style: GoogleFonts.inter(
                                      fontSize: 11, color: kOnSurfaceVariant)),
                              const SizedBox(width: 16),
                              Text('LINES: $_lines',
                                  style: GoogleFonts.inter(
                                      fontSize: 11, color: kOnSurfaceVariant)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Controls Row & Expandable Settings Panel
                Column(
                  children: [
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 620;
                        final modeSelector = Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: kSurfaceContainer,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: kOutlineVariant),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildModeBtn('Flash'),
                              _buildModeBtn('Type'),
                              _buildModeBtn('Inject'),
                              _buildModeBtn('Live Sync', hasDot: true),
                            ],
                          ),
                        );

                        final sendBtn = ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF38BDF8).withOpacity(0.12),
                            foregroundColor: const Color(0xFF38BDF8),
                            side: BorderSide(color: const Color(0xFF38BDF8).withOpacity(0.3)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: isRunning ? _sendText : null,
                          icon: const Icon(LucideIcons.rocket, size: 16),
                          label: Text('Send to Active App',
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                        );

                        if (isNarrow) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              modeSelector,
                              const SizedBox(height: 12),
                              sendBtn,
                            ],
                          );
                        } else {
                          return Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              modeSelector,
                              sendBtn,
                            ],
                          );
                        }
                      },
                    ),

                    // Expandable typing speed & mode options if 'Type' is selected
                    if (_selectedMode == 'Type') ...[
                      const SizedBox(height: 16),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.isDark ? const Color(0xFF0F1216) : const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: kOutlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Typing Speed (WPM)',
                                    style: GoogleFonts.inter(fontSize: 13, color: kOnSurface, fontWeight: FontWeight.w600)),
                                Text('$_wpm WPM',
                                    style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                activeTrackColor: const Color(0xFF38BDF8),
                                inactiveTrackColor: kOutlineVariant,
                                thumbColor: const Color(0xFF38BDF8),
                                overlayColor: const Color(0xFF38BDF8).withOpacity(0.12),
                              ),
                              child: Slider(
                                value: _wpm.toDouble(),
                                min: 10,
                                max: 300,
                                divisions: 29,
                                onChanged: (val) {
                                  setState(() {
                                    _wpm = val.round();
                                  });
                                },
                              ),
                            ),
                            Divider(color: kOutlineVariant, height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Coding / IDE Mode',
                                        style: GoogleFonts.inter(fontSize: 13, color: kOnSurface, fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 2),
                                    Text('Optimizes character pauses for developer IDEs',
                                        style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                                  ],
                                ),
                                Switch(
                                  value: _isCoding,
                                  onChanged: (val) {
                                    setState(() {
                                      _isCoding = val;
                                    });
                                  },
                                  activeColor: const Color(0xFF38BDF8),
                                  activeTrackColor: const Color(0xFF38BDF8).withOpacity(0.3),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),

        // ── Right Column: Recent Snippets & Tips (Flex 3) ───────────────────────
        Container(
          width: 320,
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: kOutlineVariant)),
            color: kSurfaceLow,
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('RECENT SNIPPETS',
                  style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: kOnSurfaceVariant,
                      letterSpacing: 1.2)),
              const SizedBox(height: 16),

              // Snippet List
              Expanded(
                child: widget.state.loadingHistory
                    ? const Center(child: CircularProgressIndicator())
                    : widget.state.history.isEmpty
                        ? Center(
                            child: Text('No snippets yet',
                                style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13)),
                          )
                        : ListView.builder(
                            itemCount: widget.state.history.length > 5 ? 5 : widget.state.history.length,
                            itemBuilder: (context, i) {
                              final item = widget.state.history[i];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12.0),
                                child: InkWell(
                                  onTap: () {
                                    _controller.text = item.content;
                                  },
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: AppTheme.isDark ? const Color(0xFF0F1216) : const Color(0xFFFFFFFF),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: kOutlineVariant),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(item.mode.toUpperCase(),
                                                style: GoogleFonts.inter(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: kSecondary)),
                                            Text(item.timestamp,
                                                style: GoogleFonts.inter(
                                                    fontSize: 10, color: kOnSurfaceVariant)),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          item.content,
                                          style: GoogleFonts.inter(fontSize: 12, color: kOnSurface, height: 1.4),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),

              // Pro Tip Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: kSurfaceContainer.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kOutlineVariant),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(LucideIcons.info, size: 16, color: kPrimary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('PRO TIP',
                              style: GoogleFonts.inter(
                                  fontSize: 11, fontWeight: FontWeight.bold, color: kOnSurface)),
                          const SizedBox(height: 4),
                          Text(
                            'Use Cmd+Enter to quickly dispatch the current buffer using the selected mode.',
                            style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModeBtn(String mode, {bool hasDot = false}) {
    final isSelected = _selectedMode == mode;
    return GestureDetector(
      onTap: () => setState(() => _selectedMode = mode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF38BDF8).withOpacity(0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFF38BDF8).withOpacity(0.3) : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasDot) ...[
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
            ],
            Text(
              mode,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? const Color(0xFF38BDF8) : kOnSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
