import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ═══════════════════════════════════════════════════════════════════════════
// THEME: "MONOCHROME" — ultra-minimal indigo/slate.
// Dark: near-black charcoal with Linear's signature periwinkle glow.
// Light: cool blue-slate tinted surfaces inspired by Linear.app's light mode.
//
// Dark palette:
//   #08090C — app background (near-black, cool)
//   #101114 — sidebar / surface container
//   #17181C — elevated cards
//   #1F2126 — active/selected state
//   #26282E — borders
//   #5E6AD2 — accent (Linear periwinkle-indigo)
//   #8B93F0 — secondary (lighter periwinkle)
//   #F7F8F8 — text
//
// Light palette:
//   #F0F1F8 — app background (cool blue-tinted off-white)
//   #E8E9F4 — sidebar / surface container (slightly blue-grey)
//   #FFFFFF — elevated cards (pure white lifts off tinted bg)
//   #DDE0F0 — borders (cool periwinkle-grey)
//   #5E6AD2 — same accent for consistency
//   #111230 — text (deep navy instead of pure black)
// ═══════════════════════════════════════════════════════════════════════════

Color get kSurface          => AppTheme.isDark ? const Color(0xFF08090C) : const Color(0xFFF0F1F8);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF101114) : const Color(0xFFE8E9F4);
Color get kSurfaceVariant   => AppTheme.isDark ? const Color(0xFF1F2126) : const Color(0xFFDDE0F0);
Color get kSurfaceLow       => AppTheme.isDark ? const Color(0xFF0C0D10) : const Color(0xFFEAEBF5);
Color get kSurfaceLowest    => AppTheme.isDark ? const Color(0xFF050506) : const Color(0xFFD8DCF0);

Color get kCard             => AppTheme.isDark ? const Color(0xFF17181C) : const Color(0xFFFFFFFF);
Color get kOutlineVariant   => AppTheme.isDark ? const Color(0xFF26282E) : const Color(0xFFD0D4EC);

Color get kOnSurface        => AppTheme.isDark ? const Color(0xFFF7F8F8) : const Color(0xFF111230);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFF8A8D96) : const Color(0xFF555880);

Color get kPrimary          => const Color(0xFF5E6AD2); // Linear periwinkle-indigo (same dark & light)
Color get kSecondary        => AppTheme.isDark ? const Color(0xFF8B93F0) : const Color(0xFF7B84E0);
Color get kTertiary         => AppTheme.isDark ? const Color(0xFF68717D) : const Color(0xFF8E92BB);

Color get kSuccess          => AppTheme.isDark ? const Color(0xFF4CB782) : const Color(0xFF2D9E6B);
Color get kError            => AppTheme.isDark ? const Color(0xFFEB5757) : const Color(0xFFCC3A3A);
Color get kErrorContainer   => AppTheme.isDark ? const Color(0xFF361616) : const Color(0xFFFCE8E8);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle get kHeadlineLg => GoogleFonts.inter(
  fontSize: 32, fontWeight: FontWeight.w600, color: kOnSurface, letterSpacing: -0.7,
);
TextStyle get kHeadlineMd => GoogleFonts.inter(
  fontSize: 24, fontWeight: FontWeight.w600, color: kOnSurface, letterSpacing: -0.5,
);
TextStyle get kBodyLg => GoogleFonts.inter(
  fontSize: 16, fontWeight: FontWeight.w400, color: kOnSurface, letterSpacing: -0.15,
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
      ? const Color(0xFF17181C).withValues(alpha: 0.75)
      : const Color(0xFFFFFFFF).withValues(alpha: 0.92),
  borderRadius: BorderRadius.circular(12),
  border: Border.all(
    color: AppTheme.isDark
        ? const Color(0xFF26282E).withValues(alpha: 0.9)
        : const Color(0xFFD0D4EC),
  ),
);

BoxDecoration get kSurfaceCard => BoxDecoration(
  color: kCard,
  borderRadius: BorderRadius.circular(12),
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
    borderRadius: BorderRadius.circular(8),
    borderSide: BorderSide(color: kOutlineVariant),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(8),
    borderSide: BorderSide(color: kOutlineVariant),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(8),
    borderSide: BorderSide(color: kPrimary, width: 1.5),
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND — one single soft indigo glow that slowly "breathes"
// (scales + fades) top-center, evoking Linear's restrained hero glow rather
// than a busy multi-blob mesh. Minimal motion, maximum polish.
// Usage: Stack([LinearAnimatedBackground(), ...yourContent])
// ═══════════════════════════════════════════════════════════════════════════
class LinearAnimatedBackground extends StatefulWidget {
  const LinearAnimatedBackground({super.key});

  @override
  State<LinearAnimatedBackground> createState() => _LinearAnimatedBackgroundState();
}

class _LinearAnimatedBackgroundState extends State<LinearAnimatedBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 6))
      ..repeat(reverse: true);
    _scale = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _opacity = Tween<double>(begin: 0.55, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    return Container(
      color: kSurface,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Align(
            alignment: const Alignment(0, -0.7),
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                return Opacity(
                  opacity: _opacity.value * (isDark ? 0.12 : 0.18),
                  child: Transform.scale(
                    scale: _scale.value,
                    child: Container(
                      width: 700,
                      height: 700,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFF5E6AD2),
                            const Color(0xFF5E6AD2).withValues(alpha: 0.0),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Clean grid lines matching Linear's famous engineering aesthetic
          CustomPaint(
            painter: _GridPainter(isDark: isDark),
            size: Size.infinite,
          ),
        ],
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  final bool isDark;
  _GridPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark ? Colors.white.withValues(alpha: 0.015) : Colors.black.withValues(alpha: 0.02)
      ..strokeWidth = 1.0;
    const spacing = 40.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
