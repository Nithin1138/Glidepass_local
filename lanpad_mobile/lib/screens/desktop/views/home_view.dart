import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;
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
    final isConnectedClient = state.connectionService.isConnected && !state.connectionService.isLocalConnection;

    if ((isRunning && hasDevices) || isConnectedClient) {
      return _ConnectedView(state: state);
    }
    return _WaitingView(state: state);
  }
}

// ─── Waiting / QR Pairing Screen ─────────────────────────────────────────────
class _WaitingView extends StatefulWidget {
  final DesktopState state;
  const _WaitingView({required this.state});

  @override
  State<_WaitingView> createState() => _WaitingViewState();
}

class _WaitingViewState extends State<_WaitingView> {
  bool _isScanning = false;
  bool _showManual = false;
  List<Map<String, dynamic>> _discoveredDevices = [];

  final _manualUrlController = TextEditingController();
  final _manualNameController = TextEditingController();
  final _manualCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _discoverLocalDevices();
  }

  @override
  void dispose() {
    _manualUrlController.dispose();
    _manualNameController.dispose();
    _manualCodeController.dispose();
    super.dispose();
  }

  Future<void> _discoverLocalDevices() async {
    if (_isScanning) return;
    setState(() {
      _isScanning = true;
      _discoveredDevices.clear();
    });

    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

      final localIps = interfaces.expand((i) => i.addresses).map((a) => a.address).toList();
      localIps.add('127.0.0.1');
      localIps.add('localhost');

      String? localIp;
      for (var interface in interfaces) {
        for (var addr in interface.addresses) {
          if (!addr.isLoopback) {
            localIp = addr.address;
            break;
          }
        }
        if (localIp != null) break;
      }

      if (localIp != null) {
        final parts = localIp.split('.');
        if (parts.length == 4) {
          final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';
          final List<Future<void>> tasks = [];

          final client = HttpClient();
          client.connectionTimeout = const Duration(milliseconds: 1000);

          for (int i = 1; i <= 254; i++) {
            final ip = '$subnet.$i';
            if (localIps.contains(ip)) continue;
            final url = 'http://$ip:8000';

            tasks.add(
              client.getUrl(Uri.parse('$url/api/connection/info'))
                  .then((req) => req.close())
                  .then((res) async {
                if (res.statusCode == 200) {
                  final bodyStr = await res.transform(utf8.decoder).join();
                  final data = jsonDecode(bodyStr);
                  if (data['status'] == 'success') {
                    final serverCode = data['session_code']?.toString() ?? '';
                    final myToken = widget.state.serverService.sessionToken;
                    final myCode = myToken.length >= 6 ? myToken.substring(myToken.length - 6) : myToken;
                    
                    if (serverCode.toLowerCase() == myCode.toLowerCase()) {
                      return;
                    }

                    if (mounted) {
                      setState(() {
                        if (!_discoveredDevices.any((d) => d['url'] == url)) {
                          _discoveredDevices.add({
                            'url': url,
                            'device_name': data['device_name'] ?? 'LANpad Device',
                            'session_code': data['session_code'] ?? '',
                            'ip': ip,
                          });
                        }
                      });
                    }
                  }
                }
              }).catchError((_) {}),
            );
          }
          await Future.wait(tasks);
        }
      }
    } catch (e) {
      debugPrint('Local discovery error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isScanning = false;
        });
      }
    }
  }

  void _showPairingDialog(Map<String, dynamic> device) {
    showDialog(
      context: context,
      builder: (context) {
        final codeController = TextEditingController();
        bool isConnecting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0F1216),
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: kOutlineVariant),
              ),
              title: Text('Connect to ${device['device_name']}',
                  style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Please enter the 6-digit session pairing code shown on target device home screen.',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: codeController,
                    style: GoogleFonts.inter(color: kOnSurface, fontSize: 14),
                    maxLength: 6,
                    decoration: InputDecoration(
                      hintText: 'Enter 6-digit code',
                      hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant.withOpacity(0.4)),
                      filled: true,
                      fillColor: kSurfaceContainer,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOutlineVariant),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOutlineVariant),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kPrimary),
                      ),
                      counterText: '',
                    ),
                  ),
                  if (errorText != null) ...[
                    const SizedBox(height: 8),
                    Text(errorText!, style: GoogleFonts.inter(color: kError, fontSize: 12)),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isConnecting ? null : () => Navigator.of(context).pop(),
                  child: Text('Cancel', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: kSurfaceLowest,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: isConnecting
                      ? null
                      : () async {
                          final code = codeController.text.trim();
                          if (code.length != 6) {
                            setModalState(() {
                              errorText = 'Code must be 6 digits.';
                            });
                            return;
                          }
                          setModalState(() {
                            isConnecting = true;
                            errorText = null;
                          });
                          final err = await widget.state.connectionService.connect(device['url'], code);
                          if (err != null) {
                            setModalState(() {
                              isConnecting = false;
                              errorText = err;
                            });
                          } else {
                            Navigator.of(context).pop();
                          }
                        },
                  child: isConnecting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text('Connect', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _connectManual() async {
    final url = _manualUrlController.text.trim();
    final code = _manualCodeController.text.trim();

    if (url.isEmpty || code.isEmpty) {
      widget.state.onShowToast('URL and pairing code are required', isError: true);
      return;
    }

    try {
      widget.state.onShowToast('Connecting manually...');
      final err = await widget.state.connectionService.connect(url, code);
      if (err != null) {
        widget.state.onShowToast('Connection failed: $err', isError: true);
      } else {
        widget.state.onShowToast('Connected successfully!');
      }
    } catch (e) {
      widget.state.onShowToast('Error: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;
    final tunnelUrl = widget.state.tunnelService.tunnelUrl;
    final isConnectingTunnel = !widget.state.isDirectLan && widget.state.tunnelService.isConnecting;

    final qrData = widget.state.isDirectLan
        ? 'http://${widget.state.localIp}:8000?sid=${widget.state.serverService.sessionToken}'
        : (tunnelUrl != null
            ? '$tunnelUrl?sid=${widget.state.serverService.sessionToken}'
            : 'https://lanpad.app?sid=${widget.state.serverService.sessionToken}');

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 768;

        Widget content;

        if (isNarrow) {
          content = Column(
            children: [
              _buildNearbyPanel(),
              const SizedBox(height: 32),
              _QrPanel(
                state: widget.state,
                isRunning: isRunning && !isConnectingTunnel,
                qrData: qrData,
                showConnecting: isConnectingTunnel,
              ),
            ],
          );
        } else {
          content = Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _showManual
                    ? Container(
                        padding: const EdgeInsets.all(24),
                        decoration: kGlassCard,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Manual Connection',
                                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
                            const SizedBox(height: 4),
                            Text('Enter connection details of another device directly.',
                                style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                            const SizedBox(height: 24),
                            _buildTextField('Connection URL', _manualUrlController, 'http://192.168.0.106:8000'),
                            const SizedBox(height: 16),
                            _buildTextField('Device Name (Optional)', _manualNameController, 'Target Laptop'),
                            const SizedBox(height: 16),
                            _buildTextField('Pairing Code', _manualCodeController, '6-digit code', maxLength: 6),
                            const SizedBox(height: 28),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: kPrimary,
                                  foregroundColor: kSurfaceLowest,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: _connectManual,
                                child: Text('Connect Device', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                              ),
                            ),
                          ],
                        ),
                      )
                    : _buildNearbyPanel(),
              ),
              const SizedBox(width: 40),
              Expanded(
                child: _QrPanel(
                  state: widget.state,
                  isRunning: isRunning && !isConnectingTunnel,
                  qrData: qrData,
                  showConnecting: isConnectingTunnel,
                ),
              ),
            ],
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 960),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_showManual ? 'Manual Connection' : 'Discovery Mode', style: kHeadlineLg),
                          const SizedBox(height: 4),
                          Text(
                            _showManual
                                ? 'Pair and connect with another active command node directly.'
                                : 'Waiting for your mobile device or another laptop to connect.',
                            style: kBodyLg.copyWith(color: kOnSurfaceVariant),
                          ),
                        ],
                      ),
                      const Spacer(),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kSurfaceContainer,
                          foregroundColor: kPrimary,
                          side: const BorderSide(color: kOutlineVariant),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                        onPressed: () => setState(() => _showManual = !_showManual),
                        icon: Icon(_showManual ? LucideIcons.scan : LucideIcons.settings, size: 16),
                        label: Text(
                          _showManual ? 'Back to Scanner' : 'Manual Setup',
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
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

  Widget _buildTextField(String label, TextEditingController ctrl, String hint, {int? maxLength}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kOnSurface)),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          maxLength: maxLength,
          style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant.withOpacity(0.4)),
            filled: true,
            fillColor: kSurfaceLow,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kOutlineVariant),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kOutlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kPrimary),
            ),
            counterText: '',
          ),
        ),
      ],
    );
  }

  Widget _buildNearbyPanel() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Nearby Devices',
                  style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
              IconButton(
                onPressed: _isScanning ? null : _discoverLocalDevices,
                icon: Icon(
                  _isScanning ? Icons.sync : Icons.refresh,
                  color: kPrimary,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_isScanning && _discoveredDevices.isEmpty) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (_discoveredDevices.isEmpty) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Text('No nearby desktop or mobile apps found',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13)),
              ),
            ),
          ] else ...[
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _discoveredDevices.length,
              itemBuilder: (context, index) {
                final d = _discoveredDevices[index];
                final nameLower = d['device_name'].toString().toLowerCase();
                final isMobile = nameLower.contains('android') || 
                                 nameLower.contains('ios') || 
                                 nameLower.contains('phone') || 
                                 nameLower.contains('mobile');
                final icon = isMobile ? LucideIcons.smartphone : LucideIcons.laptop;

                final rawCode = d['session_code']?.toString() ?? '';
                final formattedCode = rawCode.length == 6
                    ? '${rawCode.substring(0, 3).toUpperCase()}-${rawCode.substring(3).toUpperCase()}'
                    : rawCode.toUpperCase();

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: InkWell(
                    onTap: () => _showPairingDialog(d),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: kSurfaceLow,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: kOutlineVariant),
                      ),
                      child: Row(
                        children: [
                          Icon(icon, color: kPrimary, size: 20),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(d['device_name'],
                                          style: GoogleFonts.inter(
                                              fontSize: 14, fontWeight: FontWeight.w600, color: kOnSurface),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis),
                                    ),
                                    if (formattedCode.isNotEmpty) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: kPrimary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: kPrimary.withOpacity(0.2)),
                                        ),
                                        child: Text(
                                          formattedCode,
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: kPrimary,
                                            letterSpacing: 1,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(d['url'],
                                    style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                              ],
                            ),
                          ),
                          Icon(LucideIcons.chevron_right, size: 16, color: kOnSurfaceVariant.withOpacity(0.5)),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
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
    final sessionCode = state.serverService.sessionToken.length >= 6 
        ? state.serverService.sessionToken.substring(state.serverService.sessionToken.length - 6).toUpperCase()
        : state.serverService.sessionToken;

    final tunnelUrl = state.tunnelService.tunnelUrl;
    final displayLink = state.isDirectLan
        ? 'http://${state.localIp}:8000'
        : (tunnelUrl ?? 'https://lanpad.app');

    return Column(children: [
      Text('Waiting for connection',
        style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w600, color: kOnSurface),
        textAlign: TextAlign.center),
      const SizedBox(height: 12),
      Text(
        'Connect your mobile device or another desktop client. Pairing Code: $sessionCode',
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
            displayLink,
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

  void _showScannerDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _ScannerDialog(state: state),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Connected', style: kHeadlineLg),
          const SizedBox(width: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: kPrimary,
              foregroundColor: kSurfaceLowest,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () => _showScannerDialog(context),
            icon: const Icon(LucideIcons.plus, size: 16),
            label: Text('Connect Device', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
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
            _DeviceHeroCard(state: state),
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

class _ScannerDialog extends StatefulWidget {
  final DesktopState state;
  const _ScannerDialog({required this.state});

  @override
  State<_ScannerDialog> createState() => _ScannerDialogState();
}

class _ScannerDialogState extends State<_ScannerDialog> {
  bool _isScanning = false;
  bool _showManual = false;
  List<Map<String, dynamic>> _discoveredDevices = [];

  final _manualUrlController = TextEditingController();
  final _manualNameController = TextEditingController();
  final _manualCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _discoverLocalDevices();
  }

  @override
  void dispose() {
    _manualUrlController.dispose();
    _manualNameController.dispose();
    _manualCodeController.dispose();
    super.dispose();
  }

  Future<void> _discoverLocalDevices() async {
    if (_isScanning) return;
    setState(() {
      _isScanning = true;
      _discoveredDevices.clear();
    });

    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

      final localIps = interfaces.expand((i) => i.addresses).map((a) => a.address).toList();
      localIps.add('127.0.0.1');
      localIps.add('localhost');

      String? localIp;
      for (var interface in interfaces) {
        for (var addr in interface.addresses) {
          if (!addr.isLoopback) {
            localIp = addr.address;
            break;
          }
        }
        if (localIp != null) break;
      }

      if (localIp != null) {
        final parts = localIp.split('.');
        if (parts.length == 4) {
          final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';
          final List<Future<void>> tasks = [];

          final client = HttpClient();
          client.connectionTimeout = const Duration(milliseconds: 1000);

          for (int i = 1; i <= 254; i++) {
            final ip = '$subnet.$i';
            if (localIps.contains(ip)) continue;
            final url = 'http://$ip:8000';

            tasks.add(
              client.getUrl(Uri.parse('$url/api/connection/info'))
                  .then((req) => req.close())
                  .then((res) async {
                if (res.statusCode == 200) {
                  final bodyStr = await res.transform(utf8.decoder).join();
                  final data = jsonDecode(bodyStr);
                  if (data['status'] == 'success') {
                    final serverCode = data['session_code']?.toString() ?? '';
                    final myToken = widget.state.serverService.sessionToken;
                    final myCode = myToken.length >= 6 ? myToken.substring(myToken.length - 6) : myToken;
                    
                    if (serverCode.toLowerCase() == myCode.toLowerCase()) {
                      return;
                    }

                    if (mounted) {
                      setState(() {
                        if (!_discoveredDevices.any((d) => d['url'] == url)) {
                          _discoveredDevices.add({
                            'url': url,
                            'device_name': data['device_name'] ?? 'LANpad Device',
                            'session_code': data['session_code'] ?? '',
                            'ip': ip,
                          });
                        }
                      });
                    }
                  }
                }
              }).catchError((_) {}),
            );
          }
          await Future.wait(tasks);
        }
      }
    } catch (e) {
      debugPrint('Local discovery error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isScanning = false;
        });
      }
    }
  }

  void _showPairingDialog(Map<String, dynamic> device) {
    showDialog(
      context: context,
      builder: (context) {
        final codeController = TextEditingController();
        bool isConnecting = false;
        String? errorText;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0F1216),
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: kOutlineVariant),
              ),
              title: Text('Connect to ${device['device_name']}',
                  style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Please enter the 6-digit session pairing code shown on target device home screen.',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: codeController,
                    style: GoogleFonts.inter(color: kOnSurface, fontSize: 14),
                    maxLength: 6,
                    decoration: InputDecoration(
                      hintText: 'Enter 6-digit code',
                      hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant.withOpacity(0.4)),
                      filled: true,
                      fillColor: kSurfaceContainer,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOutlineVariant),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOutlineVariant),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kPrimary),
                      ),
                      counterText: '',
                    ),
                  ),
                  if (errorText != null) ...[
                    const SizedBox(height: 8),
                    Text(errorText!, style: GoogleFonts.inter(color: kError, fontSize: 12)),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isConnecting ? null : () => Navigator.of(context).pop(),
                  child: Text('Cancel', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: kSurfaceLowest,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: isConnecting
                      ? null
                      : () async {
                          final code = codeController.text.trim();
                          if (code.length != 6) {
                            setModalState(() {
                              errorText = 'Code must be 6 digits.';
                            });
                            return;
                          }
                          setModalState(() {
                            isConnecting = true;
                            errorText = null;
                          });
                          final err = await widget.state.connectionService.connect(device['url'], code);
                          if (err != null) {
                            setModalState(() {
                              isConnecting = false;
                              errorText = err;
                            });
                          } else {
                            Navigator.of(context).pop();
                            Navigator.of(this.context).pop(); // Close scanner dialog too!
                          }
                        },
                  child: isConnecting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text('Connect', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _connectManual() async {
    final url = _manualUrlController.text.trim();
    final code = _manualCodeController.text.trim();

    if (url.isEmpty || code.isEmpty) {
      widget.state.onShowToast('URL and pairing code are required', isError: true);
      return;
    }

    try {
      widget.state.onShowToast('Connecting manually...');
      final err = await widget.state.connectionService.connect(url, code);
      if (err != null) {
        widget.state.onShowToast('Connection failed: $err', isError: true);
      } else {
        widget.state.onShowToast('Connected successfully!');
        Navigator.of(context).pop(); // Close dialog on success!
      }
    } catch (e) {
      widget.state.onShowToast('Error: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final qrData = 'http://${widget.state.localIp}:8000?sid=${widget.state.serverService.sessionToken}';

    return Dialog(
      backgroundColor: const Color(0xFF0F1216),
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kOutlineVariant),
      ),
      child: Container(
        width: 800,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _showManual ? 'Manual Relay Setup' : 'Connect another Device',
                  style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: kOnSurface),
                ),
                const SizedBox(width: 16),
                TextButton.icon(
                  onPressed: () => setState(() => _showManual = !_showManual),
                  icon: Icon(_showManual ? LucideIcons.scan : LucideIcons.settings, size: 14),
                  label: Text(
                    _showManual ? 'Back to Scanner' : 'Manual Relay Connection',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: kPrimary),
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(LucideIcons.x, size: 20, color: kOnSurfaceVariant),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _showManual
                  ? 'Enter connection credentials of another device directly to pair over relay/subnet.'
                  : 'Scan nearby network for active laptop/mobile app clients, or scan the QR code to connect mobile/web.',
              style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
            ),
            const SizedBox(height: 24),
            _showManual
                ? Center(
                    child: Container(
                      width: 500,
                      padding: const EdgeInsets.all(24),
                      decoration: kGlassCard,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTextField('Connection URL', _manualUrlController, 'http://192.168.0.106:8000'),
                          const SizedBox(height: 12),
                          _buildTextField('Device Name (Optional)', _manualNameController, 'Target Device'),
                          const SizedBox(height: 12),
                          _buildTextField('Pairing Code', _manualCodeController, '6-digit code', maxLength: 6),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: kPrimary,
                                foregroundColor: kSurfaceLowest,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: _connectManual,
                              child: Text('Connect Device', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : Flexible(
                    child: SingleChildScrollView(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _buildNearbyPanel()),
                          const SizedBox(width: 24),
                          Expanded(child: _buildQrPanel(qrData)),
                        ],
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController ctrl, String hint, {int? maxLength}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: kOnSurface)),
        const SizedBox(height: 4),
        TextField(
          controller: ctrl,
          maxLength: maxLength,
          style: GoogleFonts.inter(fontSize: 12, color: kOnSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant.withOpacity(0.4)),
            filled: true,
            fillColor: kSurfaceLow,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: kOutlineVariant),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: kOutlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: kPrimary),
            ),
            counterText: '',
          ),
        ),
      ],
    );
  }

  Widget _buildNearbyPanel() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Nearby Devices',
                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: kOnSurface)),
              IconButton(
                onPressed: _isScanning ? null : _discoverLocalDevices,
                icon: Icon(
                  _isScanning ? Icons.sync : Icons.refresh,
                  color: kPrimary,
                  size: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_isScanning && _discoveredDevices.isEmpty) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: CircularProgressIndicator(),
              ),
            ),
          ] else if (_discoveredDevices.isEmpty) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 30.0),
                child: Text('No nearby desktop apps found',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13)),
              ),
            ),
          ] else ...[
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _discoveredDevices.length,
              itemBuilder: (context, index) {
                final d = _discoveredDevices[index];
                final nameLower = d['device_name'].toString().toLowerCase();
                final isMobile = nameLower.contains('android') || 
                                 nameLower.contains('ios') || 
                                 nameLower.contains('phone') || 
                                 nameLower.contains('mobile');
                final icon = isMobile ? LucideIcons.smartphone : LucideIcons.laptop;

                final rawCode = d['session_code']?.toString() ?? '';
                final formattedCode = rawCode.length == 6
                    ? '${rawCode.substring(0, 3).toUpperCase()}-${rawCode.substring(3).toUpperCase()}'
                    : rawCode.toUpperCase();

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: InkWell(
                    onTap: () => _showPairingDialog(d),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: kSurfaceLow,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: kOutlineVariant),
                      ),
                      child: Row(
                        children: [
                          Icon(icon, color: kPrimary, size: 18),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(d['device_name'],
                                          style: GoogleFonts.inter(
                                              fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis),
                                    ),
                                    if (formattedCode.isNotEmpty) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: kPrimary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: kPrimary.withOpacity(0.2)),
                                        ),
                                        child: Text(
                                          formattedCode,
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: kPrimary,
                                            letterSpacing: 1,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(d['url'],
                                    style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                              ],
                            ),
                          ),
                          Icon(LucideIcons.chevron_right, size: 14, color: kOnSurfaceVariant.withOpacity(0.5)),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQrPanel(String qrData) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Scan to Connect',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: kOnSurface)),
                const SizedBox(height: 4),
                Text('Open LANpad on your phone or web browser to scan and link.',
                    style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: QrImageView(
              data: qrData,
              version: QrVersions.auto,
              size: 160,
              gapless: false,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Session Code: ${widget.state.serverService.sessionCode.toUpperCase()}',
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: kPrimary),
          ),
        ],
      ),
    );
  }
}

