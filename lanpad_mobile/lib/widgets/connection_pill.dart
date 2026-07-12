import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../services/connection_service.dart';
import '../config/theme.dart';
import 'liquid_glass_card.dart';

class ConnectionPill extends StatefulWidget {
  const ConnectionPill({super.key});

  @override
  State<ConnectionPill> createState() => _ConnectionPillState();
}

class _ConnectionPillState extends State<ConnectionPill> {
  final ConnectionService _cs = ConnectionService();
  bool _isSwitching = false;

  Future<void> _doSwitch() async {
    if (_isSwitching) return;
    setState(() => _isSwitching = true);
    final success = await _cs.switchConnection();
    if (!mounted) return;
    setState(() => _isSwitching = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(
        success
            ? 'Switched to ${_cs.isLocalConnection ? 'LAN Direct' : 'Hybrid Relay'}'
            : 'Cannot switch – other mode not available',
      ),
      behavior: SnackBarBehavior.floating,
      backgroundColor: success ? AppTheme.accentColor : AppTheme.redStatus,
      duration: const Duration(seconds: 2),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _cs,
      builder: (context, _) {
        if (!_cs.isConnected) return const SizedBox.shrink();

        final isLocal = _cs.isLocalConnection;
        final statusColor = isLocal ? const Color(0xFF00F59B) : const Color(0xFF3B82F6);
        final connectionText = isLocal ? 'LAN' : 'Relay';
        final deviceName = _cs.connectedDeviceName;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Status pill
            LiquidGlassCard(
              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 12),
              borderRadius: 20,
              isFlat: true,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dot
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: statusColor.withOpacity(0.8), blurRadius: 6, spreadRadius: 1),
                      ],
                    ),
                  ),
                  const SizedBox(width: 7),
                  if (deviceName != null && deviceName.isNotEmpty) ...[
                    Text(
                      deviceName,
                      style: TextStyle(fontSize: 11, color: context.textMain, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '  ·  $connectionText',
                      style: TextStyle(fontSize: 10, color: context.textMuted, fontWeight: FontWeight.w400),
                    ),
                  ] else ...[
                    Text(
                      connectionText,
                      style: TextStyle(fontSize: 11, color: context.textMain, fontWeight: FontWeight.bold),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 6),
            // Switch button (⇄)
            GestureDetector(
              onTap: _doSwitch,
              child: LiquidGlassCard(
                padding: const EdgeInsets.all(8),
                borderRadius: 12,
                isFlat: true,
                child: _isSwitching
                    ? SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.5,
                          color: AppTheme.accentColor,
                        ),
                      )
                    : Icon(
                        LucideIcons.arrow_left_right,
                        size: 14,
                        color: context.textMain,
                      ),
              ),
            ),
          ],
        );
      },
    );
  }
}
