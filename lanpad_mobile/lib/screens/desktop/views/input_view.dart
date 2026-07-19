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
  final String? initialText;
  const InputView({super.key, required this.state, this.initialText});

  @override
  State<InputView> createState() => _InputViewState();
}

class _InputViewState extends State<InputView> {
  final _controller = TextEditingController();
  late final FocusNode _focusNode;
  String _selectedMode = 'Flash'; // 'Flash', 'Type', 'Inject', 'Live Sync'
  int _wpm = 120;
  bool _isCoding = false;
  bool _showHistory = false;

  String? _selectedTargetDevice;

  int _line = 1;
  int _col = 1;
  int _chars = 0;
  int _lines = 1;

  bool _isMobileDevice(String name) {
    final n = name.toLowerCase();
    return n.contains('android') ||
           n.contains('ios') ||
           n.contains('phone') ||
           n.contains('mobile') ||
           n.contains('oneplus') ||
           n.contains('pixel') ||
           n.contains('galaxy') ||
           n.contains('iphone') ||
           n.contains('ipad') ||
           n.startsWith('cph') ||
           n.startsWith('sm-');
  }

  List<String> _getConnectedDesktops() {
    final allConnectedDevices = [
      if (widget.state.connectionService.isConnected && widget.state.connectionService.connectedDeviceName != null)
        widget.state.connectionService.connectedDeviceName!,
      ...widget.state.serverService.connectedDeviceNames,
      ...widget.state.connectedRemoteHubs.map((h) => h['name'] as String),
    ];
    return allConnectedDevices.where((d) => !_isMobileDevice(d)).toList();
  }

