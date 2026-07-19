import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/theme.dart';

import 'theme_arc.dart' as arc;
import 'theme_linear.dart' as linear;
import 'theme_liquid_glass_blue.dart' as glass;
import 'theme_spotify.dart' as spotify;

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC DESKTOP THEME MANAGER
// ═══════════════════════════════════════════════════════════════════════════
class DesktopThemeManager extends ChangeNotifier {
  static final DesktopThemeManager instance = DesktopThemeManager._();
  DesktopThemeManager._();

  String _currentTheme = 'gemini';
  String get currentTheme => _currentTheme;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _currentTheme = prefs.getString('desktop_theme_key') ?? 'gemini';
    notifyListeners();
  }

  Future<void> setTheme(String themeKey) async {
    _currentTheme = themeKey;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('desktop_theme_key', themeKey);
    notifyListeners();
  }
}

// Helper delegator functions
Color _getThemeColor(
  Color Function() arcColor,
  Color Function() linearColor,
  Color Function() glassColor,
  Color Function() spotifyColor,
  Color Function() geminiColor,
) {
  switch (DesktopThemeManager.instance.currentTheme) {
    case 'arc':
      return arcColor();
    case 'linear':
      return linearColor();
    case 'liquid_glass_blue':
      return glassColor();
    case 'spotify':
      return spotifyColor();
    case 'gemini':
    default:
      return geminiColor();
  }
}

