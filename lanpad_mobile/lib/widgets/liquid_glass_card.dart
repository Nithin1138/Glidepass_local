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
  final bool isFlat;

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

    // ── Glow shadow (accent) ─────────────────────────────────────────────
    final List<BoxShadow> shadows = [
      if (hasGlow)
        BoxShadow(
          color: accentColor.withOpacity(0.28 * glowIntensity),
          blurRadius: 24,
          spreadRadius: 2,
        ),
      if (!isFlat && isDark)
        BoxShadow(
          color: Colors.black.withOpacity(0.35),
          offset: const Offset(0, 6),
          blurRadius: 16,
        ),
      if (!isFlat && !isDark)
        BoxShadow(
          color: Colors.black.withOpacity(0.08),
          offset: const Offset(0, 4),
          blurRadius: 12,
        ),
    ];

    // ── Frosted glass fill ───────────────────────────────────────────────
    // Dark: translucent white sheen (like iOS control center)
    // Light: clean white translucency
    final Color fillColor = liquidColor != null
        ? liquidColor!.withOpacity(isDark ? 0.18 : 0.28)
        : (isDark
            ? Colors.white.withOpacity(0.10)   // frosted glass base
            : Colors.white.withOpacity(0.70));

    // Top-edge specular highlight — the key liquid glass "rim"
    final Gradient glassGradient = isDark
        ? LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withOpacity(0.18),  // bright top-left rim
              Colors.white.withOpacity(0.07),  // mid translucency
              Colors.white.withOpacity(0.04),  // dark bottom-right
            ],
            stops: const [0.0, 0.4, 1.0],
          )
        : LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withOpacity(0.90),
              Colors.white.withOpacity(0.55),
              Colors.white.withOpacity(0.35),
            ],
            stops: const [0.0, 0.5, 1.0],
          );

    // ── Border: bright top/left specular + subtle overall ───────────────
    final Border glassBorder = borderColor != null
        ? Border.all(color: borderColor!, width: 1.0)
        : (isDark
            ? Border(
                top: BorderSide(color: Colors.white.withOpacity(0.30), width: 1.0),
                left: BorderSide(color: Colors.white.withOpacity(0.20), width: 0.8),
                right: BorderSide(color: Colors.white.withOpacity(0.06), width: 0.8),
                bottom: BorderSide(color: Colors.white.withOpacity(0.06), width: 0.8),
              )
            : Border.all(color: Colors.white.withOpacity(0.70), width: 1.0));

    return AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: shadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 28.0, sigmaY: 28.0),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOut,
            padding: padding,
            decoration: BoxDecoration(
              color: fillColor,
              gradient: glassGradient,
              borderRadius: BorderRadius.circular(borderRadius),
              border: glassBorder,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