  List<String> _getConnectedMobiles() {
    final allConnectedDevices = [
      if (widget.state.connectionService.isConnected && widget.state.connectionService.connectedDeviceName != null)
        widget.state.connectionService.connectedDeviceName!,
      ...widget.state.serverService.connectedDeviceNames,
      ...widget.state.connectedRemoteHubs.map((h) => h['name'] as String),
    ];
    return allConnectedDevices.where((d) => _isMobileDevice(d)).toList();
  }

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode(
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent) {
          final isEnter = event.logicalKey == LogicalKeyboardKey.enter ||
              event.logicalKey == LogicalKeyboardKey.numpadEnter;
          final isMetaPressed = HardwareKeyboard.instance.isMetaPressed ||
              HardwareKeyboard.instance.isControlPressed;
          if (isEnter && isMetaPressed) {
            _sendText();
            return KeyEventResult.handled;
          }
        }
        return KeyEventResult.ignored;
      },
    );
    _controller.addListener(_updateEditorStats);
    if (widget.initialText != null) {
      _controller.text = widget.initialText!;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.state.onRefreshHistory();
      final desktops = _getConnectedDesktops();
      if (desktops.isNotEmpty && _selectedTargetDevice == null) {
        setState(() {
          _selectedTargetDevice = desktops.first;
        });
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
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
      widget.state.onRefreshHistory();
    } catch (e) {
      widget.state.onShowToast('Failed to send: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;
    final desktops = _getConnectedDesktops();
    final mobiles = _getConnectedMobiles();

    if (desktops.isEmpty && mobiles.isNotEmpty) {
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

    final double screenHeight = MediaQuery.of(context).size.height;
    // Calculate a comfortable dynamic height for the editor container
    final double editorHeight = (screenHeight - 380).clamp(260.0, 600.0);

    final Widget leftColumnContent = _selectedMode == 'Type'
        ? SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  _buildEditorContainer(height: editorHeight),
                  const SizedBox(height: 20),
                  _buildControlsAndSettings(isRunning),
                ],
              ),
            ),
          )
        : Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Expanded(
                  child: _buildEditorContainer(),
                ),
                const SizedBox(height: 20),
                _buildControlsAndSettings(isRunning),
              ],
            ),
          );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Left Column: Editor and Mode Controls (Flex 8) ──────────────────────
        Expanded(
          flex: 8,
          child: leftColumnContent,
        ),

        // ── Right Column: Recent Snippets & Tips (Flex 3) ───────────────────────
        if (_showHistory)
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
                  child: widget.state.history.isEmpty
                      ? Center(
                          child: Text(
                            'No recent snippets',
                            style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant),
                          ),
                        )
                      : ListView.builder(
                          itemCount: widget.state.history.length,
                          itemBuilder: (context, index) {
                            final snippet = widget.state.history[index];
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                snippet.content,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(fontSize: 12, color: kOnSurface),
                              ),
                              trailing: IconButton(
                                icon: const Icon(LucideIcons.copy, size: 14),
                                onPressed: () {
                                  _controller.text = snippet.content;
                                  widget.state.onShowToast('Snippet loaded');
                                },
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 24),

                // Pro Tip Box
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

  Widget _buildEditorContainer({double? height}) {
    return Container(
      height: height,
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
                Expanded(
                  child: Row(
                    children: [
                      Flexible(
                        child: Text('Shared Clipboard / Input Buffer',
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                            style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: kOnSurface)),
                      ),
                      const SizedBox(width: 8),
                      Text('UTF-8',
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              color: kOnSurfaceVariant.withOpacity(0.5))),
                      
                      // Target Device Selector
                      Builder(builder: (context) {
                        final desktops = _getConnectedDesktops();
                        if (desktops.length > 1) {
                          return Padding(
                            padding: const EdgeInsets.only(left: 16),
                            child: Container(
                              height: 26,
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: AppTheme.isDark ? const Color(0xFF1B2026) : const Color(0xFFF0F2F5),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: kOutlineVariant),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedTargetDevice ?? (desktops.isNotEmpty ? desktops.first : null),
                                  dropdownColor: AppTheme.isDark ? const Color(0xFF13171C) : Colors.white,
                                  icon: const Padding(
                                    padding: EdgeInsets.only(left: 4),
                                    child: Icon(LucideIcons.chevron_down, size: 10),
                                  ),
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: kOnSurface,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  items: desktops.map((d) => DropdownMenuItem(
                                    value: d,
                                    child: Text(d),
                                  )).toList(),
                                  onChanged: (val) {
                                    setState(() {
                                      _selectedTargetDevice = val;
                                    });
                                  },
                                ),
                              ),
                            ),
                          );
                        } else if (desktops.length == 1) {
                          return Padding(
                            padding: const EdgeInsets.only(left: 16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.isDark ? const Color(0xFF1B2026) : const Color(0xFFF0F2F5),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: kOutlineVariant),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.monitor, size: 11, color: kPrimary),
                                  const SizedBox(width: 5),
                                  Text(
                                    desktops.first,
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      color: kOnSurface,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      }),
                    ],
                  ),
                ),
                 IconButton(
                  onPressed: () {
                    setState(() {
                      _showHistory = !_showHistory;
                    });
                  },
                  icon: Icon(
                    LucideIcons.history,
                    size: 16,
                    color: _showHistory ? kPrimary : kOnSurfaceVariant,
                  ),
                  tooltip: _showHistory ? 'Hide History' : 'Show History',
                ),
                IconButton(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: _controller.text));
                    widget.state.onShowToast('Copied to clipboard');
                  },
                  icon: Icon(LucideIcons.copy, size: 16, color: kOnSurfaceVariant),
                  tooltip: 'Copy Buffer',
                ),
                IconButton(
                  onPressed: _controller.clear,
                  icon: Icon(LucideIcons.trash_2, size: 16, color: kError),
                  tooltip: 'Clear Buffer',
                ),
              ],
            ),
          ),

          // Editor Area
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Line Numbers
                Container(
                  width: 46,
                  padding: const EdgeInsets.only(top: 16, right: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.isDark ? const Color(0xFF0C0E11) : const Color(0xFFF8F9FA),
                    border: Border(right: BorderSide(color: kOutlineVariant)),
                  ),
                  child: ListView.builder(
                    padding: EdgeInsets.zero,
                    itemCount: _lines,
                    itemBuilder: (context, i) => Text(
                      '${i + 1}',
                      textAlign: TextAlign.right,
                      style: GoogleFonts.firaCode(
                        fontSize: 11,
                        color: kOnSurfaceVariant.withOpacity(0.35),
                      ),
                    ),
                  ),
                ),

                // Text Field Area
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    style: GoogleFonts.firaCode(
                      fontSize: 13,
                      color: kOnSurface,
                      height: 1.5,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Type, paste, or drag files here to start streaming...',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 13,
                        color: kOnSurfaceVariant.withOpacity(0.35),
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Editor Status Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.isDark ? const Color(0xFF0C0E11) : const Color(0xFFF8F9FA),
              border: Border(top: BorderSide(color: kOutlineVariant)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Ln $_line, Col $_col',
                  style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
                ),
                Text(
                  '$_chars chars, $_lines lines',
                  style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlsAndSettings(bool isRunning) {
    return Column(
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final isNarrow = constraints.maxWidth < 750;
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

            final selectCopyBtn = OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF34D399),
                side: BorderSide(color: const Color(0xFF34D399).withOpacity(0.3)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isRunning ? () async {
                final res = await widget.state.apiService.sendCopyCommand();
                if (res['status'] == 'success') {
                  final copiedText = res['text'] ?? '';
                  if (copiedText.isNotEmpty) {
                    _controller.text = copiedText;
                  }
                  widget.state.onShowToast('Text copied from remote device!');
                } else {
                  widget.state.onShowToast('Failed to copy: ${res['message']}', isError: true);
                }
              } : null,
              icon: const Icon(LucideIcons.copy, size: 16),
              label: Text('Select Copy',
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
            );

            final stopPastingBtn = OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFF87171),
                side: BorderSide(color: const Color(0xFFF87171).withOpacity(0.3)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isRunning ? () async {
                await widget.state.apiService.stopPasting();
                widget.state.onShowToast('Pasting halted');
              } : null,
              icon: const Icon(LucideIcons.circle_stop, size: 16),
              label: Text('Stop Pasting',
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
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
                  Row(
                    children: [
                      Expanded(child: selectCopyBtn),
                      const SizedBox(width: 8),
                      Expanded(child: stopPastingBtn),
                    ],
                  ),
                  const SizedBox(height: 12),
                  sendBtn,
                ],
              );
            } else {
              return Row(
                children: [
                  modeSelector,
                  const Spacer(),
                  selectCopyBtn,
                  const SizedBox(width: 12),
                  stopPastingBtn,
                  const SizedBox(width: 12),
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
