import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

class SetupPermissionsView extends StatefulWidget {
  final DesktopState state;

  const SetupPermissionsView({Key? key, required this.state}) : super(key: key);

  @override
  State<SetupPermissionsView> createState() => _SetupPermissionsViewState();
}

class _SetupPermissionsViewState extends State<SetupPermissionsView> {
  bool _inputMonitoringGranted = false;
  bool _fullDiskAccessGranted = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final isAccessGranted = s.hasAccessibilityPermission;

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
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isNarrow = constraints.maxWidth < 900;

                final permissionCards = Column(
                  children: [
                    _buildPermissionCard(
                      icon: Icons.accessibility_new,
                      iconColor: kPrimary,
                      title: 'Accessibility',
                      status: isAccessGranted ? 'Granted' : 'Pending',
                      statusColor: isAccessGranted ? Colors.green : const Color(0xFFFFB300),
                      description: 'Allows simulated typing and keyboard events from remote devices.',
                      buttonText: isAccessGranted ? 'Change in Settings' : 'Configure',
                      buttonIcon: isAccessGranted ? Icons.settings : Icons.settings,
                      enabled: true,
                      onPressed: () async {
                        if (Platform.isMacOS) {
                          final uri = Uri.parse('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri);
                          }
                        }
                        s.onRequestAccessibility();
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildPermissionCard(
                      icon: Icons.keyboard,
                      iconColor: kTertiary,
                      title: 'Input Monitoring',
                      status: _inputMonitoringGranted ? 'Granted' : 'Pending',
                      statusColor: _inputMonitoringGranted ? Colors.green : kTertiary,
                      description: 'Allows hotkeys and clipboard synchronization when the app runs in the background.',
                      buttonText: _inputMonitoringGranted ? 'Revoke/Change' : 'Enable Permission',
                      buttonIcon: _inputMonitoringGranted ? Icons.remove_circle_outline : Icons.arrow_forward,
                      enabled: true,
                      isPrimaryAction: !_inputMonitoringGranted,
                      onPressed: () async {
                        if (_inputMonitoringGranted) {
                          setState(() => _inputMonitoringGranted = false);
                          s.onShowToast('Input Monitoring Permission Revoked');
                        } else {
                          if (Platform.isMacOS) {
                            final uri = Uri.parse('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent');
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri);
                            }
                          }
                          final granted = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              backgroundColor: kSurfaceContainer,
                              title: Text('Confirm Input Monitoring', style: GoogleFonts.outfit(color: kOnSurface)),
                              content: Text('Please verify if you have checked the LANpad option under Input Monitoring in System Settings.', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: Text('Not yet', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                                ),
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: ElevatedButton.styleFrom(backgroundColor: kPrimary, foregroundColor: kSurfaceLowest),
                                  child: Text('Yes, I granted it', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          );
                          if (granted == true) {
                            setState(() => _inputMonitoringGranted = true);
                            s.onShowToast('Input Monitoring Permission Enabled');
                          }
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    _buildPermissionCard(
                      icon: Icons.folder,
                      iconColor: kOnSurfaceVariant,
                      title: 'Full Disk Access',
                      status: _fullDiskAccessGranted ? 'Granted' : 'Optional',
                      statusColor: _fullDiskAccessGranted ? Colors.green : kOnSurfaceVariant,
                      description: 'Allows seamless drag-and-drop file transfers outside the app sandbox.',
                      buttonText: _fullDiskAccessGranted ? 'Revoke/Change' : 'Grant Access',
                      buttonIcon: _fullDiskAccessGranted ? Icons.remove_circle_outline : Icons.add_moderator,
                      enabled: true,
                      isPrimaryAction: false,
                      onPressed: () async {
                        if (_fullDiskAccessGranted) {
                          setState(() => _fullDiskAccessGranted = false);
                          s.onShowToast('Full Disk Access Revoked');
                        } else {
                          if (Platform.isMacOS) {
                            final uri = Uri.parse('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri);
                            }
                          }
                          final granted = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              backgroundColor: kSurfaceContainer,
                              title: Text('Confirm Full Disk Access', style: GoogleFonts.outfit(color: kOnSurface)),
                              content: Text('Please verify if you have enabled Full Disk Access for LANpad in System Settings.', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: Text('Not yet', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                                ),
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: ElevatedButton.styleFrom(backgroundColor: kPrimary, foregroundColor: kSurfaceLowest),
                                  child: Text('Yes, I granted it', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          );
                          if (granted == true) {
                            setState(() => _fullDiskAccessGranted = true);
                            s.onShowToast('Full Disk Access Granted');
                          }
                        }
                      },
                    ),
                  ],
                );

                final connectionCheck = Container(
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
                          Icon(Icons.network_check, color: kPrimary),
                          const SizedBox(width: 8),
                          Text('Connection Check', style: kBodyLg.copyWith(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildStatRow('Local Latency', '0.42ms', valueColor: kPrimary),
                      Divider(color: kOutlineVariant),
                      _buildStatRow('Gateway Hub', '192.168.1.1'),
                      Divider(color: kOutlineVariant),
                      _buildStatRow('mDNS Service', 'Active', valueColor: Colors.green),
                      Divider(color: kOutlineVariant),
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
                                Icon(Icons.laptop_mac, color: kPrimary),
                                Expanded(
                                  child: Container(
                                    height: 2,
                                    margin: const EdgeInsets.symmetric(horizontal: 16),
                                    color: kOutlineVariant,
                                  ),
                                ),
                                Icon(Icons.desktop_windows, color: kSecondary),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );

                if (isNarrow) {
                  return SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        permissionCards,
                        const SizedBox(height: 24),
                        connectionCheck,
                      ],
                    ),
                  );
                } else {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: SingleChildScrollView(
                          child: permissionCards,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: SingleChildScrollView(
                          child: connectionCheck,
                        ),
                      ),
                    ],
                  );
                }
              },
            ),
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
    required VoidCallback onPressed,
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
                    onPressed: onPressed,
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
