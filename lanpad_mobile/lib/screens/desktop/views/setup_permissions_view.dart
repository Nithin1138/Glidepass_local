import 'package:flutter/material.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

class SetupPermissionsView extends StatelessWidget {
  final DesktopState state;

  const SetupPermissionsView({Key? key, required this.state}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Permissions & Environment', style: kHeadlineLg),
          const SizedBox(height: 8),
          Text(
            'To provide low-latency input sharing and clipboard sync, LANpad requires specific system permissions. These are stored locally and never leave your network.',
            style: kBodyLg.copyWith(color: kOnSurfaceVariant),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Column(
                    children: [
                      _buildPermissionCard(
                        icon: Icons.accessibility_new,
                        iconColor: kPrimary,
                        title: 'Accessibility',
                        status: 'Granted',
                        statusColor: Colors.green,
                        description: 'Allows LANpad to simulate keyboard and mouse events from remote nodes. Required for the "Virtual KVM" feature.',
                        buttonText: 'Managed by System',
                        buttonIcon: Icons.lock,
                        enabled: false,
                      ),
                      const SizedBox(height: 16),
                      _buildPermissionCard(
                        icon: Icons.keyboard,
                        iconColor: kTertiary,
                        title: 'Input Monitoring',
                        status: 'Pending',
                        statusColor: kTertiary,
                        description: 'Required to capture global hotkeys and clipboard events when LANpad is in the background. Without this, sync will only work when the app is focused.',
                        buttonText: 'Enable Permission',
                        buttonIcon: Icons.arrow_forward,
                        enabled: true,
                        isPrimaryAction: true,
                      ),
                      const SizedBox(height: 16),
                      _buildPermissionCard(
                        icon: Icons.folder,
                        iconColor: kOnSurfaceVariant,
                        title: 'Full Disk Access',
                        status: 'Optional',
                        statusColor: kOnSurfaceVariant,
                        description: 'Enable this if you want to use the "Seamless Drag & Drop" file transfer between connected machines. This allows reading files outside the Sandbox.',
                        buttonText: 'Grant Access',
                        buttonIcon: Icons.add_moderator,
                        enabled: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  flex: 1,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: kSurfaceContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.network_check, color: kPrimary),
                            const SizedBox(width: 8),
                            Text('Connection Check', style: kBodyLg.copyWith(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _buildStatRow('Local Latency', '0.42ms', valueColor: kPrimary),
                        const Divider(color: kOutlineVariant),
                        _buildStatRow('Gateway Hub', '192.168.1.1'),
                        const Divider(color: kOutlineVariant),
                        _buildStatRow('mDNS Service', 'Active', valueColor: Colors.green),
                        const Divider(color: kOutlineVariant),
                        _buildStatRow('Encryption', 'AES-256', valueColor: Colors.green),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: kSurfaceLow,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: kOutlineVariant),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('NETWORK TOPOLOGY', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Icon(Icons.laptop_mac, color: kPrimary),
                                  Expanded(
                                    child: Container(
                                      height: 2,
                                      margin: const EdgeInsets.symmetric(horizontal: 16),
                                      color: kOutlineVariant,
                                    ),
                                  ),
                                  const Icon(Icons.desktop_windows, color: kSecondary),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Divider(color: kOutlineVariant),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.help_outline, color: kOnSurfaceVariant, size: 20),
                  const SizedBox(width: 8),
                  Text('Having trouble? ', style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
                  Text('Read the docs', style: kBodyMd.copyWith(color: kPrimary)),
                ],
              ),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    ),
                    child: const Text('Skip for now'),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimary,
                      foregroundColor: kSurfaceLowest,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    ),
                    child: const Text('Finalize Setup'),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String status,
    required Color statusColor,
    required String description,
    required String buttonText,
    required IconData buttonIcon,
    required bool enabled,
    bool isPrimaryAction = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: iconColor.withOpacity(0.2)),
            ),
            child: Icon(icon, color: iconColor, size: 28),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(title, style: kBodyLg.copyWith(fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: statusColor.withOpacity(0.2)),
                      ),
                      child: Row(
                        children: [
                          if (statusColor == Colors.green || statusColor == kTertiary)
                            Container(
                              width: 6,
                              height: 6,
                              margin: const EdgeInsets.only(right: 6),
                              decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                            ),
                          Text(status, style: kLabelMd.copyWith(color: statusColor)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(description, style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
                const SizedBox(height: 16),
                if (enabled)
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: Icon(buttonIcon, size: 16),
                    label: Text(buttonText),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isPrimaryAction ? kPrimary : kSurfaceVariant,
                      foregroundColor: isPrimaryAction ? kSurfaceLowest : kOnSurface,
                    ),
                  )
                else
                  Row(
                    children: [
                      Icon(buttonIcon, size: 16, color: kOnSurfaceVariant.withOpacity(0.5)),
                      const SizedBox(width: 8),
                      Text(buttonText, style: kLabelMd.copyWith(color: kOnSurfaceVariant.withOpacity(0.5))),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label.toUpperCase(), style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
          Text(value, style: kBodyMd.copyWith(color: valueColor ?? kOnSurface, fontFamily: 'Geist')),
        ],
      ),
    );
  }
}
