import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

enum DesktopView { home, files, resources, history, settings, input, terms, setupPermissions, connectionRecovery, filePreviews }

class DesktopSidebar extends StatelessWidget {
  final DesktopView currentView;
  final ValueChanged<DesktopView> onNavigate;
  final DesktopState state;

  const DesktopSidebar({
    super.key,
    required this.currentView,
    required this.onNavigate,
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;

    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        border: Border(right: BorderSide(color: kOutlineVariant, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Brand Header ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('LANpad', style: GoogleFonts.outfit(
                  fontSize: 24, fontWeight: FontWeight.bold, color: kOnSurface,
                  letterSpacing: -0.5,
                )),
                Text('Local-First Utility', style: GoogleFonts.inter(
                  fontSize: 12, color: kOnSurfaceVariant.withValues(alpha: 0.6),
                )),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // ── Server Toggle ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: state.onToggleServer,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  gradient: isRunning
                      ? LinearGradient(colors: [
                          kErrorContainer.withValues(alpha: 0.5),
                          kErrorContainer.withValues(alpha: 0.3),
                        ])
                      : LinearGradient(colors: [kPrimary, kSecondary]),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isRunning
                        ? kError.withValues(alpha: 0.4)
                        : kPrimary.withValues(alpha: 0.3),
                  ),
                ),
                child: Center(
                  child: Text(
                    isRunning ? 'Stop Server' : 'Start Server',
                    style: GoogleFonts.inter(
                      fontSize: 13, fontWeight: FontWeight.bold,
                      color: isRunning ? kError : kSurfaceLowest,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Nav Items ─────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _NavItem(icon: LucideIcons.house, label: 'Home', view: DesktopView.home,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.folder_sync, label: 'Transfer', view: DesktopView.files,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.keyboard, label: 'Input', view: DesktopView.input,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.book_open, label: 'Resources', view: DesktopView.resources,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.history, label: 'History', view: DesktopView.history,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.settings, label: 'Settings', view: DesktopView.settings,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.shield_check, label: 'Permissions', view: DesktopView.setupPermissions,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.link_2_off, label: 'Recovery', view: DesktopView.connectionRecovery,
                  current: currentView, onTap: onNavigate),
                _NavItem(icon: LucideIcons.file_search, label: 'Previews', view: DesktopView.filePreviews,
                  current: currentView, onTap: onNavigate),
              ],
            ),
          ),

          // ── Device Footer ─────────────────────────────────────────
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: kSurfaceLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: kOutlineVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    width: 8, height: 8,
                    decoration: BoxDecoration(
                      color: isRunning ? kSuccess : kOnSurfaceVariant,
                      shape: BoxShape.circle,
                      boxShadow: isRunning
                          ? [BoxShadow(color: kSuccess.withValues(alpha: 0.5), blurRadius: 6)]
                          : [],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isRunning ? 'Server Live' : 'Offline',
                    style: GoogleFonts.inter(
                      fontSize: 11, fontWeight: FontWeight.w600,
                      color: isRunning ? kSuccess : kOnSurfaceVariant,
                    ),
                  ),
                ]),
                const SizedBox(height: 8),
                Row(children: [
                  Icon(LucideIcons.monitor, color: kOnSurfaceVariant, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isRunning
                          ? '${state.displayDeviceName} - ${state.serverService.sessionCode.toUpperCase()}'
                          : state.displayDeviceName,
                      style: GoogleFonts.outfit(
                        fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ]),
                if (isRunning) ...[
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(LucideIcons.network, color: kOnSurfaceVariant, size: 13),
                    const SizedBox(width: 8),
                    Text(state.localIp,
                      style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                  ]),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Private nav item ──────────────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final DesktopView view;
  final DesktopView current;
  final ValueChanged<DesktopView> onTap;

  const _NavItem({
    required this.icon, required this.label,
    required this.view, required this.current, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = current == view;
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: GestureDetector(
        onTap: () => onTap(view),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? kSurfaceVariant : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(children: [
            Icon(icon, size: 18, color: isSelected ? kPrimary : kOnSurfaceVariant),
            const SizedBox(width: 12),
            Text(label, style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? kPrimary : kOnSurfaceVariant,
            )),
          ]),
        ),
      ),
    );
  }
}
