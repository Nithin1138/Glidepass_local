import 'dart:io' show Platform;
import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Liquid Glass Card — Apple-style frosted glass.
///
/// The two things that make this read as *glass* instead of a flat
/// tinted box:
///   1. A gradient border that simulates light catching the rim
///      (bright top-left, fading to near-invisible bottom-right).
///   2. A very low-opacity fill (0.05–0.10) so the blurred content
///      behind it stays visible — this ONLY works if there's actually
///      something with detail behind the card (see GlassBackground).
class LiquidGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final Color? borderColor;
  final Color? liquidColor;
  final bool hasGlow;
  final double glowIntensity;
  final bool isFlat;
  final double blur;

  const LiquidGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 20,
    this.borderColor,
    this.liquidColor,
    this.hasGlow = false,
    this.glowIntensity = 0.3,
    this.isFlat = false,
    this.blur = 24.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final accentColor = context.accentColor;
    final br = BorderRadius.circular(borderRadius);

    final List<BoxShadow> shadows = [
      if (hasGlow)
        BoxShadow(
          color: accentColor.withOpacity(0.16 * glowIntensity),
          blurRadius: 30,
          spreadRadius: 0,
        ),
      if (!isFlat)
        BoxShadow(
          color: Colors.black.withOpacity(isDark ? 0.12 : 0.08),
          offset: const Offset(0, 8),
          blurRadius: 24,
        ),
    ];

    final bool isWindows = !kIsWeb && Platform.isWindows;
    final double effectiveBlur = isWindows ? 0.0 : blur;

    final cardContent = Stack(
      fit: StackFit.passthrough,
      children: [
        // Base tint — deliberately faint so blurred content shows through
        Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: liquidColor != null
                  ? [
                      liquidColor!.withOpacity(isDark ? (isWindows ? 0.22 : 0.14) : 0.30),
                      liquidColor!.withOpacity(isDark ? (isWindows ? 0.14 : 0.06) : 0.16),
                    ]
                  : isDark
                      ? [
                          context.cardBg.withOpacity(isWindows ? 0.85 : 0.4),
                          context.cardBg.withOpacity(isWindows ? 0.70 : 0.2),
                        ]
                      : [
                          context.cardBg.withOpacity(isWindows ? 0.95 : 0.6),
                          context.cardBg.withOpacity(isWindows ? 0.85 : 0.4),
                        ],
            ),
            borderRadius: br,
            // Specular gradient border — THIS is what sells "glass"
            border: borderColor != null
                ? Border.all(color: borderColor!, width: 1.2)
                : Border.all(
                    color: context.borderColor, 
                    width: 1.0,
                  ),
          ),
          child: child,
        ),
        // Top inner-highlight sheen — thin bright line along the top edge,
        // like light grazing the top of curved glass.
        Positioned(
          top: 0,
          left: borderRadius * 0.4,
          right: borderRadius * 0.4,
          child: Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  Colors.white.withOpacity(isDark ? 0.5 : 0.8),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );

    return RepaintBoundary(
      child: Container(
        decoration: BoxDecoration(borderRadius: br, boxShadow: shadows),
        child: ClipRRect(
          borderRadius: br,
          clipBehavior: Clip.antiAlias,
          child: effectiveBlur > 0
              ? BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: effectiveBlur, sigmaY: effectiveBlur),
                  child: cardContent,
                )
              : cardContent,
        ),
      ),
    );
  }
}

/// Flutter's built-in Border doesn't support gradients, so this is a
/// small painter that does. Drop it in the same file or a shared widgets file.
class GradientBoxBorder extends BoxBorder {
  final Gradient gradient;
  final double width;

  const GradientBoxBorder({required this.gradient, this.width = 1.0});

  @override
  BorderSide get bottom => BorderSide.none;
  @override
  BorderSide get top => BorderSide.none;

  @override
  void paint(
    Canvas canvas,
    Rect rect, {
    TextDirection? textDirection,
    BoxShape shape = BoxShape.rectangle,
    BorderRadius? borderRadius,
  }) {
    final Paint paint = Paint()
      ..shader = gradient.createShader(rect)
      ..strokeWidth = width
      ..style = PaintingStyle.stroke;

    final RRect rrect = (borderRadius ?? BorderRadius.zero)
        .toRRect(rect)
        .deflate(width / 2);

    canvas.drawRRect(rrect, paint);
  }

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.all(width);

  @override
  bool get isUniform => true;

  @override
  BoxBorder scale(double t) => GradientBoxBorder(gradient: gradient, width: width * t);
}