class _DeviceHeroCard extends StatelessWidget {
  final DesktopState state;
  const _DeviceHeroCard({required this.state});

  @override
  Widget build(BuildContext context) {
    final serverDeviceNames = state.serverService.connectedDeviceNames;
    final isClient = state.connectionService.isConnected && !state.connectionService.isLocalConnection;

    final rawCode = state.serverService.sessionToken;
    final formattedCode = rawCode.length >= 6
        ? '${rawCode.substring(rawCode.length - 6, rawCode.length - 3).toUpperCase()}-${rawCode.substring(rawCode.length - 3).toUpperCase()}'
        : rawCode.toUpperCase();

    if (isClient) {
      final name = state.connectionService.connectedDeviceName ?? 'Connected Server';
      return _buildSingleDeviceCard(context, name, isServer: false);
    }

    if (serverDeviceNames.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: kSurfaceContainer,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: kOutlineVariant),
        ),
        child: Center(
          child: Text('No devices connected yet',
              style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13)),
        ),
      );
    }

    return Column(
      children: serverDeviceNames.map((deviceName) => Padding(
        padding: const EdgeInsets.only(bottom: 16.0),
        child: _buildSingleDeviceCard(context, deviceName, isServer: true, code: formattedCode),
      )).toList(),
    );
  }

  Widget _buildSingleDeviceCard(BuildContext context, String name, {required bool isServer, String? code}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [kPrimary, kPrimary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: kPrimary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(isServer ? LucideIcons.smartphone : LucideIcons.laptop, color: Colors.white, size: 24),
              ),
              const Spacer(),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: kPrimary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onPressed: () {
                  if (isServer) {
                    state.onDisconnectRemoteDevice(name);
                  } else {
                    state.connectionService.disconnect();
                  }
                },
                child: Text('Disconnect', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                name,
                style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              if (code != null && code.isNotEmpty) ...[
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.white.withOpacity(0.3)),
                  ),
                  child: Text(
                    code,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Secure Peer-to-Peer Tunnel Active',
            style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withOpacity(0.8)),
          ),
        ],
      ),
    );
  }
}

