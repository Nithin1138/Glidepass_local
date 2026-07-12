import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Immersive Aurora Background — renders a super-professional, clean, and simple
/// background inspired by modern premium tech apps (e.g. super.money, Linear).
/// It features a solid base color, a single very subtle warm background glow,
/// and a clean, structured dotted grid overlay.
class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppTheme.themeModeNotifier,
      builder: (context, _) {
        final isDark = context.isDark;

        // Base background color
        final baseColor = isDark 
            ? const Color(0xFF060B16)  // Deep Indigo Dark Base
            : const Color(0xFFF5F8FF); // Premium Light Base

        // Very soft, atmospheric accent glows
        final glowColor = isDark
            ? const Color(0xFF4DDCFF) // Accent Cyan Glow
            : const Color(0xFFDBEAFE); // Soft Blue Wash

        // Dotted grid color
        final gridColor = isDark
            ? const Color(0xFF24304D).withOpacity(0.25) // Subtle dark grid
            : const Color(0xFFDCE4F0).withOpacity(0.50); // Subtle light grid

        return AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
          color: baseColor,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // ── One single subtle glow orb (Top-Right) for atmospheric depth ──
              Positioned(
                top: -120,
                right: -120,
                child: _AnimatedOrb(
                  color: glowColor,
                  size: 450,
                  opacity: isDark ? 0.08 : 0.35,
                ),
              ),

              // ── A secondary very soft base depth glow (Bottom-Left) ──
              Positioned(
                bottom: -150,
                left: -150,
                child: _AnimatedOrb(
                  color: isDark ? const Color(0xFF17213A) : const Color(0xFFE0E7FF),
                  size: 500,
                  opacity: isDark ? 0.25 : 0.35,
                ),
              ),

              // ── Clean & Structured Dotted Grid Overlay (like super.money/Linear) ──
              Positioned.fill(
                child: CustomPaint(
                  painter: _DottedGridPainter(color: gridColor),
                ),
              ),

              // ── Soft Vignette to smoothly blend the edges ──
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.3,
                    colors: [
                      Colors.transparent,
                      baseColor.withOpacity(isDark ? 0.50 : 0.20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AnimatedOrb extends StatelessWidget {
  final Color color;
  final double size;
  final double opacity;

  const _AnimatedOrb({
    required this.color,
    required this.size,
    required this.opacity,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeInOut,
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            color.withOpacity(opacity),
            color.withOpacity(0),
          ],
        ),
      ),
    );
  }
}

/// Custom Painter to draw a clean, premium dotted grid
class _DottedGridPainter extends CustomPainter {
  final Color color;

  _DottedGridPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    const double spacing = 24.0; // Clean spacing between dots

    for (double x = spacing; x < size.width; x += spacing) {
      for (double y = spacing; y < size.height; y += spacing) {
        canvas.drawPoints(PointMode.points, [Offset(x, y)], paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DottedGridPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
