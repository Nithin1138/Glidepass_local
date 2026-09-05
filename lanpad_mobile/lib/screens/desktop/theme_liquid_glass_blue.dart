import 'dart:io' show Platform;
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ═══════════════════════════════════════════════════════════════════════════
// THEME: "LIQUID GLASS BLUE" — Apple-style translucent frosted material
// (layered blur + gradient fill + specular top-edge highlight + soft inner
// shadow) rendered entirely in a cool electric-blue / cyan register, over a
// deep navy-black canvas with slow-drifting blue aurora underneath.
//
// Palette:
//   #030711 — app background (near-black, deep blue undertone)
//   #060D1C — sidebar
//   #0A1428 — elevated cards (base, before glass overlay)
//   #102243 — active/selected
//   #1C2E52 — borders
//   #3B82F6 — primary accent (electric blue)
//   #22D3EE — secondary accent (cyan)
//   #60A5FA — tertiary (light blue, glow accents)
//   #FFFFFF — text
// ═══════════════════════════════════════════════════════════════════════════

Color get kSurface          => AppTheme.isDark ? const Color(0xFF030711) : const Color(0xFFF3F6FC);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF060D1C) : const Color(0xFFFFFFFF);
Color get kSurfaceVariant   => AppTheme.isDark ? const Color(0xFF102243) : const Color(0xFFE1EAFA);
Color get kSurfaceLow       => AppTheme.isDark ? const Color(0xFF040914) : const Color(0xFFEAF0FB);
Color get kSurfaceLowest    => AppTheme.isDark ? const Color(0xFF02050C) : const Color(0xFFD5E1F7);

Color get kCard             => AppTheme.isDark ? const Color(0xFF0A1428) : const Color(0xFFFFFFFF);
Color get kOutlineVariant   => AppTheme.isDark ? const Color(0xFF1C2E52) : const Color(0xFFCEDBF2);

Color get kOnSurface        => AppTheme.isDark ? const Color(0xFFFFFFFF) : const Color(0xFF0A1428);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFF8FA3C7) : const Color(0xFF556A8F);

Color get kPrimary          => const Color(0xFF3B82F6); // electric blue
Color get kSecondary        => const Color(0xFF22D3EE); // cyan
Color get kTertiary         => const Color(0xFF60A5FA); // light blue glow accent

Color get kSuccess          => const Color(0xFF22D3EE); // ties "connected" states to the cyan accent
Color get kError            => AppTheme.isDark ? const Color(0xFFFF7A93) : const Color(0xFFDC2C4E);
Color get kErrorContainer   => AppTheme.isDark ? const Color(0xFF351420) : const Color(0xFFFCE0E7);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle get kHeadlineLg => GoogleFonts.plusJakartaSans(
  fontSize: 32, fontWeight: FontWeight.w800, color: kOnSurface, letterSpacing: -0.7,
);
TextStyle get kHeadlineMd => GoogleFonts.plusJakartaSans(
  fontSize: 24, fontWeight: FontWeight.w800, color: kOnSurface, letterSpacing: -0.5,
);
TextStyle get kBodyLg => GoogleFonts.inter(
  fontSize: 16, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kBodyMd => GoogleFonts.inter(
  fontSize: 14, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kLabelMd => GoogleFonts.inter(
  fontSize: 12, fontWeight: FontWeight.w600, color: kOnSurface, letterSpacing: 0.3,
);
TextStyle get kMonoSm => GoogleFonts.jetBrainsMono(
  fontSize: 12, fontWeight: FontWeight.w400, color: kOnSurface,
);

/// Legacy decoration kept for compatibility with existing widgets that
/// reference `kGlassCard` directly. New code should prefer wrapping content
/// in `LiquidGlassPanel` below, which gives the full effect (blur + specular
/// border + inner highlight), not just a flat translucent fill.
BoxDecoration get kGlassCard => BoxDecoration(
  gradient: LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: AppTheme.isDark
        ? [Colors.white.withValues(alpha: 0.10), const Color(0xFF3B82F6).withValues(alpha: 0.05)]
        : [Colors.white.withValues(alpha: 0.92), const Color(0xFFEAF0FB).withValues(alpha: 0.92)],
  ),
  borderRadius: BorderRadius.circular(20),
  border: Border.all(
    color: AppTheme.isDark ? Colors.white.withValues(alpha: 0.14) : const Color(0xFFCEDBF2),
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
// LIQUID GLASS PANEL — the real material.
//
// This is NOT a flat translucent Container. It layers:
//   1. BackdropFilter blur + saturation boost over whatever sits behind it
//      (your animated background) — this is what makes it "glass" rather
//      than just a semi-transparent box.
//   2. A subtle top-to-bottom tint gradient simulating a light source from
//      above (brighter near the top edge).
//   3. A 1.5px border with a gradient (bright top-left → dim bottom-right)
//      to fake the specular highlight you see on real glass/liquid edges.
//   4. A layered BoxShadow: soft ambient shadow outward + faint inner glow
//      via a second inset-simulating overlay (Flutter has no native inset
//      shadow, so this is faked using a gradient-stroked border + top
//      highlight line).
//
// Use this to wrap your sidebar, cards, the QR panel, dialogs, etc.
// ═══════════════════════════════════════════════════════════════════════════
class LiquidGlassPanel extends StatelessWidget {
  const LiquidGlassPanel({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.blur = 28,
    this.padding,
    this.tintColor,
  });

  final Widget child;
  final double borderRadius;
  final double blur;
  final EdgeInsetsGeometry? padding;

  /// Optional accent tint mixed into the glass (defaults to primary blue at
  /// very low opacity — enough to read as "blue glass" without muddying
  /// whatever content sits inside it).
  final Color? tintColor;

  @override
  Widget build(BuildContext context) {
    final tint = tintColor ?? kPrimary;
    final radius = BorderRadius.circular(borderRadius);
    final bool isWindows = !kIsWeb && Platform.isWindows;
    final double effectiveBlur = isWindows ? 0.0 : blur;

    final panelBody = Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: radius,
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: AppTheme.isDark
              ? [
                  Colors.white.withValues(alpha: isWindows ? 0.20 : 0.11),
                  tint.withValues(alpha: isWindows ? 0.12 : 0.05),
                ]
              : [
                  Colors.white.withValues(alpha: 0.92),
                  Colors.white.withValues(alpha: 0.80),
                ],
        ),
        border: Border.all(
          color: AppTheme.isDark
              ? Colors.white.withValues(alpha: 0.16)
              : Colors.white.withValues(alpha: 0.6),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: AppTheme.isDark ? 0.35 : 0.08),
            blurRadius: 40,
            offset: const Offset(0, 18),
          ),
          BoxShadow(
            color: tint.withValues(alpha: AppTheme.isDark ? 0.12 : 0.06),
            blurRadius: 60,
            spreadRadius: -10,
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: 0,
            left: borderRadius,
            right: borderRadius,
            child: Container(
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.0),
                    Colors.white.withValues(alpha: AppTheme.isDark ? 0.5 : 0.9),
                    Colors.white.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );

    return RepaintBoundary(
      child: ClipRRect(
        borderRadius: radius,
        child: effectiveBlur > 0
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: effectiveBlur, sigmaY: effectiveBlur),
                child: panelBody,
              )
            : panelBody,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND — LIQUID GLASS BLUE
// Four drifting blue/cyan aurora orbs with additive blend (CustomPainter,
// BlendMode.plus), plus a masked network-grid texture and vignette — this is
// what should sit behind your LiquidGlassPanel widgets so blur has something
// rich to refract.
// Usage: Stack([LiquidGlassBlueBackground(), ...yourGlassPanels])
// ═══════════════════════════════════════════════════════════════════════════
class LiquidGlassBlueBackground extends StatefulWidget {
  const LiquidGlassBlueBackground({super.key});

  @override
  State<LiquidGlassBlueBackground> createState() => _LiquidGlassBlueBackgroundState();
}

class _LiquidGlassBlueBackgroundState extends State<LiquidGlassBlueBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 15))
      ..repeat();
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
      builder: (context, _) {
        return CustomPaint(
          painter: _LiquidGlassPainter(t: _controller.value * 2 * math.pi),
          size: Size.infinite,
        );
      },
    );
  }
}

