import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Input Composer view — matches Stitch "Input Composer" blueprint.
/// Large text compose area + quick phrases + typing settings.
class InputView extends StatefulWidget {
  final DesktopState state;
  const InputView({super.key, required this.state});

  @override
  State<InputView> createState() => _InputViewState();
}

class _InputViewState extends State<InputView> {
  final _controller = TextEditingController();
  bool _instantMode = false;
  bool _autoReturn = true;

  static const _quickPhrases = [
    'Yes, I can handle that.',
    'On my way!',
    'Let me check and get back.',
    'Done ✓',
    'Sounds good!',
    'One moment please...',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _sendText() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    try {
      await widget.state.apiService.sendPaste(
        text: text,
        mode: _instantMode ? 'instant' : 'type',
        wpm: 240,
        isCoding: false,
      );
      widget.state.onShowToast('Text sent to device');
      _controller.clear();
    } catch (e) {
      widget.state.onShowToast('Failed to send text: $e', isError: true);
    }
  }

  Future<void> _sendPhrase(String phrase) async {
    try {
      await widget.state.apiService.sendPaste(
        text: phrase,
        mode: 'instant',
        wpm: 240,
        isCoding: false,
      );
      widget.state.onShowToast('"$phrase" sent to device');
    } catch (e) {
      widget.state.onShowToast('Failed to send phrase: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;

    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text('Input Composer', style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isRunning ? kSuccess.withValues(alpha: 0.12) : kSurfaceContainer,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isRunning ? kSuccess.withValues(alpha: 0.3) : kOutlineVariant),
            ),
            child: Text(isRunning ? 'READY' : 'SERVER OFFLINE',
              style: GoogleFonts.inter(
                fontSize: 10, fontWeight: FontWeight.bold,
                color: isRunning ? kSuccess : kOnSurfaceVariant,
                letterSpacing: 0.8)),
          ),
        ]),
      ),

      // ── Content ─────────────────────────────────────────────────
      Expanded(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            // Compose card
            _GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Compose & Send', style: GoogleFonts.outfit(
                fontSize: 18, fontWeight: FontWeight.bold, color: kOnSurface)),
              const SizedBox(height: 4),
              Text(
                'Type text here to send to your connected mobile device as keyboard input.',
                style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: kSurfaceLowest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kOutlineVariant),
                ),
                child: TextField(
                  controller: _controller,
                  maxLines: 6, minLines: 6,
                  style: GoogleFonts.inter(fontSize: 14, color: kOnSurface),
                  decoration: InputDecoration(
                    hintText: 'Type your message or paste content here...',
                    hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isRunning ? _sendText : null,
                  icon: const Icon(LucideIcons.send, size: 16),
                  label: Text('Send to Device',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: kOutlineVariant),
                    foregroundColor: kOnSurface,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {},
                  icon: const Icon(LucideIcons.clipboard, size: 15),
                  label: Text('Paste Clipboard', style: GoogleFonts.inter(fontSize: 13)),
                ),
                const Spacer(),
                // Character count
                ValueListenableBuilder(
                  valueListenable: _controller,
                  builder: (_, val, __) => Text(
                    '${val.text.length} chars',
                    style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
                  ),
                ),
              ]),
            ])),
            const SizedBox(height: 20),

            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Quick phrases
              Expanded(child: _GlassCard(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quick Phrases', style: GoogleFonts.outfit(
                    fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                  const SizedBox(height: 4),
                  Text('Tap to send instantly',
                    style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                  const SizedBox(height: 14),
                  ..._quickPhrases.map((phrase) => GestureDetector(
                    onTap: () => _sendPhrase(phrase),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: kSurfaceLowest,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: kOutlineVariant),
                      ),
                      child: Row(children: [
                        Expanded(child: Text(phrase,
                          style: GoogleFonts.inter(fontSize: 13, color: kOnSurface))),
                        const Icon(LucideIcons.send, size: 13, color: kOnSurfaceVariant),
                      ]),
                    ),
                  )),
                ],
              ))),
              const SizedBox(width: 16),

              // Settings panel
              Expanded(child: _GlassCard(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Typing Settings', style: GoogleFonts.outfit(
                    fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                  const SizedBox(height: 16),
                  _SettingToggle('Instant Mode', 'Type directly without compose step.',
                    _instantMode, (v) => setState(() => _instantMode = v)),
                  const Divider(color: kOutlineVariant, height: 24),
                  _SettingToggle('Auto Return', 'Press Enter after sending text.',
                    _autoReturn, (v) => setState(() => _autoReturn = v)),
                  const Divider(color: kOutlineVariant, height: 24),
                  // Keyboard shortcut hint
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: kSurfaceLowest,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: kOutlineVariant),
                    ),
                    child: Row(children: [
                      const Icon(LucideIcons.command, color: kPrimary, size: 16),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Keyboard Shortcut', style: GoogleFonts.inter(
                          fontSize: 12, fontWeight: FontWeight.bold, color: kOnSurface)),
                        Text('⌘⇧V — Quick paste & send',
                          style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                      ])),
                    ]),
                  ),
                ],
              ))),
            ]),
          ]),
        ),
      ),
    ]);
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: kGlassCard,
    child: child,
  );
}

class _SettingToggle extends StatelessWidget {
  final String title;
  final String desc;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SettingToggle(this.title, this.desc, this.value, this.onChanged);

  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: GoogleFonts.inter(
        fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
      Text(desc, style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
    ])),
    Switch(
      value: value, onChanged: onChanged,
      activeThumbColor: kPrimary,
      activeTrackColor: kPrimary.withValues(alpha: 0.3),
      inactiveThumbColor: kOnSurfaceVariant,
      inactiveTrackColor: kSurfaceVariant,
    ),
  ]);
}
