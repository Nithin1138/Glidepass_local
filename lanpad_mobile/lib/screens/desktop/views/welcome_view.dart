import 'package:flutter/material.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

class WelcomeView extends StatelessWidget {
  final DesktopState state;

  const WelcomeView({Key? key, required this.state}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Center(
        child: Row(
          children: [
            // Left: Waiting State & QR
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Waiting for connection',
                    style: kHeadlineLg,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Connect your mobile device to start sharing resources, managing inputs, and orchestrating your local environment.',
                    style: kBodyLg.copyWith(color: kOnSurfaceVariant),
                  ),
                  const SizedBox(height: 48),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: kSurfaceVariant,
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x33ADC6FF),
                            blurRadius: 60,
                            spreadRadius: 20,
                          ),
                        ],
                      ),
                      child: Container(
                        width: 256,
                        height: 256,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Icon(Icons.qr_code_2, size: 200, color: Colors.black87),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 48),
            // Right: Quick Start Guide
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: kSurfaceContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Quick Start Guide', style: kHeadlineMd),
                        Text('Get up and running in under 30 seconds.', style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
                        const SizedBox(height: 32),
                        _buildStep(1, 'Open LANpad on phone', 'Ensure both devices are on the same local area network for optimal discovery.'),
                        const SizedBox(height: 24),
                        _buildStep(2, 'Scan QR', 'Point your mobile camera at the code. Pairing is handled via secure local TLS.'),
                        const SizedBox(height: 24),
                        _buildStep(3, 'Share instantly', 'Once connected, drag and drop files or use your phone as a precision input device.'),
                        const SizedBox(height: 32),
                        Row(
                          children: [
                            ElevatedButton(
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(
                                backgroundColor: kPrimary,
                                foregroundColor: kSurfaceLowest,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                              ),
                              child: const Text('Download Mobile App'),
                            ),
                            const SizedBox(width: 16),
                            OutlinedButton(
                              onPressed: () {},
                              style: OutlinedButton.styleFrom(
                                foregroundColor: kOnSurface,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                              ),
                              child: const Text('Help Center'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: kSurfaceContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.lan, color: kPrimary),
                              const SizedBox(width: 16),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Interface', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                                  Text('en0 (192.168.1.12)', style: kBodyMd),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: kSurfaceContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.shield, color: kSecondary),
                              const SizedBox(width: 16),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Encryption', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                                  Text('AES-256-GCM', style: kBodyMd),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(int number, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: kPrimary),
          ),
          child: Center(
            child: Text(
              number.toString(),
              style: kLabelMd.copyWith(color: kPrimary, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: kBodyLg.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(description, style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }
}