TextStyle _getThemeTextStyle(
  TextStyle Function() arcStyle,
  TextStyle Function() linearStyle,
  TextStyle Function() glassStyle,
  TextStyle Function() spotifyStyle,
  TextStyle Function() geminiStyle,
) {
  switch (DesktopThemeManager.instance.currentTheme) {
    case 'arc':
      return arcStyle();
    case 'linear':
      return linearStyle();
    case 'liquid_glass_blue':
      return glassStyle();
    case 'spotify':
      return spotifyStyle();
    case 'gemini':
    default:
      return geminiStyle();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC DELEGATOR GETTERS
// ═══════════════════════════════════════════════════════════════════════════
Color get kSurface          => _getThemeColor(() => arc.kSurface, () => linear.kSurface, () => glass.kSurface, () => spotify.kSurface, () => GeminiTheme.surface);
Color get kSurfaceContainer => _getThemeColor(() => arc.kSurfaceContainer, () => linear.kSurfaceContainer, () => glass.kSurfaceContainer, () => spotify.kSurfaceContainer, () => GeminiTheme.surfaceContainer);
Color get kSurfaceVariant   => _getThemeColor(() => arc.kSurfaceVariant, () => linear.kSurfaceVariant, () => glass.kSurfaceVariant, () => spotify.kSurfaceVariant, () => GeminiTheme.surfaceVariant);
Color get kSurfaceLow       => _getThemeColor(() => arc.kSurfaceLow, () => linear.kSurfaceLow, () => glass.kSurfaceLow, () => spotify.kSurfaceLow, () => GeminiTheme.surfaceLow);
Color get kSurfaceLowest    => _getThemeColor(() => arc.kSurfaceLowest, () => linear.kSurfaceLowest, () => glass.kSurfaceLowest, () => spotify.kSurfaceLowest, () => GeminiTheme.surfaceLowest);

Color get kCard             => _getThemeColor(() => arc.kCard, () => linear.kCard, () => glass.kCard, () => spotify.kCard, () => GeminiTheme.card);
Color get kOutlineVariant   => _getThemeColor(() => arc.kOutlineVariant, () => linear.kOutlineVariant, () => glass.kOutlineVariant, () => spotify.kOutlineVariant, () => GeminiTheme.outlineVariant);

Color get kOnSurface        => _getThemeColor(() => arc.kOnSurface, () => linear.kOnSurface, () => glass.kOnSurface, () => spotify.kOnSurface, () => GeminiTheme.onSurface);
Color get kOnSurfaceVariant => _getThemeColor(() => arc.kOnSurfaceVariant, () => linear.kOnSurfaceVariant, () => glass.kOnSurfaceVariant, () => spotify.kOnSurfaceVariant, () => GeminiTheme.onSurfaceVariant);

Color get kPrimary          => _getThemeColor(() => arc.kPrimary, () => linear.kPrimary, () => glass.kPrimary, () => spotify.kPrimary, () => GeminiTheme.primary);
Color get kSecondary        => _getThemeColor(() => arc.kSecondary, () => linear.kSecondary, () => glass.kSecondary, () => spotify.kSecondary, () => GeminiTheme.secondary);
Color get kTertiary         => _getThemeColor(() => arc.kTertiary, () => linear.kTertiary, () => glass.kTertiary, () => spotify.kTertiary, () => GeminiTheme.tertiary);

Color get kSuccess          => _getThemeColor(() => arc.kSuccess, () => linear.kSuccess, () => glass.kSuccess, () => spotify.kSuccess, () => GeminiTheme.success);
Color get kError            => _getThemeColor(() => arc.kError, () => linear.kError, () => glass.kError, () => spotify.kError, () => GeminiTheme.error);
Color get kErrorContainer   => _getThemeColor(() => arc.kErrorContainer, () => linear.kErrorContainer, () => glass.kErrorContainer, () => spotify.kErrorContainer, () => GeminiTheme.errorContainer);

TextStyle get kHeadlineLg   => _getThemeTextStyle(() => arc.kHeadlineLg, () => linear.kHeadlineLg, () => glass.kHeadlineLg, () => spotify.kHeadlineLg, () => GeminiTheme.headlineLg);
TextStyle get kHeadlineMd   => _getThemeTextStyle(() => arc.kHeadlineMd, () => linear.kHeadlineMd, () => glass.kHeadlineMd, () => spotify.kHeadlineMd, () => GeminiTheme.headlineMd);
TextStyle get kBodyLg       => _getThemeTextStyle(() => arc.kBodyLg, () => linear.kBodyLg, () => glass.kBodyLg, () => spotify.kBodyLg, () => GeminiTheme.bodyLg);
TextStyle get kBodyMd       => _getThemeTextStyle(() => arc.kBodyMd, () => linear.kBodyMd, () => glass.kBodyMd, () => spotify.kBodyMd, () => GeminiTheme.bodyMd);
TextStyle get kLabelMd      => _getThemeTextStyle(() => arc.kLabelMd, () => linear.kLabelMd, () => glass.kLabelMd, () => spotify.kLabelMd, () => GeminiTheme.labelMd);
TextStyle get kMonoSm       => _getThemeTextStyle(() => arc.kMonoSm, () => linear.kMonoSm, () => glass.kMonoSm, () => spotify.kMonoSm, () => GeminiTheme.monoSm);

BoxDecoration get kGlassCard => _getThemeBoxDecoration(() => arc.kGlassCard, () => linear.kGlassCard, () => glass.kGlassCard, () => spotify.kGlassCard, () => GeminiTheme.glassCard);
BoxDecoration get kSurfaceCard => _getThemeBoxDecoration(() => arc.kSurfaceCard, () => linear.kSurfaceCard, () => glass.kSurfaceCard, () => spotify.kSurfaceCard, () => GeminiTheme.surfaceCard);

BoxDecoration _getThemeBoxDecoration(
  BoxDecoration Function() arcDec,
  BoxDecoration Function() linearDec,
  BoxDecoration Function() glassDec,
  BoxDecoration Function() spotifyDec,
  BoxDecoration Function() geminiDec,
) {
  switch (DesktopThemeManager.instance.currentTheme) {
    case 'arc':
      return arcDec();
    case 'linear':
      return linearDec();
    case 'liquid_glass_blue':
      return glassDec();
    case 'spotify':
      return spotifyDec();
    case 'gemini':
    default:
      return geminiDec();
  }
}

InputDecoration kSearchDecoration(String hint) {
  switch (DesktopThemeManager.instance.currentTheme) {
    case 'arc':
      return arc.kSearchDecoration(hint);
    case 'linear':
      return linear.kSearchDecoration(hint);
    case 'liquid_glass_blue':
      return glass.kSearchDecoration(hint);
    case 'spotify':
      return spotify.kSearchDecoration(hint);
    case 'gemini':
    default:
      return GeminiTheme.searchDecoration(hint);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC ANIMATED BACKGROUND WIDGET
// ═══════════════════════════════════════════════════════════════════════════
class DesktopThemeBackground extends StatelessWidget {
  const DesktopThemeBackground({super.key});

  @override
  Widget build(BuildContext context) {
    switch (DesktopThemeManager.instance.currentTheme) {
      case 'arc':
        return const arc.ArcAnimatedBackground();
      case 'linear':
        return const linear.LinearAnimatedBackground();
      case 'liquid_glass_blue':
        return const glass.LiquidGlassBlueBackground();
      case 'spotify':
        return const spotify.SpotifyAnimatedBackground();
      case 'gemini':
      default:
        return const GeminiAnimatedBackground();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GEMINI (DEFAULT) THEME DEFINITION
// ═══════════════════════════════════════════════════════════════════════════
class GeminiTheme {
  static Color get surface          => AppTheme.isDark ? const Color(0xFF050508) : const Color(0xFFF7F7FB);
  static Color get surfaceContainer => AppTheme.isDark ? const Color(0xFF0B0B10) : const Color(0xFFFFFFFF);
  static Color get surfaceVariant   => AppTheme.isDark ? const Color(0xFF1C1C24) : const Color(0xFFEAE9F5);
  static Color get surfaceLow       => AppTheme.isDark ? const Color(0xFF08080C) : const Color(0xFFF0EFF9);
  static Color get surfaceLowest    => AppTheme.isDark ? const Color(0xFF030304) : const Color(0xFFE3E1F2);

  static Color get card             => AppTheme.isDark ? const Color(0xFF131319) : const Color(0xFFFFFFFF);
  static Color get outlineVariant   => AppTheme.isDark ? const Color(0xFF26262F) : const Color(0xFFD8D6EC);

  static Color get onSurface        => AppTheme.isDark ? const Color(0xFFFFFFFF) : const Color(0xFF15141F);
  static Color get onSurfaceVariant => AppTheme.isDark ? const Color(0xFF9C9CAE) : const Color(0xFF5F5D74);

  static Color get primary          => const Color(0xFF4285F4); // Google blue
  static Color get secondary        => const Color(0xFF9C27F0); // violet
  static Color get tertiary         => const Color(0xFFF94BA4); // pink

  static Color get success          => const Color(0xFF34A853); // Google green
  static Color get error            => AppTheme.isDark ? const Color(0xFFFF6B6B) : const Color(0xFFEA4335);
  static Color get errorContainer   => AppTheme.isDark ? const Color(0xFF3A1414) : const Color(0xFFFDDCD7);

  static TextStyle get headlineLg => GoogleFonts.googleSans(
    fontSize: 32, fontWeight: FontWeight.w600, color: onSurface, letterSpacing: -0.5,
  );
  static TextStyle get headlineMd => GoogleFonts.googleSans(
    fontSize: 24, fontWeight: FontWeight.w600, color: onSurface, letterSpacing: -0.4,
  );
  static TextStyle get bodyLg => GoogleFonts.googleSans(
    fontSize: 16, fontWeight: FontWeight.w400, color: onSurface, letterSpacing: -0.1,
  );
  static TextStyle get bodyMd => GoogleFonts.googleSans(
    fontSize: 14, fontWeight: FontWeight.w400, color: onSurface, letterSpacing: -0.1,
  );
  static TextStyle get labelMd => GoogleFonts.googleSans(
    fontSize: 12, fontWeight: FontWeight.w500, color: onSurface, letterSpacing: 0.2,
  );
  static TextStyle get monoSm => GoogleFonts.robotoMono(
    fontSize: 12, fontWeight: FontWeight.w400, color: onSurface,
  );

  static BoxDecoration get glassCard => BoxDecoration(
    color: AppTheme.isDark
        ? const Color(0xFF131319).withValues(alpha: 0.75)
        : const Color(0xFFFFFFFF).withValues(alpha: 0.88),
    borderRadius: BorderRadius.circular(18),
    border: Border.all(
      color: AppTheme.isDark
          ? const Color(0xFF26262F).withValues(alpha: 0.8)
          : const Color(0xFFD8D6EC),
    ),
  );

  static BoxDecoration get surfaceCard => BoxDecoration(
    color: card,
    borderRadius: BorderRadius.circular(18),
    border: Border.all(color: outlineVariant),
  );

  static InputDecoration searchDecoration(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.googleSans(fontSize: 13, color: onSurfaceVariant),
    prefixIcon: Icon(Icons.search_rounded, size: 16, color: onSurfaceVariant),
    filled: true,
    fillColor: surfaceContainer,
    contentPadding: const EdgeInsets.symmetric(vertical: 8),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(30),
      borderSide: BorderSide(color: outlineVariant),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(30),
      borderSide: BorderSide(color: outlineVariant),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(30),
      borderSide: BorderSide(color: primary, width: 1.5),
    ),
  );
}

// Gemini-style gradient text (blue → violet → pink) for headline moments.
Shader kGeminiGradientShader(Rect bounds) => const LinearGradient(
  colors: [Color(0xFF4285F4), Color(0xFF9C27F0), Color(0xFFF94BA4)],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
).createShader(bounds);

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND — GEMINI DEFAULT
// ═══════════════════════════════════════════════════════════════════════════
class GeminiAnimatedBackground extends StatefulWidget {
  const GeminiAnimatedBackground({super.key});

  @override
  State<GeminiAnimatedBackground> createState() => _GeminiAnimatedBackgroundState();
}

class _GeminiAnimatedBackgroundState extends State<GeminiAnimatedBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 16))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
            final t = _controller.value * 2 * 3.14159265;
            return Container(
              width: w,
              height: h,
              color: kSurface,
              child: Stack(
                children: [
                  _blob(w, h, baseX: 0.25, baseY: 0.30, radius: 0.20, speed: 0.9, phase: t,
                      color: const Color(0xFF4285F4).withValues(alpha: 0.22), size: 600),
                  _blob(w, h, baseX: 0.70, baseY: 0.35, radius: 0.22, speed: 0.65, phase: t + 2.1,
                      color: const Color(0xFF9C27F0).withValues(alpha: 0.20), size: 560),
                  _blob(w, h, baseX: 0.50, baseY: 0.75, radius: 0.18, speed: 1.05, phase: t + 4.4,
                      color: const Color(0xFFF94BA4).withValues(alpha: 0.18), size: 520),
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
