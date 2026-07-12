import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/connection_service.dart';
import '../widgets/aurora_background.dart';
import '../widgets/liquid_glass_card.dart';
import '../widgets/animated_button.dart';
import '../widgets/app_logo.dart';
import '../config/theme.dart';
import 'main_navigation_screen.dart';
import '../widgets/glass_segmented_control.dart';

class ConnectScreen extends StatefulWidget {
  final bool isAddingDevice;
  const ConnectScreen({super.key, this.isAddingDevice = false});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> with TickerProviderStateMixin {
  final _deviceNameController = TextEditingController();
  final _sessionCodeController = TextEditingController();

  bool _isScanning = false;
  bool _isLoading = false;
  bool _isManualSearching = false;
  List<Map<String, dynamic>> _discoveredDevices = [];
  bool _isDiscovering = false;
  bool _showManual = false;
  int _selectedTab = 0; // 0 = QR Scan, 1 = Nearby, 2 = Manual
  bool _slideForward = true;
  Timer? _discoveryTimer;
  OverlayEntry? _overlayEntry;

  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late AnimationController _scannerLineController;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _fadeAnimation = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
    
    _scannerLineController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    
    _discoverLocalDevices(clear: true);
  }

  @override
  void dispose() {
    _stopDiscoveryTimer();
    _overlayEntry?.remove();
    _overlayEntry = null;
    _deviceNameController.dispose();
    _sessionCodeController.dispose();
    _fadeController.dispose();
    _scannerLineController.dispose();
    super.dispose();
  }

