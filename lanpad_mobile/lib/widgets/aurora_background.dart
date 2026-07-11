import 'package:flutter/material.dart';
import '../config/theme.dart';

class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    
    final gradient = isDark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF02060E), // Deep Black-Blue
              Color(0xFF051733), // Muted slate navy blue
            ],
            stops: [0.4, 1.0],
          )
        : const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFFDFBF7), // Warm Cream
              Color(0xFFEBF0F5), // Soft Light Blue
            ],
          );

    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
      ),
    );
  }
}
