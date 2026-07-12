import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/server_service.dart';
import '../services/tunnel_service.dart';

class DesktopDashboard extends StatefulWidget {
  const DesktopDashboard({super.key});

  @override
  State<DesktopDashboard> createState() => _DesktopDashboardState();
}

class _DesktopDashboardState extends State<DesktopDashboard> {
  final ServerService _serverService = ServerService();
  final TunnelService _tunnelService = TunnelService();
  late StreamSubscription _serverSub;
  late StreamSubscription _tunnelSub;

  bool _isDirectLan = true;
  String _localIp = 'Detecting...';

  @override
  void initState() {
    super.initState();
    _serverSub = _serverService.onStatusChanged.listen((_) => setState(() {}));
    _tunnelSub = _tunnelService.onStatusChanged.listen((_) => setState(() {}));
    _fetchLocalIp();
  }

  @override
  void dispose() {
    _serverSub.cancel();
    _tunnelSub.cancel();
    super.dispose();
  }

  Future<void> _fetchLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLinkLocal: false,
      );
      for (final interface in interfaces) {
        for (final addr in interface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('169.254')) {
            setState(() {
              _localIp = addr.address;
            });
            return;
          }
        }
      }
    } catch (_) {}
    setState(() {
      _localIp = '127.0.0.1';
    });
  }

  Future<void> _toggleServer() async {
    if (_serverService.isRunning) {
      await _serverService.stopServer();
      await _tunnelService.stopTunnel();
    } else {
      await _serverService.startServer();
      if (!_isDirectLan) {
        await _tunnelService.startTunnel();
      }
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData.dark();
    final isRunning = _serverService.isRunning;

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F13),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F0F13), Color(0xFF161622)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Row(
          children: [
            // Left Navigation/Control Bar
            Container(
              width: 280,
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Color(0xFF181824),
                border: Border(
                  right: BorderSide(color: Color(0xFF262636), width: 1),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // App Title
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2C2C3E),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          LucideIcons.keyboard,
                          color: Color(0xFFFF7A45),
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'LANpad',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Server Master Control Button
                  GestureDetector(
                    onTap: _toggleServer,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        gradient: isRunning
                            ? const LinearGradient(colors: [Color(0xFFFF4D4D), Color(0xFFFF7A45)])
                            : const LinearGradient(colors: [Color(0xFF0077C0), Color(0xFF00B4D8)]),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: (isRunning ? const Color(0xFFFF4D4D) : const Color(0xFF0077C0))
                                .withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Center(
                        child: Text(
                          isRunning ? 'Stop Server' : 'Start Server',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Mode Selector Card
                  Text(
                    'CONNECTION MODE',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF8888A0),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildModeToggle(
                    title: 'Direct LAN',
                    subtitle: 'Local Wi-Fi connections',
                    icon: LucideIcons.wifi,
                    isActive: _isDirectLan,
                    onTap: () {
                      if (!isRunning) {
                        setState(() => _isDirectLan = true);
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                  _buildModeToggle(
                    title: 'Hybrid Relay',
                    subtitle: 'Internet secure tunnel',
                    icon: LucideIcons.globe,
                    isActive: !_isDirectLan,
                    onTap: () {
                      if (!isRunning) {
                        setState(() => _isDirectLan = false);
                      }
                    },
                  ),
                  
                  const Spacer(),
                  // Device Status Badge
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF20202F),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF2C2C3E)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isRunning ? const Color(0xFF00C853) : const Color(0xFF8888A0),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isRunning ? 'Server Live' : 'Offline',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isRunning ? const Color(0xFF00C853) : const Color(0xFF8888A0),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Device Name:',
                          style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8888A0)),
                        ),
                        Text(
                          isRunning ? _serverService.deviceName : '---',
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        if (isRunning) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Session Code:',
                            style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8888A0)),
                          ),
                          Text(
                            _serverService.sessionCode,
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF0077C0),
                            ),
                          ),
                        ]
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Main Display Pane
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top Info Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Dashboard',
                              style: GoogleFonts.outfit(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              isRunning
                                  ? (_isDirectLan
                                      ? 'Connect using direct URL: http://$_localIp:8000'
                                      : (_tunnelService.tunnelUrl ?? 'Establishing secure tunnel...'))
                                  : 'Start the local bridge to connect your devices.',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: const Color(0xFF8888A0),
                              ),
                            ),
                          ],
                        ),
                        // Connection count indicator
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E1E2F),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF2C2C3E)),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.users, color: Color(0xFF0077C0), size: 16),
                              const SizedBox(width: 8),
                              Text(
                                '${_serverService.connectedClientsCount} Connected',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Main Panels: Connected Devices & Drag/Drop Upload
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Connected Devices List
                          Expanded(
                            flex: 1,
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: const Color(0xFF181824),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: const Color(0xFF262636)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Connected Devices',
                                    style: GoogleFonts.outfit(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Expanded(
                                    child: _serverService.connectedDeviceNames.isEmpty
                                        ? Center(
                                            child: Text(
                                              'No devices currently paired.',
                                              style: GoogleFonts.inter(
                                                color: const Color(0xFF60607F),
                                                fontSize: 13,
                                              ),
                                            ),
                                          )
                                        : ListView.builder(
                                            itemCount: _serverService.connectedDeviceNames.length,
                                            itemBuilder: (context, idx) {
                                              final name = _serverService.connectedDeviceNames[idx];
                                              return Container(
                                                margin: const EdgeInsets.only(bottom: 12),
                                                padding: const EdgeInsets.all(12),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF20202F),
                                                  borderRadius: BorderRadius.circular(16),
                                                  border: Border.all(color: const Color(0xFF2C2C3E)),
                                                ),
                                                child: Row(
                                                  children: [
                                                    const CircleAvatar(
                                                      backgroundColor: Color(0xFF0077C0),
                                                      child: Icon(LucideIcons.smartphone, color: Colors.white, size: 16),
                                                    ),
                                                    const SizedBox(width: 12),
                                                    Text(
                                                      name,
                                                      style: GoogleFonts.inter(
                                                        fontWeight: FontWeight.w600,
                                                        color: Colors.white,
                                                      ),
                                                    ),
                                                    const Spacer(),
                                                    const Icon(LucideIcons.circle_check, color: Color(0xFF00C853), size: 16),
                                                  ],
                                                ),
                                              );
                                            },
                                          ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 24),

                          // File Exchange Dashboard Panel
                          Expanded(
                            flex: 1,
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: const Color(0xFF181824),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: const Color(0xFF262636)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Shared Files Log',
                                    style: GoogleFonts.outfit(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Expanded(
                                    child: Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(
                                            LucideIcons.folder_open,
                                            size: 48,
                                            color: Color(0xFF8888A0),
                                          ),
                                          const SizedBox(height: 16),
                                          Text(
                                            'Sync Files with Devices',
                                            style: GoogleFonts.inter(
                                              fontWeight: FontWeight.w600,
                                              color: Colors.white,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Send or receive files dynamically from your mobile app',
                                            textAlign: TextAlign.center,
                                            style: GoogleFonts.inter(
                                              color: const Color(0xFF8888A0),
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
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
          ],
        ),
      ),
    );
  }

  Widget _buildModeToggle({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: _serverService.isRunning ? 0.5 : 1.0,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF222234) : const Color(0xFF1A1A26),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? const Color(0xFF0077C0) : const Color(0xFF2C2C3E),
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: isActive ? const Color(0xFF0077C0) : const Color(0xFF8888A0), size: 20),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      color: const Color(0xFF8888A0),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
