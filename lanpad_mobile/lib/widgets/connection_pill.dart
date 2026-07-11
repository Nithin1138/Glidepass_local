import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/connection_service.dart';
import '../config/theme.dart';
import 'glassmorphic_card.dart';

class ConnectionPill extends StatelessWidget {
  const ConnectionPill({super.key});

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
            GlassmorphicCard(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
              borderRadius: 20,
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
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.textMain,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Switch Connection Icon Button (refresh-cw)
            if (connectionService.tunnelUrl != null || connectionService.lanIp != null)
              GestureDetector(
                onTap: () async {
                  final success = await connectionService.switchConnection();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          success
                              ? 'Switched connection path'
                              : 'Failed to switch connection path',
                        ),
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: success ? AppTheme.accentColor : AppTheme.redStatus,
                      ),
                    );
                  }
                },
                child: GlassmorphicCard(
                  padding: const EdgeInsets.all(8),
                  borderRadius: 12,
                  child: const Icon(
                    LucideIcons.refreshCw,
                    size: 16,
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
