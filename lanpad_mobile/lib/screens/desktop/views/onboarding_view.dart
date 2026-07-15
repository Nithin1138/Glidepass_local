import 'dart:io';
import 'package:flutter/material.dart';
import '../desktop_theme.dart';

class OnboardingView extends StatefulWidget {
  final VoidCallback onAccept;

  const OnboardingView({Key? key, required this.onAccept}) : super(key: key);

  @override
  State<OnboardingView> createState() => _OnboardingViewState();
}

class _OnboardingViewState extends State<OnboardingView> {
  bool _agreedToTerms = false;
  bool _agreedToTelemetry = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      body: Stack(
        children: [
          Center(
            child: Container(
              width: 580,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: kSurfaceContainer,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kOutlineVariant),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 24,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Welcome to LANpad', style: kHeadlineLg),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: kSecondary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Local-first. Private. Fast.',
                        style: kBodyMd.copyWith(
                          color: kSecondary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Scrollable Agreement Box
                  Container(
                    height: 220,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: kSurfaceLow,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: kOutlineVariant),
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LOCAL-FIRST UTILITY AGREEMENT',
                            style: kLabelMd.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'By using LANpad, you agree to the following technical and privacy frameworks designed for high-performance local networking. Unlike traditional cloud-based utilities, LANpad operates entirely within your local area network (LAN).',
                            style: kBodyMd.copyWith(color: kOnSurfaceVariant),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '1. No Cloud Dependence',
                            style: kBodyMd.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Your data never leaves your network. LANpad does not utilize external relay servers or cloud storage for your primary workflows. You are the sole custodian of your transmitted data, session logs, and configuration files.',
                            style: kBodyMd.copyWith(color: kOnSurfaceVariant),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '2. End-to-End Local Encryption',
                            style: kBodyMd.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'All traffic within your LAN is encrypted using TLS. Keys are generated dynamically and are never escrowed.',
                            style: kBodyMd.copyWith(color: kOnSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Checkboxes
                  _buildCheckboxRow(
                    value: _agreedToTerms,
                    onChanged: (val) => setState(() => _agreedToTerms = val ?? false),
                    text: 'I agree to the Terms of Service and Privacy Policy.',
                  ),
                  const SizedBox(height: 12),
                  _buildCheckboxRow(
                    value: _agreedToTelemetry,
                    onChanged: (val) => setState(() => _agreedToTelemetry = val ?? false),
                    text: 'Help improve LANpad by sending anonymous usage statistics (Optional).',
                  ),
                  const SizedBox(height: 24),

                  // Disclaimer
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: kTertiary.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: kTertiary.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      'TECHNICAL DISCLAIMER: Local-first architecture requires your system firewall to allow inbound/outbound traffic on ports 8080-8090. Failure to provide network permissions will result in synchronization degradation.',
                      style: kLabelMd.copyWith(
                        color: kTertiary,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Buttons
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: _agreedToTerms ? widget.onAccept : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kSurfaceVariant,
                            foregroundColor: kOnSurface,
                            disabledBackgroundColor: kSurfaceVariant.withValues(alpha: 0.5),
                            disabledForegroundColor: kOnSurfaceVariant.withValues(alpha: 0.5),
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('Accept & Continue'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 1,
                        child: OutlinedButton(
                          onPressed: () => exit(0),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: kOnSurface,
                            side: const BorderSide(color: kOutlineVariant),
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('Quit LANpad'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckboxRow({
    required bool value,
    required ValueChanged<bool?> onChanged,
    required String text,
  }) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: value,
              onChanged: onChanged,
              fillColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return kPrimary;
                }
                return kSurfaceVariant;
              }),
              checkColor: kSurfaceLowest,
              side: const BorderSide(color: kOutlineVariant),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 2.0),
              child: Text(
                text,
                style: kBodyMd.copyWith(color: kOnSurface),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