  void _startDiscoveryTimer() {
    _stopDiscoveryTimer();
    _discoverLocalDevices(clear: _discoveredDevices.isEmpty);
    _discoveryTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_selectedTab == 1 && !_isDiscovering && mounted) {
        _discoverLocalDevices(clear: false);
      }
    });
  }

  void _stopDiscoveryTimer() {
    _discoveryTimer?.cancel();
    _discoveryTimer = null;
  }

  Future<void> _discoverLocalDevices({bool clear = false}) async {
    if (_isDiscovering) return;
    setState(() {
      _isDiscovering = true;
      if (clear) {
        _discoveredDevices.clear();
      }
    });

    final Set<String> activeUrls = {};

    try {
      final interfaces = await NetworkInterface.list(
        includeLinkLocal: false,
        type: InternetAddressType.IPv4,
      );

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

          for (int i = 1; i <= 254; i++) {
            final ip = '$subnet.$i';
            final url = 'http://$ip:8000';
            tasks.add(
              http.get(Uri.parse('$url/api/connection/info')).timeout(const Duration(milliseconds: 1200)).then((res) {
                if (res.statusCode == 200) {
                  final data = jsonDecode(res.body);
                  if (data['status'] == 'success') {
                    activeUrls.add(url);
                    if (mounted) {
                      setState(() {
                        final existingIndex = _discoveredDevices.indexWhere((d) => d['url'] == url);
                        final deviceData = {
                          'url': url,
                          'device_name': data['device_name'] ?? 'LANpad Laptop',
                          'session_code': data['session_code'] ?? '',
                          'ip': ip,
                        };
                        if (existingIndex >= 0) {
                          _discoveredDevices[existingIndex] = deviceData;
                        } else {
                          _discoveredDevices.add(deviceData);
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
          _isDiscovering = false;
          // Clean up offline devices only if we did a full subnet scan successfully
          if (activeUrls.isNotEmpty || clear) {
            _discoveredDevices.removeWhere((d) => !activeUrls.contains(d['url']));
          }
        });
      }
    }
  }

  // Manual connect: find device by name on LAN, then verify session code
  Future<void> _connectManually() async {
    final deviceName = _deviceNameController.text.trim();
    final sessionCode = _sessionCodeController.text.trim();

    if (deviceName.isEmpty || sessionCode.isEmpty) {
      _showToast('Please enter both Device Name and Session Code', isError: true);
      return;
    }

    setState(() => _isManualSearching = true);

    try {
      // First check already-discovered devices (case-insensitive name comparison)
      final existing = _discoveredDevices.firstWhere(
        (d) => (d['device_name'] as String).toLowerCase() == deviceName.toLowerCase(),
        orElse: () => {},
      );

      if (existing.isNotEmpty) {
        setState(() => _isManualSearching = false);
        final success = await _submitConnection(existing['url'] as String, sessionCode, isManual: true);
        if (!success) {
          _showToast('Incorrect Session Code', isError: true);
        }
        return;
      }

      // Re-scan LAN looking for the named device (case-insensitive)
      String? foundUrl;
      final interfaces = await NetworkInterface.list(includeLinkLocal: false, type: InternetAddressType.IPv4);
      String? localIp;
      for (var iface in interfaces) {
        for (var addr in iface.addresses) {
          if (!addr.isLoopback) { localIp = addr.address; break; }
        }
        if (localIp != null) break;
      }

      if (localIp != null) {
        final parts = localIp.split('.');
        if (parts.length == 4) {
          final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';
          final completer = Completer<void>();
          int remaining = 254;

          for (int i = 1; i <= 254; i++) {
            final ip = '$subnet.$i';
            final url = 'http://$ip:8000';
            http.get(Uri.parse('$url/api/connection/info')).timeout(const Duration(milliseconds: 1200)).then((res) {
              if (res.statusCode == 200) {
                final data = jsonDecode(res.body);
                if (data['status'] == 'success') {
                  final name = data['device_name']?.toString() ?? '';
                  if (name.toLowerCase() == deviceName.toLowerCase() && foundUrl == null) {
                    foundUrl = url;
                    if (!completer.isCompleted) completer.complete();
                  }
                }
              }
            }).catchError((_) {}).whenComplete(() {
              remaining--;
              if (remaining == 0 && !completer.isCompleted) completer.complete();
            });
          }

          // Wait at most 4 seconds
          await completer.future.timeout(const Duration(seconds: 4), onTimeout: () {});
        }
      }

      setState(() => _isManualSearching = false);

      if (foundUrl != null) {
        final success = await _submitConnection(foundUrl!, sessionCode, isManual: true);
        if (!success) {
          _showToast('Incorrect Session Code', isError: true);
        }
      } else {
        _showToast('Device "$deviceName" not found on this network', isError: true);
      }
    } catch (e) {
      setState(() => _isManualSearching = false);
      _showToast('Search failed: $e', isError: true);
    }
  }

  Future<void> _startQRScan() async {
    _triggerHaptic();
    final status = await Permission.camera.request();
    if (status.isGranted) {
      setState(() => _isScanning = true);
    } else {
      if (mounted) {
        _showToast('Camera permission required to scan QR code', isError: true);
      }
    }
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  void _handleQRScanResult(BarcodeCapture capture) async {
    final barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final barcodeValue = barcodes.first.rawValue;
      if (barcodeValue != null && barcodeValue.isNotEmpty) {
        setState(() => _isScanning = false);

        final uri = Uri.tryParse(barcodeValue.trim());
        if (uri != null) {
          final sid = uri.queryParameters['sid'] ?? '';
          final baseUrl = '${uri.scheme}://${uri.host}:${uri.port}';
          await _submitConnection(baseUrl, sid);
        } else {
          _showToast('Invalid QR Code format', isError: true);
        }
      }
    }
  }

  Future<bool> _submitConnection(String url, String sid, {bool isManual = false}) async {
    if (url.isEmpty) {
      _showToast('No server URL found', isError: true);
      return false;
    }

    setState(() => _isLoading = true);

    final success = await ConnectionService().connect(url, sid);

    setState(() => _isLoading = false);

    if (success) {
      if (mounted) {
        if (widget.isAddingDevice) {
          Navigator.of(context).pop(true);
          return true;
        }
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const MainNavigationScreen(),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              final scaleCurve = CurvedAnimation(parent: animation, curve: Curves.easeInOutCubic);
              final fadeCurve = CurvedAnimation(parent: animation, curve: Curves.easeInOut);
              return FadeTransition(
                opacity: Tween<double>(begin: 0.0, end: 1.0).animate(fadeCurve),
                child: ScaleTransition(
                  scale: Tween<double>(begin: 1.15, end: 1.0).animate(scaleCurve),
                  child: child,
                ),
              );
            },
            transitionDuration: const Duration(milliseconds: 700),
          ),
        );
      }
      return true;
    } else {
      if (!isManual) {
        _showToast('Failed to connect. Check device name / session code.', isError: true);
      }
      return false;
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    
    // Remove previous overlay if active
    _overlayEntry?.remove();
    _overlayEntry = null;

    final overlay = Overlay.of(context);
    _overlayEntry = OverlayEntry(
      builder: (ctx) {
        return _TopNotification(
          message: message,
          isError: isError,
          onDismiss: () {
            if (_overlayEntry != null) {
              _overlayEntry?.remove();
              _overlayEntry = null;
            }
          },
        );
      },
    );

    overlay.insert(_overlayEntry!);
  }

  @override
  Widget build(BuildContext context) {
    if (_isScanning) {
      return _buildQRScanner();
    }

    return ListenableBuilder(
      listenable: Listenable.merge([
        AppTheme.themeModeNotifier,
        AppTheme.accentColorNotifier,
      ]),
      builder: (context, _) {
        return Scaffold(
          body: Stack(
            children: [
              const AuroraBackground(),
              SafeArea(
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
                    child: Builder(
                      builder: (context) {
                        final double screenHeight = MediaQuery.of(context).size.height;
                        final double statusBarHeight = MediaQuery.of(context).padding.top;
                        final double bottomPadding = MediaQuery.of(context).padding.bottom;
                        
                        // Subtract a smaller offset so the card stretches all the way to the bottom
                        final double topOffsets = statusBarHeight + 16 + 148 + 20 + 48 + 20 + bottomPadding + 8 + 56;
                        final double dynamicCardHeight = screenHeight - topOffsets;
                        final double cardHeight = dynamicCardHeight < 280 ? 280 : dynamicCardHeight;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildHeader(),
                            const SizedBox(height: 24),
                            Center(
                              child: GlassSegmentedControl(
                                selectedIndex: _selectedTab,
                                onChanged: (index) {
                                  _triggerHaptic();
                                  setState(() {
                                    _slideForward = index > _selectedTab;
                                    _selectedTab = index;
                                  });
                                  if (index == 1) {
                                    Future.delayed(const Duration(milliseconds: 350), () {
                                      if (mounted && _selectedTab == 1) {
                                        _startDiscoveryTimer();
                                      }
                                    });
                                  } else {
                                    _stopDiscoveryTimer();
                                  }
                                },
                                segments: const [
                                  GlassSegment(label: 'QR Scan', icon: LucideIcons.scan_line),
                                  GlassSegment(label: 'Nearby', icon: LucideIcons.wifi),
                                  GlassSegment(label: 'Manual', icon: LucideIcons.keyboard),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 320),
                              reverseDuration: const Duration(milliseconds: 220),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              layoutBuilder: (Widget? currentChild, List<Widget> previousChildren) {
                                return Stack(
                                  children: <Widget>[
                                    ...previousChildren.map((child) => Positioned.fill(child: child)),
                                    if (currentChild != null) currentChild,
                                  ],
                                );
                              },
                              transitionBuilder: (Widget child, Animation<double> animation) {
                                final ValueKey<int>? key = child.key as ValueKey<int>?;
                                final isIncoming = key?.value == _selectedTab;
                                final slideOffset = _slideForward ? 0.35 : -0.35;
                                return SlideTransition(
                                  position: Tween<Offset>(
                                    begin: Offset(isIncoming ? slideOffset : -slideOffset, 0.0),
                                    end: Offset.zero,
                                  ).animate(animation),
                                  child: FadeTransition(
                                    opacity: animation,
                                    child: child,
                                  ),
                                );
                              },
                              child: KeyedSubtree(
                                key: ValueKey<int>(_selectedTab),
                                child: _selectedTab == 0
                                    ? _buildQRCard(cardHeight)
                                    : _selectedTab == 1
                                        ? _buildDiscoveredSection(cardHeight)
                                        : _buildManualSectionBody(cardHeight),
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],
                        );
                      }
                    ),
                  ),
                ),
              ),

              // Full-screen loading overlay
              if (_isLoading)
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withOpacity(0.5),
                    child: Center(
                      child: LiquidGlassCard(
                        isFlat: false,
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(color: AppTheme.accentColor, strokeWidth: 2.5),
                            const SizedBox(height: 16),
                            Text('Connecting…', style: TextStyle(color: context.textMain, fontSize: 15, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildQRScanner() {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        setState(() {
          _isScanning = false;
        });
      },
      child: Scaffold(
        body: Stack(
          children: [
            MobileScanner(onDetect: _handleQRScanResult),
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _scannerLineController,
                builder: (context, child) {
                  return Container(
                    decoration: ShapeDecoration(
                      shape: QrScannerOuterFrame(
                        borderColor: AppTheme.accentColor,
                        borderRadius: 24,
                        borderLength: 30,
                        borderWidth: 5,
                        cutOutSize: MediaQuery.of(context).size.width * 0.68,
                        scanLinePercent: _scannerLineController.value,
                      ),
                    ),
                  );
                },
              ),
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              right: 15,
              child: GestureDetector(
                onTap: () => setState(() => _isScanning = false),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 22),
                ),
              ),
            ),
            const Positioned(
              bottom: 100,
              left: 0,
              right: 0,
              child: Text(
                'Align the LANpad QR code inside the frame',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        const SizedBox(height: 10),
        const AppLogo(size: 64, animate: true),
        const SizedBox(height: 14),
        ShaderMask(
          shaderCallback: (bounds) => LinearGradient(
            colors: [context.accentColor, context.accentColor.withOpacity(0.7)],
          ).createShader(bounds),
          child: Text(
            'Pair with Laptop',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Connect your phone to a LANpad laptop in 3 ways',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 13, 
            color: context.textMuted, 
            height: 1.4,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildQRCard(double height) {
    return SizedBox(
      height: height,
      child: LiquidGlassCard(
        isFlat: false,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: context.accentColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(LucideIcons.scan_line, color: context.accentColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Scan QR Code',
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.bold, 
                            fontSize: 15.5, 
                            color: context.textMain,
                          ),
                        ),
                        Text(
                          'Fastest — instant pair',
                          style: GoogleFonts.inter(
                            fontSize: 12, 
                            color: context.textMuted,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Expanded(
                child: Center(
                  child: Icon(
                    LucideIcons.qr_code,
                    size: 88,
                    color: Colors.white24,
                  ),
                ),
              ),
              Text(
                'Open LANpad on your laptop → click the QR icon → scan with your phone camera.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12, 
                  color: context.textMuted, 
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              AnimatedButton(
                onTap: _startQRScan,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [context.accentColor, context.accentColor.withOpacity(0.75)]),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: context.accentColor.withOpacity(0.35), blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.camera, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'OPEN CAMERA', 
                      style: GoogleFonts.inter(
                        color: Colors.white, 
                        fontWeight: FontWeight.bold, 
                        fontSize: 13, 
                        letterSpacing: 0.8,
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

  Widget _buildDiscoveredSection(double height) {
    return SizedBox(
      height: height,
      child: LiquidGlassCard(
        isFlat: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text('NEARBY LAPTOPS', style: TextStyle(color: context.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
                        const SizedBox(width: 8),
                        if (_isDiscovering)
                          SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.accentColor)),
                      ],
                    ),
                    GestureDetector(
                      onTap: _isDiscovering ? null : _discoverLocalDevices,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.accentColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _isDiscovering ? 'SCANNING' : 'RESCAN',
                          style: TextStyle(
                            color: AppTheme.accentColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _isDiscovering && _discoveredDevices.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentColor)),
                            const SizedBox(height: 12),
                            Text('Scanning Wi-Fi network…', style: TextStyle(color: context.textMuted, fontSize: 12)),
                          ],
                        ),
                      )
                    : _discoveredDevices.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.wifi_off, size: 36, color: context.textMuted.withOpacity(0.4)),
                                const SizedBox(height: 8),
                                Text('No laptops found on this Wi-Fi', style: TextStyle(color: context.textMuted, fontSize: 12), textAlign: TextAlign.center),
                                const SizedBox(height: 8),
                                GestureDetector(
                                  onTap: _discoverLocalDevices,
                                  child: Text('Tap to scan again', style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            itemCount: _discoveredDevices.length,
                            itemBuilder: (context, index) {
                              return _buildDeviceCard(_discoveredDevices[index]);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeviceCard(Map<String, dynamic> device) {
    final name = device['device_name'] as String;
    final url = device['url'] as String;
    final ip = device['ip'] as String;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GestureDetector(
        onTap: () {
          _triggerHaptic();
          _showCodeDialog(name, url);
        },
        child: LiquidGlassCard(
          isFlat: true,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF00F59B).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.laptop, color: Color(0xFF00F59B), size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(color: context.textMain, fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Outfit')),
                    const SizedBox(height: 2),
                    Text(ip, style: TextStyle(color: context.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [AppTheme.accentColor.withOpacity(0.9), AppTheme.accentColor.withOpacity(0.6)]),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Connect', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCodeDialog(String deviceName, String url) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.4),
      builder: (ctx) {
        final codeCtrl = TextEditingController();
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: LiquidGlassCard(
              isFlat: false,
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.accentColor.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(LucideIcons.shield_check, color: AppTheme.accentColor, size: 28),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Enter Session Code',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontWeight: FontWeight.bold,
                      color: ctx.textMain,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Enter the 6-digit code shown next to "$deviceName" on your laptop.',
                    style: TextStyle(color: ctx.textMuted, fontSize: 13, height: 1.4),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: codeCtrl,
                    autofocus: true,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: ctx.textMain,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 8,
                      fontFamily: 'Outfit',
                    ),
                    keyboardType: TextInputType.text,
                    maxLength: 6,
                    decoration: InputDecoration(
                      hintText: '••••••',
                      hintStyle: TextStyle(color: ctx.textMuted.withOpacity(0.3), letterSpacing: 8),
                      counterText: '',
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: ctx.borderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: ctx.borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: AppTheme.accentColor, width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.of(ctx).pop(),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            decoration: BoxDecoration(
                              color: ctx.textMuted.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: ctx.borderColor),
                            ),
                            child: Text(
                              'Cancel',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: ctx.textMuted, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            final code = codeCtrl.text.trim();
                            Navigator.of(ctx).pop();
                            _submitConnection(url, code);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppTheme.accentColor.withOpacity(0.9),
                                  AppTheme.accentColor.withOpacity(0.6),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Pair',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildManualSectionBody(double height) {
    return SizedBox(
      height: height,
      child: LiquidGlassCard(
        isFlat: false,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(LucideIcons.keyboard, color: AppTheme.accentColor, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Enter Device Name & Code',
                    style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 15, color: context.textMain),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Open LANpad on your laptop and enter the connection details.',
                style: TextStyle(fontSize: 12, color: context.textMuted, height: 1.4),
              ),
              const SizedBox(height: 16),

              _buildInputField(
                controller: _deviceNameController,
                label: 'Device Name',
                hint: 'e.g. WarmTurtle',
                icon: LucideIcons.laptop,
              ),
              const SizedBox(height: 12),
              _buildInputField(
                controller: _sessionCodeController,
                label: 'Session Code',
                hint: '6-digit code from laptop',
                icon: LucideIcons.key_round,
                keyboardType: TextInputType.text,
              ),
              const Spacer(),

              AnimatedButton(
                onTap: (_isManualSearching || _isLoading) ? () {} : _connectManually,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [AppTheme.accentColor.withOpacity(0.9), AppTheme.accentColor.withOpacity(0.6)]),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: _isManualSearching
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.search, color: Colors.white, size: 16),
                          SizedBox(width: 8),
                          Text('FIND & CONNECT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      style: TextStyle(color: context.textMain, fontSize: 14),
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: context.textMuted, fontSize: 13),
        hintText: hint,
        hintStyle: TextStyle(color: context.textMuted.withOpacity(0.35), fontSize: 13),
        prefixIcon: Icon(icon, color: AppTheme.accentColor, size: 18),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: context.borderColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: context.borderColor)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppTheme.accentColor, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      ),
    );
  }
}

// Custom painter for QR scanner frame
class QrScannerOuterFrame extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;
  final double scanLinePercent;

  const QrScannerOuterFrame({
    this.borderColor = Colors.white,
    this.borderWidth = 1.0,
    this.borderRadius = 0,
    this.borderLength = 40,
    required this.cutOutSize,
    this.scanLinePercent = 0.0,
  });

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => Path();

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    final cutOutRect = Rect.fromCenter(center: rect.center, width: cutOutSize, height: cutOutSize);
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(rect)
      ..addRRect(RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius)));
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final cutOutRect = Rect.fromCenter(center: rect.center, width: cutOutSize, height: cutOutSize);
    final backgroundPaint = Paint()..color = Colors.black.withOpacity(0.65);
    final clearPaint = Paint()..blendMode = BlendMode.clear;

    // Draw dark background overlay with transparent bento box
    canvas.saveLayer(rect, Paint());
    canvas.drawRect(rect, backgroundPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius)), clearPaint);
    canvas.restore();

    // 1. Draw glowing sweeping laser line
    final laserY = cutOutRect.top + (cutOutRect.height * scanLinePercent);
    final laserPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          borderColor.withOpacity(0.01),
          borderColor.withOpacity(0.7),
          borderColor.withOpacity(0.01),
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(Rect.fromLTRB(cutOutRect.left, laserY - 8, cutOutRect.right, laserY + 8));

    // Glow bar
    canvas.drawRect(Rect.fromLTRB(cutOutRect.left + 4, laserY - 3, cutOutRect.right - 4, laserY + 3), laserPaint);
    // Core solid light line
    canvas.drawLine(
      Offset(cutOutRect.left + 8, laserY),
      Offset(cutOutRect.right - 8, laserY),
      Paint()
        ..color = Colors.white.withOpacity(0.9)
        ..strokeWidth = 1.2,
    );

    // 2. Draw thick outer corner brackets (clean and simple)
    final borderPaint = Paint()
      ..color = borderColor
      ..strokeWidth = borderWidth
      ..style = PaintingStyle.stroke;

    final r = borderRadius;
    final bl = borderLength;

    void drawCorner(Offset corner, double dx, double dy) {
      canvas.drawLine(Offset(corner.dx + dx * r, corner.dy), Offset(corner.dx + dx * bl, corner.dy), borderPaint);
      canvas.drawLine(Offset(corner.dx, corner.dy + dy * r), Offset(corner.dx, corner.dy + dy * bl), borderPaint);
      canvas.drawArc(
        Rect.fromLTWH(corner.dx + (dx > 0 ? 0 : -r * 2), corner.dy + (dy > 0 ? 0 : -r * 2), r * 2, r * 2),
        dx > 0 ? (dy > 0 ? 3.14 : 1.57) : (dy > 0 ? -1.57 : 0),
        1.57 * (dx > 0 ? 1 : -1) * (dy > 0 ? 1 : -1),
        false,
        borderPaint,
      );
    }

    drawCorner(cutOutRect.topLeft, 1, 1);
    drawCorner(cutOutRect.topRight, -1, 1);
    drawCorner(cutOutRect.bottomLeft, 1, -1);
    drawCorner(cutOutRect.bottomRight, -1, -1);
  }

  @override
  ShapeBorder scale(double t) => this;
}

class _TopNotification extends StatefulWidget {
  final String message;
  final bool isError;
  final VoidCallback onDismiss;

  const _TopNotification({
    required this.message,
    required this.isError,
    required this.onDismiss,
  });

  @override
  State<_TopNotification> createState() => _TopNotificationState();
}

class _TopNotificationState extends State<_TopNotification> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));

    _controller.forward();

    _dismissTimer = Timer(const Duration(milliseconds: 2800), () {
      if (mounted) {
        _controller.reverse().then((_) {
          widget.onDismiss();
        });
      }
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color bgColor = widget.isError 
        ? const Color(0xFFE53935) // High contrast vibrant crimson red
        : const Color(0xFF00E676); // High contrast vibrant glowing green
        
    final IconData icon = widget.isError ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.only(top: 12, left: 16, right: 16),
          child: SlideTransition(
            position: _offsetAnimation,
            child: Material(
              color: Colors.transparent,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                  border: Border.all(
                    color: Colors.white.withOpacity(0.25),
                    width: 1.0,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, color: Colors.white, size: 18),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        widget.message,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
