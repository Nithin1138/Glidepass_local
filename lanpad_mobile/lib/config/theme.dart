import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color bgColor = Color(0xFF050505);
  static const Color cardBg = Color(0x08FFFFFF); // rgba(255, 255, 255, 0.03)
  static const Color borderColor = Color(0x14FFFFFF); // rgba(255, 255, 255, 0.08)
  static const Color textMain = Color(0xFFFAFAFA);
  static const Color textMuted = Color(0x66FAFAFA); // rgba(250, 250, 250, 0.4)
  static const Color accentColor = Color(0xFF0077C0);
  static const Color accentGlow = Color(0x4D0077C0); // rgba(0, 119, 192, 0.3)
  static const Color redStatus = Color(0xFFC62828);
  static const Color greenStatus = Color(0xFFC7EEFF);
  
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgColor,
      colorScheme: const ColorScheme.dark(
        primary: accentColor,
        background: bgColor,
        surface: cardBg,
        error: redStatus,
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
        inactiveTrackColor: Colors.grey[800],
        thumbColor: accentColor,
        overlayColor: accentGlow,
      ),
    );
  }
}
