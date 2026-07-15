import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Home view — shows the QR pairing screen when idle,
/// switches to the "connected" dashboard when a device is paired.
class HomeView extends StatelessWidget {
  final DesktopState state;
  const HomeView({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final hasDevices = state.serverService.connectedDeviceNames.isNotEmpty;
    final isRunning = state.serverService.isRunning;
    if (isRunning && hasDevices) return _ConnectedView(state: state);
    return _WaitingView(state: state);
  }
}

// ─── Waiting / QR Pairing Screen ─────────────────────────────────────────────
class _WaitingView extends StatelessWidget {
  final DesktopState state;
  const _WaitingView({required this.state});

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;
    final tunnelUrl = state.tunnelService.tunnelUrl;
    final isConnectingTunnel = !state.isDirectLan && state.tunnelService.isConnecting;

    final qrData = state.isDirectLan
        ? 'http://${state.localIp}:8000?sid=${state.serverService.sessionToken}'
        : (tunnelUrl != null
            ? '$tunnelUrl?sid=${state.serverService.sessionToken}'
            : 'https://lanpad.app?sid=${state.serverService.sessionToken}');

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 768;
        final content = isNarrow
            ? Column(
                children: [
                  _QrPanel(
                    state: state, 
                    isRunning: isRunning && !isConnectingTunnel, 
                    qrData: qrData,
                    showConnecting: isConnectingTunnel,
                  ),
                  const SizedBox(height: 32),
                  _QuickStartGuide(state: state),
                ],
              )
            : Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _QrPanel(
                      state: state, 
                      isRunning: isRunning && !isConnectingTunnel, 
                      qrData: qrData,
                      showConnecting: isConnectingTunnel,
                    ),
                  ),
                  const SizedBox(width: 40),
                  Expanded(
                    child: _QuickStartGuide(state: state),
                  ),
                ],
              );

        return SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 960),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Page header
                  Text('Discovery Mode', style: kHeadlineLg),
                  const SizedBox(height: 4),
                  Text(
                    'Waiting for your mobile device to connect.',
                    style: kBodyLg.copyWith(color: kOnSurfaceVariant),
                  ),
                  const SizedBox(height: 36),
                  content,
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _QrPanel extends StatelessWidget {
  final DesktopState state;
  final bool isRunning;
  final String qrData;
  final bool showConnecting;

  const _QrPanel({
    required this.state, 
    required this.isRunning, 
    required this.qrData,
    required this.showConnecting,
  });

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text('Waiting for connection',
        style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w600, color: kOnSurface),
        textAlign: TextAlign.center),
      const SizedBox(height: 12),
      Text(
        'Connect your mobile device to start sharing resources, managing inputs, and orchestrating your local environment.',
        style: GoogleFonts.inter(fontSize: 15, color: kOnSurfaceVariant, height: 1.5),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 36),

      // QR Container
      Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: kSurfaceContainer,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: kOutlineVariant),
          boxShadow: [BoxShadow(color: kPrimary.withValues(alpha: 0.06), blurRadius: 40)],
        ),
        child: showConnecting
            ? Container(
                width: 260, height: 260,
                decoration: BoxDecoration(
                  color: kSurfaceLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 20),
                  Text('Generating secure link...',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13),
                    textAlign: TextAlign.center),
                ]),
              )
            : (isRunning
                ? Container(
                    width: 260, height: 260, color: Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: QrImageView(data: qrData, version: QrVersions.auto, size: 236),
                    ),
                  )
                : Container(
                    width: 260, height: 260,
                    decoration: BoxDecoration(
                      color: kSurfaceLow,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(LucideIcons.server_off, color: kOnSurfaceVariant, size: 48),
                      const SizedBox(height: 16),
                      Text('Start the server\nto show QR code',
                        style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 14),
                        textAlign: TextAlign.center),
                    ]),
                  )),
      ),
      if (isRunning && !showConnecting) ...[
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SelectableText(
            qrData,
            style: GoogleFonts.inter(fontSize: 12, color: kPrimary, fontWeight: FontWeight.w500),
            textAlign: TextAlign.center,
          ),
        ),
      ],
      const SizedBox(height: 28),

      // LAN / Relay toggle
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        _ModeChip(
          label: 'Direct LAN',
          isActive: state.isDirectLan,
          onTap: () => state.onToggleLanMode(true),
        ),
        const SizedBox(width: 8),
        _ModeChip(
          label: 'Hybrid Relay',
          isActive: !state.isDirectLan,
          onTap: () => state.onToggleLanMode(false),
        ),
      ]),
      const SizedBox(height: 24),

      // Network stat pills
      Wrap(alignment: WrapAlignment.center, spacing: 10, children: [
        _StatPill(Icons.lan_rounded, 'INTERFACE', 'en0 (${state.localIp})'),
        _StatPill(Icons.shield_rounded, 'ENCRYPTION', 'AES-256-GCM'),
      ]),
    ]);
  }
}

