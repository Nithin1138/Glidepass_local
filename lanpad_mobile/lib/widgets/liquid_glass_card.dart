import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Liquid Glass Card — iOS Control Center style.
/// Performance notes:
///  - Plain Container (no AnimatedContainer) — no per-rebuild overhead
///  - BackdropFilter blur at 18px sigma (balanced quality/perf)
///  - RepaintBoundary applied by caller if needed
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

    // ── Shadow ──────────────────────────────────────────────────────────
    final List<BoxShadow> shadows = [
      if (hasGlow)
        BoxShadow(
          color: accentColor.withOpacity(0.25 * glowIntensity),
          blurRadius: 20,
          spreadRadius: 1,
        ),
      if (!isFlat)
        BoxShadow(
          color: Colors.black.withOpacity(isDark ? 0.30 : 0.10),
          offset: const Offset(0, 4),
          blurRadius: 14,
        ),
    ];

    // ── Fill ────────────────────────────────────────────────────────────
    // Dark: translucent glass (like iOS) — white base at low opacity so
    //       the blurred background colour shows through vibrantly.
    // Light: white-based translucency so text stays readable.
    final Color? customFill =
        liquidColor != null ? liquidColor!.withOpacity(isDark ? 0.15 : 0.20) : null;

    final Color darkFill = Colors.white.withOpacity(0.09);
    final Color lightFill = Colors.white.withOpacity(0.72);

    // ── Top-edge specular gradient (the "rim") ──────────────────────────
    final Gradient glassGradient = isDark
        ? LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withOpacity(0.18), // bright top-left specular
              Colors.white.withOpacity(0.06), // mid
              Colors.white.withOpacity(0.02), // dark bottom-right
            ],
            stops: const [0.0, 0.45, 1.0],
          )
        : LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withOpacity(0.95), // near-opaque top-left
              Colors.white.withOpacity(0.70), // mid
              Colors.white.withOpacity(0.50), // slight tint bottom-right
            ],
            stops: const [0.0, 0.5, 1.0],
          );

    // ── Border ──────────────────────────────────────────────────────────
    final BoxBorder glassBorder = borderColor != null
        ? Border.all(color: borderColor!, width: 1.0)
        : (isDark
            ? Border(
                top: BorderSide(
                    color: Colors.white.withOpacity(0.32), width: 1.0),
                left: BorderSide(
                    color: Colors.white.withOpacity(0.22), width: 0.8),
                right: BorderSide(
                    color: Colors.white.withOpacity(0.07), width: 0.8),
                bottom: BorderSide(
                    color: Colors.white.withOpacity(0.07), width: 0.8),
              )
            : Border.all(
                color: Colors.white.withOpacity(0.80), width: 1.2));

    final br = BorderRadius.circular(borderRadius);

    return Container(
      decoration: BoxDecoration(
        borderRadius: br,
        boxShadow: shadows,
      ),
      child: ClipRRect(
        borderRadius: br,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18.0, sigmaY: 18.0),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: customFill ?? (isDark ? darkFill : lightFill),
              gradient: glassGradient,
              borderRadius: br,
              border: glassBorder,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
