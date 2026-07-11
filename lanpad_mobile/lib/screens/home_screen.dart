import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/connection_service.dart';
import '../widgets/nebula_background.dart';
import '../widgets/connection_pill.dart';
import '../widgets/animated_button.dart';
import '../widgets/glassmorphic_card.dart';
import '../config/theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<void> _openSupport() async {
    final url = Uri.parse('https://lanpad.app/support');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final connectionService = ConnectionService();

    return Scaffold(
      body: Stack(
        children: [
          const NebulaBackground(),
          
          // Action Buttons at the Top
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Left Connection Pill & Switch
                const ConnectionPill(),
                
                // Top Right Navigation Icons
                Row(
                  children: [
                    // Notifications toggle replica (mocked matching index.html toggle)
                    GestureDetector(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Notifications synchronized with local device'),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: AppTheme.accentColor,
                          ),
                        );
                      },
                      child: const GlassmorphicCard(
                        padding: EdgeInsets.all(10),
                        borderRadius: 12,
                        child: Icon(
                          LucideIcons.bell,
                          size: 20,
                          color: AppTheme.textMain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Files Button
                    GestureDetector(
                      onTap: () => Navigator.of(context).pushNamed('/files'),
                      child: const GlassmorphicCard(
                        padding: EdgeInsets.all(10),
                        borderRadius: 12,
                        child: Icon(
                          LucideIcons.folderUp,
                          size: 20,
                          color: AppTheme.textMain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Support Help Button
                    GestureDetector(
                      onTap: _openSupport,
                      child: const GlassmorphicCard(
                        padding: EdgeInsets.all(10),
                        borderRadius: 12,
                        child: Icon(
                          LucideIcons.helpCircle,
                          size: 20,
                          color: AppTheme.textMain,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Main Onboarding Stack
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  // Logo Container
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.5),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.5),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.bolt,
                              size: 40,
                              color: AppTheme.accentColor,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'LANPAD',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 4.0,
                            color: AppTheme.textMain,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Hero headers
                  const Text(
                    'Linked Up',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Connected to laptop command center. Ready to bridge your data.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 48),
                  // Primary ENTER COMMAND CENTER Button
                  AnimatedButton(
                    onTap: () => Navigator.of(context).pushNamed('/center'),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.accentColor, Color(0xFF009BF5)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentGlow.withOpacity(0.4),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'ENTER COMMAND CENTER',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(LucideIcons.chevronRight, color: Colors.white, size: 20),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Secondary Browse Resources Button
                  AnimatedButton(
                    onTap: () => Navigator.of(context).pushNamed('/resources'),
                    decoration: BoxDecoration(
                      color: AppTheme.accentGlow.withOpacity(0.2),
                      border: Border.all(color: AppTheme.accentColor),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Browse Resources',
                          style: TextStyle(
                            color: AppTheme.accentColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(LucideIcons.compass, color: AppTheme.accentColor, size: 20),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Disconnect button
                  Center(
                    child: TextButton(
                      onPressed: () async {
                        await connectionService.disconnect();
                        if (context.mounted) {
                          Navigator.of(context).pushReplacementNamed('/connect');
                        }
                      },
                      child: const Text(
                        'Disconnect Server',
                        style: TextStyle(
                          color: AppTheme.redStatus,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
