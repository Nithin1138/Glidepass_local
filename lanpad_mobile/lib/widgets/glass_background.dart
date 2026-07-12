import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Wrap your screen's Scaffold body in this to get the soft, colorful,
/// out-of-focus glow you see behind the room pills / warm-neutral-cold
/// selector in the reference screenshots.
class GlassBackground extends StatelessWidget {
  final Widget child;
  final List<Color>? orbColors;
  final Color baseColor;

  const GlassBackground({
    super.key,
    required this.child,
    this.orbColors,
    this.baseColor = const Color(0xFF0A0E1F),
  });

  @override
  Widget build(BuildContext context) {
    final colors = orbColors ??
        const [
          Color(0xFF3B5BFF), // blue
          Color(0xFFFF7A45), // amber/orange accent (matches your logo)
          Color(0xFF7C3AED), // violet
        ];

    return Container(
      color: baseColor,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Soft blurred orbs — positioned off-grid, large radius, low opacity.
          // These get further blurred by any BackdropFilter cards placed on top.
          Positioned(
            top: -80,
            left: -60,
            child: _Orb(color: colors[0], size: 320, opacity: 0.35),
          ),
          Positioned(
            top: 180,
            right: -100,
            child: _Orb(color: colors[1], size: 260, opacity: 0.22),
          ),
          Positioned(
            bottom: -120,
            left: 40,
            child: _Orb(color: colors[2], size: 300, opacity: 0.25),
          ),
          // Subtle noise/vignette to avoid a flat gradient look
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topCenter,
                radius: 1.4,
                colors: [
                  Colors.transparent,
                  baseColor.withOpacity(0.6),
                ],
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _Orb extends StatelessWidget {
  final Color color;
  final double size;
  final double opacity;

  const _Orb({required this.color, required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
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
