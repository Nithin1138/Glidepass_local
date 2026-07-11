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
  bool _isSwitching = false;

  Future<void> _switchMode(ConnectionService connectionService) async {
    if (_isSwitching) return;
    final isLan = connectionService.isLocalConnection;
    // Check availability of the target mode
    if (isLan) {
      final tunnel = connectionService.tunnelUrl;
      if (tunnel == null || tunnel.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Relay not available – start a tunnel on server'),
            behavior: SnackBarBehavior.floating,
          ));
        }
        return;
      }
    } else {
      final lan = connectionService.lanIp;
      if (lan == null || lan.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('LAN not available – check Wi-Fi'),
            behavior: SnackBarBehavior.floating,
          ));
        }
        return;
      }
    }
    setState(() => _isSwitching = true);
    final success = await connectionService.switchConnection();
    if (mounted) {
      setState(() => _isSwitching = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success
            ? 'Switched to ${connectionService.isLocalConnection ? 'LAN Direct' : 'Hybrid Relay'}'
            : 'Failed to switch – check connection'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: success ? AppTheme.accentColor : AppTheme.redStatus,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final connectionService = ConnectionService();

    return ListenableBuilder(
      listenable: connectionService,
      builder: (context, _) {
        if (!connectionService.isConnected) {
          return const SizedBox.shrink();
        }

        final isLocal = connectionService.isLocalConnection;
        final statusColor = isLocal ? const Color(0xFF00F59B) : const Color(0xFF3B82F6);
        final connectionText = isLocal ? 'LAN Direct' : 'Hybrid Tunnel';

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Status Pill
            LiquidGlassCard(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
              borderRadius: 20,
              isFlat: true,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.8),
                          blurRadius: 6,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Connection: ',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppTheme.textMuted,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  Text(
                    connectionText,
                    style: TextStyle(
                      fontSize: 10,
                      color: AppTheme.textMain,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            // Mode Switch Button – two arrows
            GestureDetector(
              onTap: () => _switchMode(connectionService),
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
                        color: AppTheme.textMain,
                      ),
              ),
            ),
          ],
        );
      },
    );
  }
}
