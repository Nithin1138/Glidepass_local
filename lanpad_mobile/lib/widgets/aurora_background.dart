import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Full-screen animated background with slow-drifting colour blobs.
/// In dark mode: deep navy base with blue/purple/indigo orbs.
/// In light mode: warm cream base with soft pastel blobs.
class AuroraBackground extends StatefulWidget {
  const AuroraBackground({super.key});

  @override
  State<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<AuroraBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  // Blob definitions: [x_offset, y_offset, size_factor, phase_offset]
  static const _blobs = [
    [0.15, 0.20, 1.0, 0.0],
    [0.80, 0.15, 0.85, 2.1],
    [0.50, 0.55, 1.1, 4.2],
    [0.10, 0.75, 0.75, 1.0],
    [0.85, 0.70, 0.90, 3.3],
  ];

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    final List<Color> blobColors = isDark
        ? [
            const Color(0xFF0356C5), // Royal blue
            const Color(0xFF1A237E), // Deep indigo
            const Color(0xFF5C35CC), // Purple
            const Color(0xFF0B2A6B), // Navy
            const Color(0xFF0D47A1), // Blue
          ]
        : [
            const Color(0xFFBBDEFB), // Light blue
            const Color(0xFFE8EAF6), // Lavender
            const Color(0xFFC8E6C9), // Mint
            const Color(0xFFF3E5F5), // Pale purple
            const Color(0xFFE0F7FA), // Cyan
          ];

    final Color baseColor =
        isDark ? const Color(0xFF010D1F) : const Color(0xFFFDFBF7);

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value * 2 * pi;
        return CustomPaint(
          painter: _AuroraPainter(
            t: t,
            baseColor: baseColor,
            blobColors: blobColors,
            isDark: isDark,
          ),
          child: const SizedBox.expand(),
        );
      },
    );
  }
}

class _AuroraPainter extends CustomPainter {
  final double t;
  final Color baseColor;
  final List<Color> blobColors;
  final bool isDark;

  static const _blobs = [
    [0.15, 0.20, 1.0, 0.0],
    [0.80, 0.15, 0.85, 2.1],
    [0.50, 0.55, 1.1, 4.2],
    [0.10, 0.75, 0.75, 1.0],
    [0.85, 0.70, 0.90, 3.3],
  ];

  const _AuroraPainter({
    required this.t,
    required this.baseColor,
    required this.blobColors,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Base fill
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = baseColor,
    );

    // Draw each animated blob
    for (int i = 0; i < _blobs.length; i++) {
      final b = _blobs[i];
      final phase = b[3];
      final drift = 0.07 * size.height;

      final cx = b[0] * size.width + sin(t + phase) * drift * 0.6;
      final cy = b[1] * size.height + cos(t * 0.7 + phase) * drift;
      final r = b[2] * (isDark ? size.width * 0.55 : size.width * 0.45);

      final paint = Paint()
        ..shader = RadialGradient(
          colors: [
            blobColors[i % blobColors.length].withOpacity(isDark ? 0.35 : 0.25),
            blobColors[i % blobColors.length].withOpacity(0.0),
          ],
        ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: r))
        ..blendMode = BlendMode.srcOver;

      canvas.drawCircle(Offset(cx, cy), r, paint);
    }
  }

  @override
  bool shouldRepaint(_AuroraPainter old) => old.t != t || old.isDark != isDark;
}
