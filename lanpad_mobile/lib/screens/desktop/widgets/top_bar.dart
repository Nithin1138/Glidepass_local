import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

class DesktopTopBar extends StatelessWidget {
  final DesktopState state;

  const DesktopTopBar({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;
    final connectedCount = state.serverService.connectedClientsCount;

    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: kSurface.withValues(alpha: 0.95),
        border: const Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
      ),
      child: Row(children: [
        // Node status pill
        _StatusPill(
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            _Dot(color: isRunning ? kSuccess : kOnSurfaceVariant, glow: isRunning),
            const SizedBox(width: 8),
            Text(
              isRunning ? 'NODE: ${state.localIp}' : 'OFFLINE',
              style: GoogleFonts.inter(
                fontSize: 11, fontWeight: FontWeight.w500,
                color: kOnSurfaceVariant, letterSpacing: 0.5,
              ),
            ),
          ]),
        ),

        // Secure link badge
        if (isRunning) ...[
          const SizedBox(width: 10),
          _StatusPill(
            color: kPrimary.withValues(alpha: 0.08),
            borderColor: kPrimary.withValues(alpha: 0.2),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.wifi, color: kPrimary, size: 12),
              const SizedBox(width: 6),
              Text('SECURE LINK ESTABLISHED',
                style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.w600,
                  color: kPrimary, letterSpacing: 0.8,
                )),
            ]),
          ),
        ],

        const Spacer(),

        // Connected devices chip
        if (connectedCount > 0) ...[
          _StatusPill(child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(LucideIcons.users, color: kPrimary, size: 13),
            const SizedBox(width: 6),
            Text('$connectedCount device${connectedCount > 1 ? 's' : ''}',
              style: GoogleFonts.inter(
                fontSize: 11, color: kOnSurface, fontWeight: FontWeight.w600)),
          ])),
          const SizedBox(width: 8),
        ],

        // Action icons
        _TopBarIcon(icon: LucideIcons.bell, tooltip: 'Notifications', onTap: () {}),
        const SizedBox(width: 4),
        _TopBarIcon(icon: LucideIcons.wifi, tooltip: 'Reconnect', onTap: state.onReconnect),
      ]),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final Widget child;
  final Color? color;
  final Color? borderColor;

  const _StatusPill({required this.child, this.color, this.borderColor});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
    decoration: BoxDecoration(
      color: color ?? kSurfaceContainer,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: borderColor ?? kOutlineVariant),
    ),
    child: child,
  );
}

class _Dot extends StatelessWidget {
  final Color color;
  final bool glow;
  const _Dot({required this.color, this.glow = false});

  @override
  Widget build(BuildContext context) => Container(
    width: 7, height: 7,
    decoration: BoxDecoration(
      color: color, shape: BoxShape.circle,
      boxShadow: glow ? [BoxShadow(color: color.withValues(alpha: 0.5), blurRadius: 6)] : [],
    ),
  );
}

class _TopBarIcon extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _TopBarIcon({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) => Tooltip(
    message: tooltip,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, color: kOnSurfaceVariant, size: 18),
      ),
    ),
  );
}
