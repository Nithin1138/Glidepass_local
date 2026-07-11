import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/theme.dart';

class LiquidGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final Color? borderColor;
  final Color? liquidColor;
  final bool hasGlow;
  final double glowIntensity;
  final bool isFlat; // True for standard flat liquid glass without neumorphic shadow depth

  const LiquidGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 24,
    this.borderColor,
    this.liquidColor,
    this.hasGlow = false,
    this.glowIntensity = 0.3,
    this.isFlat = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final accentColor = context.accentColor;
    
    // Custom shadows simulating Neumorphism
    List<BoxShadow> shadows = [];
    if (!isFlat) {
      if (isDark) {
        shadows = [
          // Dark Theme Neumorphic Shadows (Deep Blue/Black)
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            offset: const Offset(5, 5),
            blurRadius: 12,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: Colors.white.withOpacity(0.02),
            offset: const Offset(-3, -3),
            blurRadius: 6,
            spreadRadius: 0,
          ),
          if (hasGlow)
            BoxShadow(
              color: accentColor.withOpacity(0.2 * glowIntensity),
              offset: const Offset(0, 0),
              blurRadius: 20,
              spreadRadius: 2,
            ),
        ];
      } else {
        // Light Theme Neumorphic Shadows (Soft extruded white/grey)
        shadows = [
          BoxShadow(
            color: const Color(0xFFBFC6D0).withOpacity(0.6),
            offset: const Offset(6, 6),
            blurRadius: 12,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: Colors.white,
            offset: const Offset(-6, -6),
            blurRadius: 12,
            spreadRadius: 1,
          ),
          if (hasGlow)
            BoxShadow(
              color: accentColor.withOpacity(0.15 * glowIntensity),
              offset: const Offset(0, 0),
              blurRadius: 15,
              spreadRadius: 1,
            ),
        ];
      }
    }

    // Liquid glossy gradient base
    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: liquidColor != null
          ? [liquidColor!.withOpacity(0.25), liquidColor!.withOpacity(0.08)]
          : (isDark
              ? [
                  Colors.white.withOpacity(0.06),
                  accentColor.withOpacity(0.03),
                  Colors.black.withOpacity(0.15),
                ]
              : [
                  Colors.white.withOpacity(0.85),
                  Colors.white.withOpacity(0.4),
                  const Color(0xFFDCE2E8).withOpacity(0.2),
                ]),
      stops: const [0.0, 0.5, 1.0],
    );

    final border = Border.all(
      color: borderColor ??
          (isDark
              ? Colors.white.withOpacity(0.12)
              : Colors.white.withOpacity(0.65)),
      width: 1.0,
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: shadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24.0, sigmaY: 24.0),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeInOut,
            padding: padding,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(borderRadius),
              border: border,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
