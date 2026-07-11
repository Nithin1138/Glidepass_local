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
      duration: const Duration(seconds: 40),
    )..repeat();

    // Generate random stars for dark mode
    for (int i = 0; i < 60; i++) {
      _stars.add(
        Star(
          x: _random.nextDouble(),
          y: _random.nextDouble(),
          size: _random.nextDouble() * 2 + 0.5,
          opacity: _random.nextDouble() * 0.7 + 0.3,
          speed: _random.nextDouble() * 0.02 + 0.005,
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

        final decoration = isDark
            ? const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomLeft,
                  end: Alignment.topRight,
                  colors: [
                    Color(0xFF000511),
                    Color(0xFF021024),
                    Color(0xFF052659),
                    Color(0xFF021024),
                    Color(0xFF000511),
                  ],
                  stops: [0.0, 0.25, 0.55, 0.8, 1.0],
                ),
              )
            : const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFFFDFBF7),
                    Color(0xFFEBF0F5),
                  ],
                ),
              );

        return Stack(
          children: [
            // Base Background Silk Wave
            AnimatedContainer(
              duration: const Duration(milliseconds: 600),
              curve: Curves.easeInOut,
              decoration: decoration,
              width: double.infinity,
              height: double.infinity,
            ),
            
            // Nebula 1 (Glowing Theme Accent)
            Positioned(
              top: -150 + sin(_controller.value * 2 * pi) * 50,
              left: -150 + cos(_controller.value * 2 * pi) * 50,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 600),
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      context.accentColor.withOpacity(isDark ? 0.18 : 0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Nebula 2 (Glowing Indigo/Sky)
            Positioned(
              bottom: -100 + cos(_controller.value * 2 * pi + 1) * 60,
              right: -100 + sin(_controller.value * 2 * pi + 1) * 60,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 600),
                width: 450,
                height: 450,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      (isDark 
                          ? const Color(0x26C7EEFF) 
                          : context.accentColor.withOpacity(0.08)),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Stars Particle Field (Only drawn in Dark mode)
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

      paint.color = Colors.white.withOpacity(star.opacity);
      canvas.drawCircle(Offset(dx, dy), star.size, paint);
    }
  }

  @override
  bool shouldRepaint(covariant StarsPainter oldDelegate) => true;
}
