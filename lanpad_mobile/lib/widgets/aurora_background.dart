import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Static gradient background — no animation, no CustomPainter, no per-frame repaints.
/// Performance: O(1), renders once per theme change only.
/// The BackdropFilter in LiquidGlassCard will blur this cleanly.
class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
      decoration: isDark
          ? const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF000D1F), // near-black navy
                  Color(0xFF021540), // deep blue
                  Color(0xFF0B2A6B), // royal navy
                  Color(0xFF021540), // repeat deep blue
                  Color(0xFF000D1F), // fade back dark
                ],
                stops: [0.0, 0.25, 0.55, 0.78, 1.0],
              ),
            )
          : const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF0F4FF), // cool white-blue
                  Color(0xFFE8EFFA), // soft periwinkle
                  Color(0xFFF5F3FF), // lavender tint
                  Color(0xFFEFF6FF), // ice blue
                ],
                stops: [0.0, 0.33, 0.66, 1.0],
              ),
            ),
    );
  }
}
