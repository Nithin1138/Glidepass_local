import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// History & Activity view — matches the Stitch "History & Activity" screen.
/// Shows a full-width table with Action / Target / Time columns.
class HistoryView extends StatelessWidget {
  final DesktopState state;
  const HistoryView({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;

    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text('History & Activity', style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
          const Spacer(),
          TextButton(
            onPressed: () => state.onShowToast('History cleared'),
            child: Text('Clear All',
              style: GoogleFonts.inter(color: kPrimary, fontSize: 13)),
          ),
        ]),
      ),

      // ── Content ─────────────────────────────────────────────────
      Expanded(child: isRunning
          ? _HistoryTable(state: state)
          : _OfflinePrompt(onStart: state.onToggleServer)),
    ]);
  }
}
class _HistoryTable extends StatelessWidget {
  final DesktopState state;
  const _HistoryTable({required this.state});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(children: [
        // Table container
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF161B22).withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: kOutlineVariant),
          ),
          child: Column(children: [
            // Header row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: kSurfaceContainer.withValues(alpha: 0.5),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                border: const Border(bottom: BorderSide(color: kOutlineVariant)),
              ),
              child: Row(children: [
                Expanded(flex: 6, child: Text('ACTION', style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.bold,
                  color: kOnSurfaceVariant, letterSpacing: 1.2))),
                Expanded(flex: 3, child: Text('TARGET', style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.bold,
                  color: kOnSurfaceVariant, letterSpacing: 1.2))),
                Expanded(flex: 3, child: Text('TIME', style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.bold,
                  color: kOnSurfaceVariant, letterSpacing: 1.2),
                  textAlign: TextAlign.right)),
              ]),
            ),
            // Data rows
            if (state.loadingHistory)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state.history.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text('No activity yet', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                ),
              )
            else
              ...List.generate(state.history.length, (i) {
                final item = state.history[i];
                
                // Determine icon and color based on mode
                IconData icon = LucideIcons.file;
                Color color = kOnSurfaceVariant;
                if (item.mode == 'copy' || item.mode == 'paste') {
                  icon = LucideIcons.clipboard_copy;
                  color = kPrimary;
                } else if (item.mode == 'link') {
                  icon = LucideIcons.link;
                  color = kSecondary;
                } else if (item.mode == 'text' || item.mode == 'type') {
                  icon = LucideIcons.keyboard;
                  color = kTertiary;
                }

                return _HistoryRow(
                  icon: icon, color: color, action: item.title,
                  detail: item.content, target: state.displayDeviceName, time: item.timestamp,
                  isLast: i == state.history.length - 1,
                );
              }),
          ]),
        ),
      ]),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String action, detail, target, time;
  final bool isLast;

  const _HistoryRow({
    required this.icon, required this.color,
    required this.action, required this.detail,
    required this.target, required this.time,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        border: isLast ? null
            : const Border(bottom: BorderSide(color: kOutlineVariant, width: 0.5)),
      ),
      child: Row(children: [
        Expanded(flex: 6, child: Row(children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(action, style: GoogleFonts.inter(
              fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface)),
            Text(detail, style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
        ])),
        Expanded(flex: 3, child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: kSurfaceVariant, borderRadius: BorderRadius.circular(6)),
          child: Text(target, style: GoogleFonts.inter(fontSize: 11, color: kOnSurface),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        )),
        Expanded(flex: 3, child: Text(time, style: GoogleFonts.inter(
          fontSize: 11, color: kOnSurfaceVariant), textAlign: TextAlign.right)),
      ]),
    );
  }
}

class _OfflinePrompt extends StatelessWidget {
  final VoidCallback onStart;
  const _OfflinePrompt({required this.onStart});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(LucideIcons.server_off, color: kOnSurfaceVariant, size: 48),
      const SizedBox(height: 16),
      Text('Server is offline', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w600, color: kOnSurface)),
      const SizedBox(height: 8),
      Text('Start the server to view activity history.',
        style: GoogleFonts.inter(fontSize: 14, color: kOnSurfaceVariant)),
      const SizedBox(height: 24),
      ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: onStart,
        child: Text('Start Server', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
    ]),
  );
}
