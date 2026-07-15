import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ─── Colors ──────────────────────────────────────────────────────────────────
Color get kSurface => AppTheme.isDark ? const Color(0xFF111318) : const Color(0xFFF5F8FF);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF1E2024) : const Color(0xFFFFFFFF);
Color get kSurfaceVariant => AppTheme.isDark ? const Color(0xFF333539) : const Color(0xFFE2E8F0);
Color get kSurfaceLow => AppTheme.isDark ? const Color(0xFF1A1C20) : const Color(0xFFF1F5F9);
Color get kSurfaceLowest => AppTheme.isDark ? const Color(0xFF0C0E12) : const Color(0xFFE2E8F0);
Color get kOutlineVariant => AppTheme.isDark ? const Color(0xFF424754) : const Color(0xFFCBD5E1);
Color get kOnSurface => AppTheme.isDark ? const Color(0xFFE2E2E8) : const Color(0xFF0F172A);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFFC2C6D6) : const Color(0xFF475569);
Color get kPrimary => AppTheme.isDark ? const Color(0xFFADC6FF) : const Color(0xFF2563EB);
Color get kSecondary => AppTheme.isDark ? const Color(0xFF5DE6FF) : const Color(0xFF0EA5E9);
Color get kTertiary => AppTheme.isDark ? const Color(0xFFFFB786) : const Color(0xFFEA580C);
Color get kSuccess => const Color(0xFF10B981);
Color get kError => AppTheme.isDark ? const Color(0xFFFFB4AB) : const Color(0xFFDC2626);
Color get kErrorContainer => AppTheme.isDark ? const Color(0xFF93000A) : const Color(0xFFFFDAD6);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle kHeadlineLg = GoogleFonts.outfit(
  fontSize: 32, fontWeight: FontWeight.w600,
  color: kOnSurface, letterSpacing: -0.64,
);

TextStyle kHeadlineMd = GoogleFonts.outfit(
  fontSize: 24, fontWeight: FontWeight.w600,
  color: kOnSurface, letterSpacing: -0.48,
);

TextStyle kBodyLg = GoogleFonts.inter(
  fontSize: 16, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: -0.16,
);

TextStyle kBodyMd = GoogleFonts.inter(
  fontSize: 14, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: -0.14,
);

TextStyle kLabelMd = GoogleFonts.inter(
  fontSize: 12, fontWeight: FontWeight.w500,
  color: kOnSurface, letterSpacing: 0.24,
);

TextStyle kMonoSm = GoogleFonts.robotoMono(
  fontSize: 12, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: 0,
);

BoxDecoration get kGlassCard => BoxDecoration(
  color: AppTheme.isDark
      ? const Color(0xFF161B22).withValues(alpha: 0.85)
      : const Color(0xFFFFFFFF).withValues(alpha: 0.9),
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: kOutlineVariant),
);

BoxDecoration get kSurfaceCard => BoxDecoration(
  color: kSurfaceContainer,
  borderRadius: BorderRadius.circular(16),
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
    borderSide: BorderSide(color: kPrimary),
  ),
);
