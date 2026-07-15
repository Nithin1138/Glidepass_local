import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Compliance & Legal Policies view matching the user's mockup.
class TermsView extends StatelessWidget {
  final DesktopState state;
  const TermsView({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final serverUrl = state.serverService.isRunning 
        ? 'http://localhost:8000' 
        : 'https://lanpad.app';

    final List<({String title, String desc, String path, String fallbackUrl})> policies = [
      (
        title: 'Terms of Service',
        desc: 'Terms of using the bridge services',
        path: '/terms_of_service.html',
        fallbackUrl: 'https://lanpad.app/terms'
      ),
      (
        title: 'Privacy Policy',
        desc: 'Data transmission & privacy standards',
        path: '/privacy_policy.html',
        fallbackUrl: 'https://lanpad.app/privacy'
      ),
      (
        title: 'Content Policy',
        desc: 'Transfer guidelines and restrictions',
        path: '/content_policy.html',
        fallbackUrl: 'https://lanpad.app/content'
      ),
      (
        title: 'Copyright Takedown',
        desc: 'DMCA / Intellectual property claims',
        path: '/copyright_takedown.html',
        fallbackUrl: 'https://lanpad.app/dmca'
      ),
      (
        title: 'Refund Policy',
        desc: 'Relay & license monetization guidelines',
        path: '/refund_policy.html',
        fallbackUrl: 'https://lanpad.app/refund'
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Top bar ─────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
          ),
          child: Row(
            children: [
              Text('Compliance & Legal Policies',
                  style: GoogleFonts.outfit(
                      fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
            ],
          ),
        ),

        // ── Content ─────────────────────────────────────────────────
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Compliance & Legal Policies',
                        style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: kOnSurfaceVariant,
                            letterSpacing: 1.2)),
                    const SizedBox(height: 16),

                    // Policies List Container
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F1216),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: kOutlineVariant),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: policies.length,
                        separatorBuilder: (context, index) =>
                            const Divider(color: kOutlineVariant, height: 1),
                        itemBuilder: (context, index) {
                          final policy = policies[index];
                          return InkWell(
                            onTap: () async {
                              final targetUrl = state.serverService.isRunning
                                  ? '$serverUrl${policy.path}'
                                  : policy.fallbackUrl;
                              await launchUrl(Uri.parse(targetUrl),
                                  mode: LaunchMode.externalApplication);
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Row(
                                children: [
                                  // File Icon in orange
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF97316).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      LucideIcons.file_text,
                                      color: Color(0xFFF97316),
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 16),

                                  // Title and Description
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          policy.title,
                                          style: GoogleFonts.inter(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                              color: kOnSurface),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          policy.desc,
                                          style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: kOnSurfaceVariant.withOpacity(0.6)),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // External link icon
                                  Icon(
                                    LucideIcons.external_link,
                                    size: 16,
                                    color: kOnSurfaceVariant.withOpacity(0.4),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
