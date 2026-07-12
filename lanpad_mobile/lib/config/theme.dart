import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppTheme {
  // Notifiers for dynamic changes
  static final ValueNotifier<ThemeMode> themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.dark);
  static final ValueNotifier<Color> accentColorNotifier = ValueNotifier<Color>(const Color(0xFF0356C5));
  static final ValueNotifier<String> hapticLevelNotifier = ValueNotifier<String>('light'); // none, light, medium

  // Getter shortcuts
  static bool get isDark => themeModeNotifier.value == ThemeMode.dark;
  static Color get accentColor => isDark ? const Color(0xFF4DDCFF) : const Color(0xFF2563EB);
  static Color get accentGlow => accentColor.withOpacity(0.3);

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedMode = prefs.getInt('theme_mode');
    if (savedMode != null) {
      themeModeNotifier.value = savedMode == 1 ? ThemeMode.dark : ThemeMode.light;
    }
  }

  // Preset Colors
  static const List<Color> presetAccents = [
    Color(0xFF2563EB), // Royal Blue
    Color(0xFF6D5DF6), // Violet
    Color(0xFFD97806), // Amber
    Color(0xFF059669), // Emerald
    Color(0xFFDC2626), // Rose
  ];

  static const Color redStatus = Color(0xFFDC2626);
  static const Color greenStatus = Color(0xFF059669);

  // Active theme based on themeModeNotifier
  static ThemeData get activeTheme {
    return isDark ? darkTheme : lightTheme;
  }

  // Light Theme Configuration
  static ThemeData get lightTheme {
    final accent = const Color(0xFF2563EB);
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF5F8FF),
      colorScheme: ColorScheme.light(
        primary: accent,
        secondary: accent,
        error: redStatus,
        surface: const Color(0xFFFFFFFF), // Surface
        onSurface: const Color(0xFF0F172A), // Primary Text
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 36,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.02,
        ),
        displayMedium: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: GoogleFonts.inter(
          color: const Color(0xFF0F172A),
          fontSize: 16,
          fontWeight: FontWeight.w400,
        ),
        bodyMedium: GoogleFonts.inter(
          color: const Color(0xFF5B647A),
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        labelLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 13,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.1,
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        inactiveTrackColor: Colors.grey[300],
        thumbColor: accent,
        overlayColor: accent.withOpacity(0.2),
      ),
    );
  }

  // Dark Theme Configuration
  static ThemeData get darkTheme {
    final accent = const Color(0xFF4DDCFF);
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF060B16), 
      colorScheme: ColorScheme.dark(
        primary: accent,
        secondary: accent,
        error: const Color(0xFFFF5F7A),
        surface: const Color(0xFF0F1628),
        onSurface: const Color(0xFFF5F7FF), 
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF5F7FF),
          fontSize: 36,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.02,
        ),
        displayMedium: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF5F7FF),
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF5F7FF),
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF5F7FF),
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: GoogleFonts.inter(
          color: const Color(0xFFF5F7FF),
          fontSize: 16,
          fontWeight: FontWeight.w400,
        ),
        bodyMedium: GoogleFonts.inter(
          color: const Color(0xFF94A3B8), 
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        labelLarge: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF5F7FF),
          fontSize: 13,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.1,
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        inactiveTrackColor: Colors.grey[800],
        thumbColor: accent,
        overlayColor: accent.withOpacity(0.25),
      ),
    );
  }
}

extension ThemeContext on BuildContext {
  bool get isDark => AppTheme.isDark;
  Color get bgColor => isDark ? const Color(0xFF060B16) : const Color(0xFFF5F8FF);
  Color get cardBg => isDark ? const Color(0xFF0F1628).withOpacity(0.4) : const Color(0xFFFFFFFF).withOpacity(0.6); 
  Color get borderColor => isDark ? const Color(0xFF24304D) : const Color(0xFFDCE4F0); 
  Color get textMain => isDark ? const Color(0xFFF5F7FF) : const Color(0xFF0F172A);
  Color get textMuted => isDark ? const Color(0xFF94A3B8) : const Color(0xFF5B647A);
  Color get accentColor => AppTheme.accentColor;
  Color get accentGlow => accentColor.withOpacity(0.3);
}
