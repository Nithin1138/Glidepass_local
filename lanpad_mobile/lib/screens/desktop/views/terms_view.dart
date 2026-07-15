import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Terms & Conditions view — scrollable legal text with "Open in browser" action.
class TermsView extends StatelessWidget {
  final DesktopState state;
  const TermsView({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text('Terms & Conditions', style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
          const Spacer(),
          TextButton.icon(
            onPressed: () => launchUrl(Uri.parse('https://lanpad.app/terms')),
            icon: const Icon(LucideIcons.external_link, size: 14, color: kPrimary),
            label: Text('Open in Browser',
              style: GoogleFonts.inter(color: kPrimary, fontSize: 13)),
          ),
        ]),
      ),

      // ── Scrollable legal text ─────────────────────────────────────
      Expanded(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: kGlassCard,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('LANpad Technical Utility Agreement',
                    style: GoogleFonts.outfit(
                      fontSize: 26, fontWeight: FontWeight.bold, color: kOnSurface)),
                  const SizedBox(height: 4),
                  Text('Version 2.4  ·  Effective January 1, 2025',
                    style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
                  const SizedBox(height: 24),
                  const Divider(color: kOutlineVariant),
                  const SizedBox(height: 20),
                  ..._sections.map((s) => _Section(title: s.$1, body: s.$2)),
                ]),
              ),
            ),
          ),
        ),
      ),
    ]);
  }
}

class _Section extends StatelessWidget {
  final String title;
  final String body;
  const _Section({required this.title, required this.body});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 28),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: GoogleFonts.outfit(
        fontSize: 17, fontWeight: FontWeight.bold, color: kPrimary)),
      const SizedBox(height: 8),
      Text(body, style: GoogleFonts.inter(
        fontSize: 14, color: kOnSurfaceVariant, height: 1.7)),
    ]),
  );
}

const _sections = [
  ('1. License Grant',
    'Subject to the terms of this Agreement, LANpad grants you a non-exclusive, non-transferable, revocable license to use the software on devices you own or control. This license is limited to your personal, non-commercial use unless a commercial license has been separately agreed upon in writing.'),
  ('2. Data & Privacy',
    'LANpad operates entirely on your local area network. No user data, file content, device information, or activity logs are transmitted to our servers. Telemetry is opt-in only and is always clearly disclosed. We do not monetize your data in any form. Files transferred through LANpad remain the sole property of the respective device owners.'),
  ('3. Acceptable Use',
    'You agree not to use LANpad to transfer unlawful, harmful, or copyrighted content without proper authorization. LANpad may not be used to facilitate unauthorized access to other systems. You are solely responsible for the content transferred through this application. Violations may result in permanent termination of your license.'),
  ('4. Limitation of Liability',
    'To the maximum extent permitted by applicable law, LANpad and its contributors shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of this software. Our cumulative liability shall not exceed the amount you paid for the software, or \$25 USD, whichever is greater.'),
  ('5. Modification & Termination',
    'We reserve the right to modify these terms at any time. Continued use of LANpad after notification of changes constitutes acceptance of the new terms. We may terminate your license at any time for violations of this agreement. Upon termination, you must delete all copies of the software.'),
];