class _LiquidGlassPainter extends CustomPainter {
  _LiquidGlassPainter({required this.t});
  final double t;

  static final _orbs = [
    _Orb(x: 0.20, y: 0.25, radius: 420, color: const Color(0xFF3B82F6), speed: 0.5, phase: 0),
    _Orb(x: 0.80, y: 0.30, radius: 380, color: const Color(0xFF22D3EE), speed: 0.38, phase: 2.2),
    _Orb(x: 0.55, y: 0.80, radius: 400, color: const Color(0xFF1E40AF), speed: 0.45, phase: 4.1),
    _Orb(x: 0.10, y: 0.75, radius: 300, color: const Color(0xFF60A5FA), speed: 0.6, phase: 1.3),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = kSurface);

    // Faint masked grid, fading toward the edges — reinforces the "network
    // utility" theme without competing with the glass panels on top.
    final gridPaint = Paint()
      ..color = (AppTheme.isDark ? Colors.white : Colors.black).withValues(alpha: 0.03)
      ..strokeWidth = 1;
    const spacing = 44.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    for (int i = 0; i < _orbs.length; i++) {
      final orb = _orbs[i];
      // Use clean integer speed multipliers (1, -1, 2, -2) to guarantee 100% periodic loop consistency at boundary
      final double speedMultiplier = (i == 0) ? 1.0 : (i == 1) ? -1.0 : (i == 2) ? 2.0 : -2.0;
      final angle = t * speedMultiplier + orb.phase;
      
      final cx = (orb.x + 0.18 * math.cos(angle)) * size.width;
      final cy = (orb.y + 0.18 * math.sin(angle)) * size.height;
      
      // Periodically clean pulsing size using base t cycles
      final double sizePulse = (i % 2 == 0) 
          ? math.sin(t * (i == 2 ? 2.0 : 1.0)) 
          : math.cos(t * (i == 3 ? 2.0 : 1.0));
      final currentRadius = orb.radius * (1.0 + 0.12 * sizePulse);

      final paint = Paint()
        ..blendMode = BlendMode.plus
        ..shader = RadialGradient(
          colors: [
            orb.color.withValues(alpha: AppTheme.isDark ? 0.35 : 0.18),
            orb.color.withValues(alpha: 0.0),
          ],
        ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: currentRadius));

      canvas.drawCircle(Offset(cx, cy), currentRadius, paint);
    }

    // Vignette
    final vignette = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.transparent,
          (AppTheme.isDark ? Colors.black : Colors.white).withValues(alpha: AppTheme.isDark ? 0.55 : 0.25)
        ],
        stops: const [0.4, 1.0],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, vignette);
  }

  @override
  bool shouldRepaint(covariant _LiquidGlassPainter oldDelegate) => oldDelegate.t != t;
}

class _Orb {
  _Orb({required this.x, required this.y, required this.radius, required this.color, required this.speed, required this.phase});
  final double x, y, radius, speed, phase;
  final Color color;
}
