import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

// ─── Colors ──────────────────────────────────────────────────────────────────
// Premium dark palette — maximum depth separation + clear accent hierarchy
//
// Layer hierarchy (dark → light):
//   #04070F — Near-black app background (floor)
//   #0B1928 — Deep navy sidebar / side panels
//   #102038 — Midnight blue elevated cards
//   #1A3F75 — Slate blue active / selected state
//   #1C3460 — Subtle blue-tinted border
//   #4178C0 — Royal blue primary accent (saturated, readable, not neon)
//   #358FA0 — Steel teal secondary
//   #FFFFFF — Pure white primary text
//   #7EA8C8 — Muted steel blue secondary text
// ─────────────────────────────────────────────────────────────────────────────

// Surfaces — strong depth contrast between layers
Color get kSurface          => AppTheme.isDark ? const Color(0xFF04070F) : const Color(0xFFEEF4FA);
Color get kSurfaceContainer => AppTheme.isDark ? const Color(0xFF0B1928) : const Color(0xFFFFFFFF);
Color get kSurfaceVariant   => AppTheme.isDark ? const Color(0xFF1A3F75) : const Color(0xFFD8E8F5);
Color get kSurfaceLow       => AppTheme.isDark ? const Color(0xFF020509) : const Color(0xFFE4EFF8);
Color get kSurfaceLowest    => AppTheme.isDark ? const Color(0xFF010305) : const Color(0xFFD4E4F2);

// Elevated cards — clearly distinct from both bg and sidebar
Color get kCard             => AppTheme.isDark ? const Color(0xFF102038) : const Color(0xFFFFFFFF);

// Borders — visible but not harsh
Color get kOutlineVariant   => AppTheme.isDark ? const Color(0xFF1C3460) : const Color(0xFF9ABCD4);

// Text — pure white and clear muted step
Color get kOnSurface        => AppTheme.isDark ? const Color(0xFFFFFFFF) : const Color(0xFF00002A);
Color get kOnSurfaceVariant => AppTheme.isDark ? const Color(0xFF7EA8C8) : const Color(0xFF2E5A92);

// Primary — royal blue #4178C0 (properly saturated, clear interactive signal)
Color get kPrimary          => AppTheme.isDark ? const Color(0xFF4178C0) : const Color(0xFF1A3F75);

// Secondary — steel teal (analogous to primary, cooler hue)
Color get kSecondary        => AppTheme.isDark ? const Color(0xFF358FA0) : const Color(0xFF0E7490);

// Tertiary — deeper slate blue for subtle emphasis
Color get kTertiary         => AppTheme.isDark ? const Color(0xFF2E5A92) : const Color(0xFF1A3F75);

// Semantic
Color get kSuccess          => const Color(0xFF4ADE80);
Color get kError            => AppTheme.isDark ? const Color(0xFFFF6B6B) : const Color(0xFFDC2626);
Color get kErrorContainer   => AppTheme.isDark ? const Color(0xFF7A1A1A) : const Color(0xFFFFDAD6);

// ─── Text Styles ─────────────────────────────────────────────────────────────
TextStyle get kHeadlineLg => GoogleFonts.outfit(
  fontSize: 32, fontWeight: FontWeight.w600,
  color: kOnSurface, letterSpacing: -0.64,
);

TextStyle get kHeadlineMd => GoogleFonts.outfit(
  fontSize: 24, fontWeight: FontWeight.w600,
  color: kOnSurface, letterSpacing: -0.48,
);

TextStyle get kBodyLg => GoogleFonts.inter(
  fontSize: 16, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: -0.16,
);

TextStyle get kBodyMd => GoogleFonts.inter(
  fontSize: 14, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: -0.14,
);

TextStyle get kLabelMd => GoogleFonts.inter(
  fontSize: 12, fontWeight: FontWeight.w500,
  color: kOnSurface, letterSpacing: 0.24,
);

TextStyle get kMonoSm => GoogleFonts.robotoMono(
  fontSize: 12, fontWeight: FontWeight.w400,
  color: kOnSurface, letterSpacing: 0,
);

BoxDecoration get kGlassCard => BoxDecoration(
  color: AppTheme.isDark
      ? const Color(0xFF102038).withValues(alpha: 0.92)
      : const Color(0xFFFFFFFF).withValues(alpha: 0.9),
  borderRadius: BorderRadius.circular(16),
  border: Border.all(
    color: AppTheme.isDark
        ? const Color(0xFF1C3460).withValues(alpha: 0.7)
        : const Color(0xFF9ABCD4),
  ),
);

BoxDecoration get kSurfaceCard => BoxDecoration(
  color: kCard,
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
    borderSide: BorderSide(color: kPrimary, width: 1.5),
  ),
);
