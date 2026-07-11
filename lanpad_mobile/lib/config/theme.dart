import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Notifiers for dynamic changes
  static final ValueNotifier<ThemeMode> themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.dark);
  static final ValueNotifier<Color> accentColorNotifier = ValueNotifier<Color>(const Color(0xFF0356C5));
  static final ValueNotifier<String> hapticLevelNotifier = ValueNotifier<String>('light'); // none, light, medium

  // Getter shortcuts
  static bool get isDark => themeModeNotifier.value == ThemeMode.dark;
  static Color get accentColor => accentColorNotifier.value;
  static Color get accentGlow => accentColor.withOpacity(0.3);

  // Preset Colors
  static const List<Color> presetAccents = [
    Color(0xFF0356C5), // Royal Blue (Default)
    Color(0xFFA855F7), // Neon Purple
    Color(0xFFF59E0B), // Cyberpunk Amber
    Color(0xFF10B981), // Aurora Emerald
    Color(0xFFEC4899), // Rose Pink
  ];

  // Colors dynamically based on theme mode
  static Color get bgColor => isDark ? const Color(0xFF02060E) : const Color(0xFFFDFBF7);
  static Color get cardBg => isDark ? const Color(0x0AFFFFFF) : const Color(0x60FFFFFF);
  static Color get borderColor => isDark ? const Color(0x14FFFFFF) : const Color(0x14000000);
  static Color get textMain => isDark ? const Color(0xFFFAFAFA) : const Color(0xFF0F172A);
  static Color get textMuted => isDark ? const Color(0x66FAFAFA) : const Color(0x880F172A);

  static const Color redStatus = Color(0xFFEF4444);
  static const Color greenStatus = Color(0xFF10B981);

  // Dynamic Theme Generation
  static ThemeData get activeTheme {
    return ThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: bgColor,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: accentColor,
        onPrimary: Colors.white,
        secondary: accentColor,
        onSecondary: Colors.white,
        error: redStatus,
        onError: Colors.white,
        background: bgColor,
        onBackground: textMain,
        surface: cardBg,
        onSurface: textMain,
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.outfit(
          color: textMain,
          fontSize: 32,
          fontWeight: FontWeight.w900,
          letterSpacing: -0.05,
        ),
        displayMedium: GoogleFonts.outfit(
          color: textMain,
          fontSize: 24,
          fontWeight: FontWeight.w800,
        ),
        titleLarge: GoogleFonts.outfit(
          color: textMain,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: GoogleFonts.outfit(
          color: textMain,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: GoogleFonts.inter(
          color: textMain,
          fontSize: 16,
          fontWeight: FontWeight.w400,
        ),
        bodyMedium: GoogleFonts.inter(
          color: textMuted,
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        labelLarge: GoogleFonts.inter(
          color: textMain,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.1,
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: accentColor,
        inactiveTrackColor: isDark ? Colors.grey[800] : Colors.grey[300],
        thumbColor: accentColor,
        overlayColor: accentGlow,
      ),
    );
  }
}