class _ActivityFeed extends StatelessWidget {
  final DesktopState state;
  const _ActivityFeed({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Activity Feed',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600, color: kOnSurface)),
          const SizedBox(height: 16),
          state.loadingHistory
              ? const Center(child: CircularProgressIndicator())
              : state.history.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24.0),
                        child: Text('No activity yet',
                            style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13)),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: state.history.length > 5 ? 5 : state.history.length,
                      itemBuilder: (context, index) {
                        final item = state.history[index];
                        return _FeedRow(
                          title: item.content,
                          subtitle: '${item.mode.toUpperCase()}  ·  ${item.timestamp}',
                          icon: item.mode == 'typing' ? LucideIcons.keyboard : LucideIcons.file,
                        );
                      },
                    ),
        ],
      ),
    );
  }
}

class _FeedRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _FeedRow({required this.title, required this.subtitle, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: kSurfaceVariant,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: kPrimary, size: 16),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionsCard extends StatelessWidget {
  final DesktopState state;
  const _QuickActionsCard({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick Actions',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600, color: kOnSurface)),
          const SizedBox(height: 16),
          _ActionBtn(
            icon: LucideIcons.folder_sync,
            title: 'Share Files',
            subtitle: 'Upload files/directories',
            isPrimary: true,
            onTap: state.onPickAndUpload,
          ),
          const SizedBox(height: 12),
          _ActionBtn(
            icon: LucideIcons.keyboard,
            title: 'Send Paste',
            subtitle: 'Inject or simulate input',
            isPrimary: false,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _ConnectionStatsCard extends StatelessWidget {
  final DesktopState state;
  const _ConnectionStatsCard({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: kGlassCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Connection Stats',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600, color: kOnSurface)),
          const SizedBox(height: 16),
          _StatRow(label: 'Pairing Mode', value: state.isDirectLan ? 'Direct LAN' : 'Hybrid Relay'),
          const Divider(color: kOutlineVariant, height: 24),
          _StatRow(label: 'Tunnel Status', value: 'Connected'),
          const Divider(color: kOutlineVariant, height: 24),
          _StatRow(label: 'Tunnel IP', value: state.localIp),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  const _StatRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
        Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface)),
      ],
    );
  }
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
