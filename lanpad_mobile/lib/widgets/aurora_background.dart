import 'dart:math';
import 'package:flutter/material.dart';
import '../config/theme.dart';

class AuroraBackground extends StatefulWidget {
  const AuroraBackground({super.key});

  @override
  State<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<AuroraBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
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
        final value = _controller.value * 2 * pi;
        return Stack(
          children: [
            // Dark base
            Container(color: Colors.black),
            
            // Aurora Blob 1 (Accent Blue)
            Positioned(
              top: -50 + sin(value) * 30,
              left: -30 + cos(value) * 20,
              child: Container(
                width: 350,
                height: 350,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.accentColor.withOpacity(0.25),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Aurora Blob 2 (Mid-Blue)
            Positioned(
              bottom: 50 + cos(value + 1) * 40,
              right: -50 + sin(value + 1) * 30,
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF2B6CB0).withOpacity(0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Aurora Blob 3 (Warm Plum/Plum Glow)
            Positioned(
              top: 150 + sin(value + 2) * 50,
              right: 20 + cos(value + 2) * 40,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF4C3B43).withOpacity(0.25),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Grain / Noise Overlay simulation
            Opacity(
              opacity: 0.03,
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  backgroundBlendMode: BlendMode.overlay,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
