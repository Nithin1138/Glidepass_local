// Design tokens — matches Stitch LANpad Desktop Blueprint exactly
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Colors ──────────────────────────────────────────────────────────────────
const Color kSurface = Color(0xFF111318);
const Color kSurfaceContainer = Color(0xFF1E2024);
const Color kSurfaceVariant = Color(0xFF333539);
const Color kSurfaceLow = Color(0xFF1A1C20);
const Color kSurfaceLowest = Color(0xFF0C0E12);
const Color kOutlineVariant = Color(0xFF424754);
const Color kOnSurface = Color(0xFFE2E2E8);
const Color kOnSurfaceVariant = Color(0xFFC2C6D6);
const Color kPrimary = Color(0xFFADC6FF);
const Color kSecondary = Color(0xFF5DE6FF);
const Color kTertiary = Color(0xFFFFB786);
const Color kSuccess = Color(0xFF10B981);
const Color kError = Color(0xFFFFB4AB);
const Color kErrorContainer = Color(0xFF93000A);

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

// ─── Decorations ─────────────────────────────────────────────────────────────
BoxDecoration kGlassCard = BoxDecoration(
  color: const Color(0xFF161B22).withValues(alpha: 0.85),
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: kOutlineVariant),
);

BoxDecoration kSurfaceCard = BoxDecoration(
  color: kSurfaceContainer,
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: kOutlineVariant),
);

InputDecoration kSearchDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
  prefixIcon: const Icon(Icons.search_rounded, size: 16, color: kOnSurfaceVariant),
  filled: true,
  fillColor: kSurfaceContainer,
  contentPadding: const EdgeInsets.symmetric(vertical: 8),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: const BorderSide(color: kOutlineVariant),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: const BorderSide(color: kOutlineVariant),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(30),
    borderSide: const BorderSide(color: kPrimary),
  ),
);