class _QuickStartGuide extends StatelessWidget {
  final DesktopState state;
  const _QuickStartGuide({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Quick Start Guide',
              style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w600, color: kOnSurface)),
            const SizedBox(height: 6),
            Text('Get up and running in under 30 seconds.',
              style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
            const SizedBox(height: 36),

            _StartStep(1, 'Open LANpad on phone',
              'Ensure both devices are on the same local area network for optimal discovery.'),
            const SizedBox(height: 24),
            _StartStep(2, 'Scan QR Code',
              'Point your mobile camera at the code. Pairing is handled via secure local TLS.'),
            const SizedBox(height: 24),
            _StartStep(3, 'Share instantly',
              'Once connected, drag and drop files or use your phone as a precision input device.'),
          ]),
          const SizedBox(height: 40),

          Row(children: [
            Expanded(child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => launchUrl(Uri.parse('https://lanpad.app')),
              child: Text('Download Mobile App',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
            )),
            const SizedBox(width: 10),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: kOutlineVariant),
                foregroundColor: kOnSurface,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => launchUrl(Uri.parse('https://lanpad.app/help')),
              child: Text('Help Center', style: GoogleFonts.inter(fontSize: 13)),
            ),
          ]),
        ],
      ),
    );
  }
}

// ─── Connected Dashboard ──────────────────────────────────────────────────────
class _ConnectedView extends StatelessWidget {
  final DesktopState state;
  const _ConnectedView({required this.state});

  @override
  Widget build(BuildContext context) {
    final deviceNames = state.serverService.connectedDeviceNames;
    final firstDevice = deviceNames.isNotEmpty ? deviceNames.first : 'Mobile Device';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Connected', style: kHeadlineLg),
          const Spacer(),
          TextButton(
            onPressed: () {},
            child: Text('Clear History',
              style: GoogleFonts.inter(color: kPrimary, fontSize: 13)),
          ),
        ]),
        const SizedBox(height: 16),

        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Left col (8/12) — hero + activity
          Expanded(flex: 8, child: Column(children: [
            _DeviceHeroCard(deviceName: firstDevice, state: state),
            const SizedBox(height: 16),
            _ActivityFeed(state: state),
          ])),
          const SizedBox(width: 16),
          // Right col (4/12) — quick actions + stats
          Expanded(flex: 4, child: Column(children: [
            _QuickActionsCard(state: state),
            const SizedBox(height: 16),
            _ConnectionStatsCard(state: state),
          ])),
        ]),
      ]),
    );
  }
}

class _DeviceHeroCard extends StatelessWidget {
  final String deviceName;
  final DesktopState state;
  const _DeviceHeroCard({required this.deviceName, required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Row(children: [
        Stack(children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: kSurfaceContainer,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: kOutlineVariant),
            ),
            child: const Icon(LucideIcons.smartphone, color: kPrimary, size: 32),
          ),
          Positioned(bottom: 0, right: 0, child: Container(
            width: 18, height: 18,
            decoration: BoxDecoration(
              color: kSuccess, shape: BoxShape.circle,
              border: Border.all(color: kSurface, width: 3),
            ),
          )),
        ]),
        const SizedBox(width: 20),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(deviceName, style: GoogleFonts.outfit(
              fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: kPrimary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('Active Session', style: GoogleFonts.inter(
                fontSize: 10, fontWeight: FontWeight.bold, color: kPrimary, letterSpacing: 0.8)),
            ),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            const Icon(LucideIcons.clock, color: kOnSurfaceVariant, size: 13),
            const SizedBox(width: 6),
            Text(state.sessionTimeFormatted,
              style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
            const SizedBox(width: 16),
            const Icon(LucideIcons.wifi, color: kOnSurfaceVariant, size: 13),
            const SizedBox(width: 6),
            Text('Strong Signal',
              style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
          ]),
        ])),
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: kError.withValues(alpha: 0.3)),
            foregroundColor: kError,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          ),
          onPressed: state.onToggleServer,
          child: Text('Disconnect',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ]),
    );
  }
}

