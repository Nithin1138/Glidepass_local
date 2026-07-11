import 'package:flutter/material.dart';
import '../config/theme.dart';

class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    
    final decoration = isDark
        ? const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomLeft,
              end: Alignment.topRight,
              colors: [
                Color(0xFF000511), // Bottom-left black corner
                Color(0xFF021024), // Obsidian blue
                Color(0xFF052659), // Deep dark navy wave
                Color(0xFF021024), // Obsidian blue
                Color(0xFF000511), // Top-right black corner
              ],
              stops: [0.0, 0.25, 0.55, 0.8, 1.0],
            ),
          )
        : const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFDFBF7), // Warm Cream
                Color(0xFFEBF0F5), // Soft Light Blue
              ],
            ),
          );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
      decoration: decoration,
    );
  }
}
