import 'package:flutter/material.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

class ConnectionRecoveryView extends StatelessWidget {
  final DesktopState state;

  const ConnectionRecoveryView({Key? key, required this.state}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Main Error Messaging
              Expanded(
                flex: 2,
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                        color: kSurfaceContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: kError.withOpacity(0.2),
                              border: Border.all(color: kError.withOpacity(0.3)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(Icons.signal_wifi_connected_no_internet_4, color: kError, size: 48),
                          ),
                          const SizedBox(height: 24),
                          Text('Connection Interrupted', style: kHeadlineLg),
                          const SizedBox(height: 8),
                          Text(
                            'The secure tunnel to your local peer was lost. LANpad is currently unable to synchronize data with the target device.',
                            style: kBodyLg.copyWith(color: kOnSurfaceVariant),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              ElevatedButton.icon(
                                onPressed: () {},
                                icon: const Icon(Icons.refresh, size: 18),
                                label: const Text('Retry Connection'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: kPrimary,
                                  foregroundColor: kSurfaceLowest,
                                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                                ),
                              ),
                              const SizedBox(width: 16),
                              OutlinedButton(
                                onPressed: () {},
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                                ),
                                child: const Text('Troubleshoot Network'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Diagnostic Panel
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: kSurfaceContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.analytics, color: kPrimary),
                                  const SizedBox(width: 8),
                                  Text('System Diagnostics', style: kHeadlineMd.copyWith(fontSize: 18)),
                                ],
                              ),
                              Text('ID: LP-8842-X', style: kLabelMd.copyWith(color: kOutlineVariant)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _buildDiagnosticRow('Device Status', 'Device timed out', kError),
                          const Divider(color: kOutlineVariant),
                          _buildDiagnosticRow('Local Network', 'Reachable', kSecondary),
                          const Divider(color: kOutlineVariant),
                          _buildDiagnosticRow('Handshake Protocol', 'Suspended', kOutlineVariant),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              // Side Panel
              Expanded(
                flex: 1,
                child: Column(
                  children: [
                    // Background Listener Status
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: kSurfaceContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: kPrimary.withOpacity(0.1),
                                border: Border.all(color: kPrimary.withOpacity(0.2)),
                              ),
                              child: const Center(
                                child: Icon(Icons.leak_add, color: kPrimary, size: 32),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text('Listening for Peer', style: kLabelMd),
                            Text('UDP Port: 44321', style: kBodyMd.copyWith(color: kOutlineVariant, fontFamily: 'Geist')),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Developer Logs
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: kSurfaceContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide(color: kOutlineVariant)),
                                color: kSurfaceVariant,
                                borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('TECHNICAL LOG', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                                  const Icon(Icons.terminal, size: 14, color: kOutlineVariant),
                                ],
                              ),
                            ),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: ListView(
                                  children: [
                                    _buildLogEntry('[14:22:01]', 'ERR_NODE_TIMEOUT_0x1', kError),
                                    _buildLogEntry('[14:22:01]', 'socket.io reconnecting...', kOnSurfaceVariant),
                                    _buildLogEntry('[14:21:58]', 'ERR_CONNECTION_REFUSED', kError),
                                    _buildLogEntry('[14:21:55]', 'Handshake phase 2 initiated', kOnSurfaceVariant),
                                    _buildLogEntry('[14:21:54]', 'Discovery packet sent to 192.168.1.45', kOnSurfaceVariant),
                                    Text('... awaiting ping response', style: kBodyMd.copyWith(color: kOnSurfaceVariant.withOpacity(0.4), fontStyle: FontStyle.italic)),
                                  ],
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () {},
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: const BoxDecoration(
                                  border: Border(top: BorderSide(color: kOutlineVariant)),
                                  color: kSurfaceVariant,
                                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.copy, size: 16, color: kOnSurfaceVariant),
                                    const SizedBox(width: 8),
                                    Text('Copy Log for Support', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Settings Shortcut
                    InkWell(
                      onTap: () {},
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: kSurfaceContainer,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.transparent),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.settings_input_antenna, color: kOutlineVariant),
                                const SizedBox(width: 12),
                                Text('Connection Settings', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                              ],
                            ),
                            const Icon(Icons.chevron_right, size: 18, color: kOutlineVariant),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDiagnosticRow(String title, String value, Color statusColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
          Row(
            children: [
              Text(value, style: kBodyMd.copyWith(color: statusColor, fontFamily: 'Geist')),
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogEntry(String time, String message, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: RichText(
        text: TextSpan(
          style: kBodyMd.copyWith(fontFamily: 'Geist', color: color),
          children: [
            TextSpan(text: '$time ', style: const TextStyle(color: kOutlineVariant)),
            TextSpan(text: message),
          ],
        ),
      ),
    );
  }
}
