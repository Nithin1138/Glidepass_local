import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

class NebulaBackground extends StatefulWidget {
  const NebulaBackground({super.key});

  @override
  State<NebulaBackground> createState() => _NebulaBackgroundState();
}

class _NebulaBackgroundState extends State<NebulaBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  final List<Star> _stars = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 25), // slightly faster, smoother morphing
    )..repeat();

    // Generate random stars for neon dark space field
    for (int i = 0; i < 70; i++) {
      _stars.add(
        Star(
          x: _random.nextDouble(),
          y: _random.nextDouble(),
          size: _random.nextDouble() * 1.8 + 0.6,
          opacity: _random.nextDouble() * 0.6 + 0.4,
          speed: _random.nextDouble() * 0.015 + 0.005,
        ),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final isDark = context.isDark;

        // Base Neon Dark Gradient (Obsidian to Midnight Obsidian)
        final decoration = isDark
            ? const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF030303), // pure obsidian
                    Color(0xFF080D1A), // deep space midnight
                    Color(0xFF04060C),
                    Color(0xFF0C081A), // hints of deep violet-black
                    Color(0xFF030303),
                  ],
                  stops: [0.0, 0.3, 0.55, 0.8, 1.0],
                ),
              )
            : const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFFFBFDFF),
                    Color(0xFFF0F4F8),
                  ],
                ),
              );

        // Sinusoidal path coordinates for fluid organic motion
        final double progress = _controller.value * 2 * pi;
        final double x1 = sin(progress) * 80;
        final double y1 = cos(progress) * 80;
        final double x2 = cos(progress + pi / 2) * 90;
        final double y2 = sin(progress + pi / 2) * 90;
        final double x3 = sin(progress * 1.5) * 60;
        final double y3 = cos(progress * 1.5) * 60;

        return Stack(
          children: [
            // Base Background
            AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeInOut,
              decoration: decoration,
              width: double.infinity,
              height: double.infinity,
            ),
            
            // Neon Orb 1: Electric Emerald Green (Left-center, drifts right/down)
            Positioned(
              left: 40 + x1,
              top: 100 + y1,
              child: Container(
                width: 600,
                height: 600,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF00FF88).withValues(alpha: isDark ? 0.09 : 0.05),
                      const Color(0xFF10B981).withValues(alpha: isDark ? 0.03 : 0.02),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Neon Orb 2: Electric Cyan (Right-center, drifts left/up)
            Positioned(
              right: 60 + x2,
              bottom: 120 + y2,
              child: Container(
                width: 550,
                height: 550,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF00F2FF).withValues(alpha: isDark ? 0.08 : 0.04),
                      const Color(0xFF0077FF).withValues(alpha: isDark ? 0.02 : 0.01),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // Neon Orb 3: Deep Cyber Purple / Magenta (Top-Right, morphs)
            Positioned(
              right: -50 + x3,
              top: -50 + y3,
              child: Container(
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFBD00FF).withValues(alpha: isDark ? 0.07 : 0.03),
                      const Color(0xFF7C3AED).withValues(alpha: isDark ? 0.02 : 0.01),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Particle Stars Field
            if (isDark)
              CustomPaint(
                painter: StarsPainter(
                  stars: _stars,
                  progress: _controller.value,
                ),
                size: Size.infinite,
              ),
          ],
        );
      },
    );
  }
}

class Star {
  double x;
  double y;
  final double size;
  final double opacity;
  final double speed;

  Star({
    required this.x,
    required this.y,
    required this.size,
    required this.opacity,
    required this.speed,
  });
}

class StarsPainter extends CustomPainter {
  final List<Star> stars;
  final double progress;

  StarsPainter({required this.stars, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    
    for (var star in stars) {
      double currentY = star.y - (progress * star.speed);
      if (currentY < 0) {
        currentY += 1.0;
      }
      
      final double dx = star.x * size.width;
      final double dy = currentY * size.height;

      // Soft glow effect on the stars
      paint.color = Colors.white.withValues(alpha: star.opacity);
      canvas.drawCircle(Offset(dx, dy), star.size, paint);
    }
  }

  @override
  bool shouldRepaint(covariant StarsPainter oldDelegate) => true;
}
