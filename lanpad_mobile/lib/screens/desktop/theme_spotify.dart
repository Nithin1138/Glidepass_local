import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ═══════════════════════════════════════════════════════════════════════════
// THEME: "SPOTIFY" — bold true-black canvas with a single vivid neon-green
// accent, punchy rounded type. Background has slow pulsing radial glow
// (like album-art-driven ambient glow on Spotify's Now Playing screen).
//
// Palette:
//   #000000 — app background (true black)
//   #0A0A0A — sidebar
//   #121212 — elevated cards (exact Spotify card black)
//   #1A1A1A — active/selected
//   #282828 — borders
//   #1ED760 — accent (Spotify green)
//   #2D46B9 — secondary (deep blue, used for contrast tags)
//   #FFFFFF — text
// ═══════════════════════════════════════════════════════════════════════════

Color get kSurface          => AppTheme.isDark ? const Color(0xFF000000) : const Color(0xFFF7F7F7);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF0A0A0A) : const Color(0xFFFFFFFF);
Color get kSurfaceVariant   => AppTheme.isDark ? const Color(0xFF1A1A1A) : const Color(0xFFE9E9E9);
Color get kSurfaceLow       => AppTheme.isDark ? const Color(0xFF060606) : const Color(0xFFF0F0F0);
Color get kSurfaceLowest    => AppTheme.isDark ? const Color(0xFF000000) : const Color(0xFFE0E0E0);

Color get kCard             => AppTheme.isDark ? const Color(0xFF121212) : const Color(0xFFFFFFFF);
Color get kOutlineVariant   => AppTheme.isDark ? const Color(0xFF282828) : const Color(0xFFD9D9D9);

Color get kOnSurface        => AppTheme.isDark ? const Color(0xFFFFFFFF) : const Color(0xFF0A0A0A);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFFA7A7A7) : const Color(0xFF5A5A5A);

Color get kPrimary          => const Color(0xFF1ED760); // Spotify green
Color get kSecondary        => const Color(0xFF2D46B9); // deep blue
Color get kTertiary         => AppTheme.isDark ? const Color(0xFF7A7A7A) : const Color(0xFF535353);

Color get kSuccess          => const Color(0xFF1ED760);
Color get kError            => AppTheme.isDark ? const Color(0xFFF15E6C) : const Color(0xFFE22134);
Color get kErrorContainer   => AppTheme.isDark ? const Color(0xFF331013) : const Color(0xFFFCE0E2);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle get kHeadlineLg => GoogleFonts.figtree(
  fontSize: 32, fontWeight: FontWeight.w800, color: kOnSurface, letterSpacing: -0.7,
);
TextStyle get kHeadlineMd => GoogleFonts.figtree(
  fontSize: 24, fontWeight: FontWeight.w800, color: kOnSurface, letterSpacing: -0.5,
);
TextStyle get kBodyLg => GoogleFonts.figtree(
  fontSize: 16, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kBodyMd => GoogleFonts.figtree(
  fontSize: 14, fontWeight: FontWeight.w500, color: kOnSurface, letterSpacing: -0.1,
);
TextStyle get kLabelMd => GoogleFonts.figtree(
  fontSize: 12, fontWeight: FontWeight.w700, color: kOnSurface, letterSpacing: 0.4,
);
TextStyle get kMonoSm => GoogleFonts.robotoMono(
  fontSize: 12, fontWeight: FontWeight.w400, color: kOnSurface,
);

BoxDecoration get kGlassCard => BoxDecoration(
  color: AppTheme.isDark
      ? const Color(0xFF121212).withValues(alpha: 0.9)
      : const Color(0xFFFFFFFF).withValues(alpha: 0.92),
  borderRadius: BorderRadius.circular(12),
  border: Border.all(
    color: AppTheme.isDark
        ? const Color(0xFF282828).withValues(alpha: 0.9)
        : const Color(0xFFD9D9D9),
  ),
);

BoxDecoration get kSurfaceCard => BoxDecoration(
  color: kCard,
  borderRadius: BorderRadius.circular(12),
  border: Border.all(color: kOutlineVariant),
);

InputDecoration kSearchDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: GoogleFonts.figtree(fontSize: 13, color: kOnSurfaceVariant),
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
// ANIMATED BACKGROUND — a bottom-anchored green glow that pulses in sync
// with a faux "equalizer" rhythm (staggered sine waves), fading into true
// black at the edges. Evokes Spotify's Now Playing ambient color wash.
// Usage: Stack([SpotifyAnimatedBackground(), ...yourContent])
// ═══════════════════════════════════════════════════════════════════════════
class SpotifyAnimatedBackground extends StatefulWidget {
  const SpotifyAnimatedBackground({super.key});

  @override
  State<SpotifyAnimatedBackground> createState() => _SpotifyAnimatedBackgroundState();
}

class _SpotifyAnimatedBackgroundState extends State<SpotifyAnimatedBackground>
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

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value * 2 * math.pi;
        
        // Fluid organic floating paths
        final x1 = math.sin(t) * 90;
        final y1 = math.cos(t) * 90;
        final x2 = math.cos(t + math.pi / 2) * 100;
        final y2 = math.sin(t + math.pi / 2) * 100;
        final x3 = math.sin(t * 1.5) * 70;
        final y3 = math.cos(t * 1.5) * 70;

        final isDark = AppTheme.isDark;
        final baseBgColor = isDark ? const Color(0xFF020202) : const Color(0xFFF7F7F7);
        final opacityMultiplier = isDark ? 1.0 : 0.45;

        return Container(
          color: baseBgColor,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Neon green glow drifting left-bottom
              Positioned(
                left: -80 + x1,
                bottom: -100 + y1,
                child: _glow(
                  color: const Color(0xFF1ED760), // Neon spotify green
                  size: 550,
                  opacity: 0.10 * opacityMultiplier,
                ),
              ),
              
              // Neon electric cyan glow drifting right-bottom
              Positioned(
                right: -100 + x2,
                bottom: -80 + y2,
                child: _glow(
                  color: const Color(0xFF00E5FF), // Electric neon cyan
                  size: 500,
                  opacity: 0.08 * opacityMultiplier,
                ),
              ),

              // Neon deep cyber purple glow drifting top-center
              Positioned(
                left: 150 + x3,
                top: -150 + y3,
                child: _glow(
                  color: const Color(0xFFBD00FF), // Cyber magenta/purple
                  size: 600,
                  opacity: 0.06 * opacityMultiplier,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _glow({required Color color, required double size, required double opacity}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            color.withValues(alpha: opacity),
            color.withValues(alpha: 0.0),
          ],
        ),
      ),
    );
  }
}