class _ActivityFeed extends StatelessWidget {
  final DesktopState state;
  const _ActivityFeed({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Activity Feed', style: GoogleFonts.outfit(
          fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
        const SizedBox(height: 16),
        // Table header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 10),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant)),
          ),
          child: Row(children: [
            Expanded(flex: 6, child: Text('ACTION', style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.bold,
              color: kOnSurfaceVariant, letterSpacing: 1.2))),
            Expanded(flex: 3, child: Text('TARGET', style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.bold,
              color: kOnSurfaceVariant, letterSpacing: 1.2))),
            Expanded(flex: 3, child: Text('TIME', style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.bold,
              color: kOnSurfaceVariant, letterSpacing: 1.2),
              textAlign: TextAlign.right)),
          ]),
        ),
        const SizedBox(height: 4),
        if (state.loadingHistory)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (state.history.isEmpty)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text('No activity yet', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
            ),
          )
        else
          ...List.generate(state.history.length > 4 ? 4 : state.history.length, (i) {
            final item = state.history[i];
            
            IconData icon = LucideIcons.file;
            Color color = kOnSurfaceVariant;
            if (item.mode == 'copy' || item.mode == 'paste') {
              icon = LucideIcons.clipboard_copy;
              color = kPrimary;
            } else if (item.mode == 'link') {
              icon = LucideIcons.link;
              color = kSecondary;
            } else if (item.mode == 'text' || item.mode == 'type') {
              icon = LucideIcons.keyboard;
              color = kTertiary;
            }

            return _actRow(icon, color, item.title, item.content, state.displayDeviceName, item.timestamp, isLast: i == (state.history.length > 4 ? 3 : state.history.length - 1));
          }),
      ]),
    );
  }

  Widget _actRow(IconData icon, Color color, String action, String detail,
      String target, String time, {bool isLast = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: isLast ? null
            : const Border(bottom: BorderSide(color: kOutlineVariant, width: 0.5)),
      ),
      child: Row(children: [
        Expanded(flex: 6, child: Row(children: [
          Icon(icon, color: color, size: 17),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(action, style: GoogleFonts.inter(
              fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface)),
            Text(detail, style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
        ])),
        Expanded(flex: 3, child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: kSurfaceVariant, borderRadius: BorderRadius.circular(6)),
          child: Text(target, style: GoogleFonts.inter(fontSize: 11, color: kOnSurface),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        )),
        Expanded(flex: 3, child: Text(time, style: GoogleFonts.inter(
          fontSize: 11, color: kOnSurfaceVariant), textAlign: TextAlign.right)),
      ]),
    );
  }
}

class _QuickActionsCard extends StatelessWidget {
  final DesktopState state;
  const _QuickActionsCard({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Quick Actions', style: GoogleFonts.outfit(
          fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
        const SizedBox(height: 16),
        _ActionBtn(icon: LucideIcons.send, title: 'Send Clipboard',
          subtitle: 'Push text to phone', isPrimary: true, onTap: () {
          state.onShowToast('Clipboard sent!');
        }),
        const SizedBox(height: 10),
        _ActionBtn(icon: LucideIcons.clipboard_paste, title: 'Paste Here',
          subtitle: 'Pull from phone', isPrimary: false, onTap: () {
          state.onShowToast('Paste request sent');
        }),
        const SizedBox(height: 10),
        _ActionBtn(icon: LucideIcons.keyboard, title: 'Enter Type Mode',
          subtitle: 'PC Keyboard to Mobile', isPrimary: false,
          accentColor: kSecondary, onTap: () {
          state.onShowToast('Type mode activated');
        }),
      ]),
    );
  }
}

