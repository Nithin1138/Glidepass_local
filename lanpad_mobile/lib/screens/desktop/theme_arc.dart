import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ═══════════════════════════════════════════════════════════════════════════
// THEME: "ARC" — playful, colorful, continuously hue-shifting gradient mesh
// (coral → orange → violet → blue), dark chrome around it. Reference: Arc
// Browser's iconic animated colorful backgrounds / "Little Arc" gradients.
//
// Palette:
//   #121014 — app background (warm near-black)
//   #1A171C — sidebar
//   #211D24 — elevated cards
//   #2C2730 — active/selected
//   #38323D — borders
//   #FF6F61 — coral (accent 1)
//   #7C5CFF — violet (accent 2)
//   #FFC15E — amber (accent 3, gradient only)
//   #FFFFFF — text
// ═══════════════════════════════════════════════════════════════════════════

Color get kSurface          => AppTheme.isDark ? const Color(0xFF121014) : const Color(0xFFFDF8F6);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF1A171C) : const Color(0xFFFFFFFF);
Color get kSurfaceVariant   => AppTheme.isDark ? const Color(0xFF2C2730) : const Color(0xFFF3E7E4);
Color get kSurfaceLow       => AppTheme.isDark ? const Color(0xFF161318) : const Color(0xFFF8EFEC);
Color get kSurfaceLowest    => AppTheme.isDark ? const Color(0xFF0D0B0F) : const Color(0xFFEEDDD7);

Color get kCard             => AppTheme.isDark ? const Color(0xFF211D24) : const Color(0xFFFFFFFF);
Color get kOutlineVariant   => AppTheme.isDark ? const Color(0xFF38323D) : const Color(0xFFE6D6D0);

Color get kOnSurface        => AppTheme.isDark ? const Color(0xFFFFFFFF) : const Color(0xFF201A22);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFFB0A6B5) : const Color(0xFF7A6E77);

Color get kPrimary          => const Color(0xFFFF6F61); // coral
Color get kSecondary        => const Color(0xFF7C5CFF); // violet
Color get kTertiary         => const Color(0xFFFFC15E); // amber

Color get kSuccess          => const Color(0xFF4ADE80);
Color get kError            => AppTheme.isDark ? const Color(0xFFFF6B6B) : const Color(0xFFDC2626);
Color get kErrorContainer   => AppTheme.isDark ? const Color(0xFF3A1616) : const Color(0xFFFFE1DE);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle get kHeadlineLg => GoogleFonts.sora(
  fontSize: 32, fontWeight: FontWeight.w600, color: kOnSurface, letterSpacing: -0.5,
);
TextStyle get kHeadlineMd => GoogleFonts.sora(
  fontSize: 24, fontWeight: FontWeight.w600, color: kOnSurface, letterSpacing: -0.4,
);
TextStyle get kBodyLg => GoogleFonts.inter(
  fontSize: 16, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kBodyMd => GoogleFonts.inter(
  fontSize: 14, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kLabelMd => GoogleFonts.inter(
  fontSize: 12, fontWeight: FontWeight.w500, color: kOnSurface, letterSpacing: 0.2,
);
TextStyle get kMonoSm => GoogleFonts.robotoMono(
  fontSize: 12, fontWeight: FontWeight.w400, color: kOnSurface,
);

BoxDecoration get kGlassCard => BoxDecoration(
  color: AppTheme.isDark
      ? const Color(0xFF211D24).withValues(alpha: 0.78)
      : const Color(0xFFFFFFFF).withValues(alpha: 0.9),
  borderRadius: BorderRadius.circular(20),
  border: Border.all(
    color: AppTheme.isDark
        ? const Color(0xFF38323D).withValues(alpha: 0.8)
        : const Color(0xFFE6D6D0),
  ),
);

BoxDecoration get kSurfaceCard => BoxDecoration(
  color: kCard,
  borderRadius: BorderRadius.circular(20),
  border: Border.all(color: kOutlineVariant),
);

InputDecoration kSearchDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
  prefixIcon: Icon(Icons.search_rounded, size: 16, color: kOnSurfaceVariant),
  filled: true,
  fillColor: kSurfaceContainer,
  contentPadding: const EdgeInsets.symmetric(vertical: 8),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: BorderSide(color: kOutlineVariant),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: BorderSide(color: kOutlineVariant),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: BorderSide(color: kPrimary, width: 1.5),
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND — continuously hue-rotating gradient mesh (coral →
// amber → violet → blue) with three blobs drifting independently, giving
// the living, playful color-shift feel of Arc Browser's backgrounds.
// Usage: Stack([ArcAnimatedBackground(), ...yourContent])
// ═══════════════════════════════════════════════════════════════════════════
class ArcAnimatedBackground extends StatefulWidget {
  const ArcAnimatedBackground({super.key});

  @override
  State<ArcAnimatedBackground> createState() => _ArcAnimatedBackgroundState();
}

class _ArcAnimatedBackgroundState extends State<ArcAnimatedBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 20))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Rotates a base color's hue slowly over time for a living gradient.
  Color _hueShift(Color base, double t, double degreesPerCycle) {
    final hsl = HSLColor.fromColor(base);
    final newHue = (hsl.hue + degreesPerCycle * t) % 360;
    return hsl.withHue(newHue).toColor();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = constraints.maxHeight;
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final t = _controller.value; // 0..1
            final phase = t * 2 * math.pi;

            final coral = _hueShift(const Color(0xFFFF6F61), t, 40);
            final violet = _hueShift(const Color(0xFF7C5CFF), t, 40);
            final amber = _hueShift(const Color(0xFFFFC15E), t, 40);

            return Container(
              width: w,
              height: h,
              color: kSurface,
              child: Stack(
                children: [
                  _blob(w, h, baseX: 0.22, baseY: 0.28, radius: 0.16, speed: 0.9, phase: phase,
                      color: coral.withValues(alpha: 0.20), size: 560),
                  _blob(w, h, baseX: 0.78, baseY: 0.35, radius: 0.18, speed: 0.6, phase: phase + 2.0,
                      color: violet.withValues(alpha: 0.18), size: 540),
                  _blob(w, h, baseX: 0.50, baseY: 0.80, radius: 0.14, speed: 1.15, phase: phase + 4.1,
                      color: amber.withValues(alpha: 0.16), size: 480),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _blob(
    double w,
    double h, {
    required double baseX,
    required double baseY,
    required double radius,
    required double speed,
    required double phase,
    required Color color,
    required double size,
  }) {
    final cx = (baseX + radius * math.cos(phase * speed)) * w;
    final cy = (baseY + radius * math.sin(phase * speed)) * h;
    return Positioned(
      left: cx - size / 2,
      top: cy - size / 2,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0.0)]),
        ),
      ),
    );
  }
}