class _ConnectionStatsCard extends StatelessWidget {
  final DesktopState state;
  const _ConnectionStatsCard({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Connection Stats', style: GoogleFonts.outfit(
          fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('LATENCY', style: GoogleFonts.inter(
              fontSize: 9, color: kOnSurfaceVariant, letterSpacing: 1.2,
              fontWeight: FontWeight.bold)),
            Text('12ms', style: GoogleFonts.outfit(
              fontSize: 24, fontWeight: FontWeight.bold, color: kPrimary)),
          ]),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (final h in [12, 18, 8, 22, 28, 14])
              Container(
                margin: const EdgeInsets.only(left: 2),
                width: 4, height: h.toDouble(),
                decoration: BoxDecoration(
                  color: kPrimary, borderRadius: BorderRadius.circular(2)),
              ),
          ]),
        ]),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: kSurfaceContainer,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: kOutlineVariant),
          ),
          child: Row(children: [
            const Icon(LucideIcons.shield_check, color: kSuccess, size: 17),
            const SizedBox(width: 10),
            Expanded(
              child: Text('WPA3 - AES 256 Encrypted',
                style: GoogleFonts.inter(fontSize: 12, color: kOnSurface),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ]),
        ),
        const SizedBox(height: 14),
        const Divider(color: kOutlineVariant, height: 1),
        const SizedBox(height: 12),
        Text('IP ADDRESSES', style: GoogleFonts.inter(
          fontSize: 9, color: kOnSurfaceVariant, letterSpacing: 1.2, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _ipRow('Desktop', state.localIp),
        const SizedBox(height: 6),
        if (state.serverService.connectedDeviceNames.isNotEmpty)
          _ipRow('Mobile', '192.168.x.x'),
      ]),
    );
  }

  Widget _ipRow(String label, String ip) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
      Text(ip, style: GoogleFonts.inter(fontSize: 12, color: kOnSurface, fontWeight: FontWeight.w500)),
    ],
  );
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────
class _ModeChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _ModeChip({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: isActive ? kSurfaceVariant : kSurfaceContainer,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isActive ? kPrimary.withValues(alpha: 0.5) : kOutlineVariant),
      ),
      child: Text(label, style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        color: isActive ? kPrimary : kOnSurfaceVariant)),
    ),
  );
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _StatPill(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: kSurfaceContainer,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: kOutlineVariant),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: kPrimary, size: 14),
      const SizedBox(width: 8),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: GoogleFonts.inter(fontSize: 9, color: kOnSurfaceVariant, letterSpacing: 1.1)),
        Text(value, style: GoogleFonts.inter(fontSize: 11, color: kOnSurface, fontWeight: FontWeight.w500)),
      ]),
    ]),
  );
}

class _StartStep extends StatelessWidget {
  final int num;
  final String title;
  final String desc;
  const _StartStep(this.num, this.title, this.desc);

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: kPrimary),
        ),
        child: Center(child: Text('$num', style: GoogleFonts.inter(
          fontSize: 12, fontWeight: FontWeight.bold, color: kPrimary))),
      ),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: GoogleFonts.inter(
          fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
        Text(desc, style: GoogleFonts.inter(
          fontSize: 13, color: kOnSurfaceVariant, height: 1.5)),
      ])),
    ],
  );
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isPrimary;
  final Color accentColor;
  final VoidCallback onTap;

  const _ActionBtn({
    required this.icon, required this.title, required this.subtitle,
    required this.isPrimary, required this.onTap,
    this.accentColor = kPrimary,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isPrimary ? kPrimary : kSurfaceVariant,
        borderRadius: BorderRadius.circular(14),
        border: isPrimary ? null : Border.all(color: kOutlineVariant),
      ),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: isPrimary
                ? kSurfaceLowest.withValues(alpha: 0.15)
                : accentColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: isPrimary ? kSurfaceLowest : accentColor, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: GoogleFonts.inter(
            fontSize: 13, fontWeight: FontWeight.bold,
            color: isPrimary ? kSurfaceLowest : kOnSurface)),
          Text(subtitle, style: GoogleFonts.inter(
            fontSize: 11,
            color: isPrimary ? kSurfaceLowest.withValues(alpha: 0.7) : kOnSurfaceVariant)),
        ])),
        Icon(LucideIcons.chevron_right,
          color: isPrimary ? kSurfaceLowest.withValues(alpha: 0.5) : kOnSurfaceVariant,
          size: 16),
      ]),
    ),
  );
}
