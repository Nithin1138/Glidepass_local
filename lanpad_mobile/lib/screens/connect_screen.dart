import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/connection_service.dart';
import '../widgets/aurora_background.dart';
import '../widgets/liquid_glass_card.dart';
import '../widgets/animated_button.dart';
import '../widgets/app_logo.dart';
import '../config/theme.dart';
import 'main_navigation_screen.dart';

class ConnectScreen extends StatefulWidget {
  final bool isAddingDevice;
  const ConnectScreen({super.key, this.isAddingDevice = false});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  final _sidController = TextEditingController();
  bool _isScanning = false;
  bool _isLoading = false;
  int _connectionTab = 0; // 0 for Scan QR, 1 for Manual Entry

  Future<void> _startQRScan() async {
    _triggerHaptic();
    final status = await Permission.camera.request();
    if (status.isGranted) {
      setState(() {
        _isScanning = true;
      });
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Camera permission required to scan pairing QR code',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            backgroundColor: AppTheme.redStatus,
            behavior: SnackBarBehavior.floating,
          ),
        );
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
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final barcodeValue = barcodes.first.rawValue;
      if (barcodeValue != null && barcodeValue.isNotEmpty) {
        setState(() {
          _isScanning = false;
        });
        
        // Parse pairing URL: e.g. http://192.168.0.106:8000?sid=SESSION_TOKEN
        final uri = Uri.tryParse(barcodeValue.trim());
        if (uri != null) {
          final sid = uri.queryParameters['sid'] ?? '';
          final baseUrl = '${uri.scheme}://${uri.host}:${uri.port}';
          
          _urlController.text = baseUrl;
          _sidController.text = sid;
          
          await _submitConnection(baseUrl, sid);
        } else {
          _showToast('Invalid QR Code format', isError: true);
        }
      }
    }
  }

  Future<void> _submitConnection(String url, String sid) async {
    if (url.isEmpty) {
      _showToast('Please enter a server URL', isError: true);
      return;
    }
    
    setState(() {
      _isLoading = true;
    });

    final success = await ConnectionService().connect(url, sid);
    
    setState(() {
      _isLoading = false;
    });

    if (success) {
      if (mounted) {
        if (widget.isAddingDevice) {
          Navigator.of(context).pop(true);
          return;
        }
        // Custom Zoom reveal transition to Home Shell
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
    } else {
      _showToast('Failed to connect. Check URL/Network.', isError: true);
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _urlController.dispose();
    _sidController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    
    if (_isScanning) {
      return Scaffold(
        body: Stack(
          children: [
            MobileScanner(
              onDetect: _handleQRScanResult,
            ),
            // Scanner Overlay Mask
            Positioned.fill(
              child: Container(
                decoration: ShapeDecoration(
                  shape: QrScannerOuterFrame(
                    borderColor: AppTheme.accentColor,
                    borderRadius: 24,
                    borderLength: 30,
                    borderWidth: 6,
                    cutOutSize: MediaQuery.of(context).size.width * 0.7,
                  ),
                ),
              ),
            ),
            // Header / Close button
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              left: 15,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
                onPressed: () => setState(() => _isScanning = false),
              ),
            ),
            const Positioned(
              bottom: 80,
              left: 0,
              right: 0,
              child: Text(
                'Align pairing QR code inside the box',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          const AuroraBackground(),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 30),
                    
                    // Logo Header
                    Center(
                      child: Column(
                        children: [
                          const AppLogo(size: 80, animate: true),
                          const SizedBox(height: 12),
                          Text(
                            'LANPAD',
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 4.0,
                              color: AppTheme.textMain,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    
                    Text(
                      'Pair with Laptop',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textMain,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Scan the pairing QR code or enter credentials.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.textMuted,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Tab bar selector
                    Container(
                      height: 46,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                _triggerHaptic();
                                setState(() => _connectionTab = 0);
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: _connectionTab == 0
                                      ? AppTheme.accentColor
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'SCAN QR CODE',
                                    style: TextStyle(
                                      color: _connectionTab == 0 ? Colors.white : AppTheme.textMuted,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                _triggerHaptic();
                                setState(() => _connectionTab = 1);
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: _connectionTab == 1
                                      ? AppTheme.accentColor
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: Text(
                                    'MANUAL ENTRY',
                                    style: TextStyle(
                                      color: _connectionTab == 1 ? Colors.white : AppTheme.textMuted,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    if (_connectionTab == 0) ...[
                      // Scan QR Code layout
                      LiquidGlassCard(
                        isFlat: false,
                        child: Column(
                          children: [
                            const SizedBox(height: 12),
                            Icon(LucideIcons.scan_line, size: 48, color: AppTheme.accentColor),
                            const SizedBox(height: 16),
                            Text(
                              'Quick Pair Scanner',
                              style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMain),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Open LANpad on your computer, click the pairing QR code, and align it inside the mobile camera view.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.4),
                            ),
                            const SizedBox(height: 24),
                            AnimatedButton(
                              onTap: _startQRScan,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [AppTheme.accentColor, AppTheme.accentColor.withOpacity(0.8)],
                                ),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.accentColor.withOpacity(0.3),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.camera, color: Colors.white, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'OPEN CAMERA SCANNER',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                        ),
                      ),
                    ] else ...[
                      // Manual entry layout
                      LiquidGlassCard(
                        isFlat: false,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _urlController,
                              style: TextStyle(color: AppTheme.textMain, fontSize: 14),
                              decoration: InputDecoration(
                                labelText: 'Laptop Address / URL',
                                labelStyle: TextStyle(color: AppTheme.textMuted),
                                hintText: 'e.g. 192.168.0.106:8000',
                                hintStyle: TextStyle(color: AppTheme.textMuted.withOpacity(0.4)),
                                prefixIcon: Icon(LucideIcons.laptop, color: AppTheme.accentColor, size: 20),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.borderColor),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.borderColor),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.accentColor, width: 1.5),
                                ),
                              ),
                              validator: (val) => val == null || val.isEmpty ? 'URL required' : null,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _sidController,
                              style: TextStyle(color: AppTheme.textMain, fontSize: 14),
                              decoration: InputDecoration(
                                labelText: 'Session Token (sid)',
                                labelStyle: TextStyle(color: AppTheme.textMuted),
                                prefixIcon: Icon(LucideIcons.key, color: AppTheme.accentColor, size: 20),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.borderColor),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.borderColor),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(color: AppTheme.accentColor, width: 1.5),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      AnimatedButton(
                        onTap: _isLoading
                            ? () {}
                            : () {
                                _triggerHaptic();
                                if (_formKey.currentState!.validate()) {
                                  _submitConnection(_urlController.text, _sidController.text);
                                }
                              },
                        decoration: BoxDecoration(
                          color: AppTheme.cardBg,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.borderColor),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                'CONNECT MANUALLY',
                                style: TextStyle(
                                  color: AppTheme.textMain,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  letterSpacing: 0.5,
                                ),
                              ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Custom painter for camera scanner borders
class QrScannerOuterFrame extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  const QrScannerOuterFrame({
    this.borderColor = Colors.white,
    this.borderWidth = 1.0,
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => Path();

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return Path()..addRect(rect);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final height = rect.height;
    final boxWidth = cutOutSize;
    final boxHeight = cutOutSize;
    final left = (width - boxWidth) / 2;
    final top = (height - boxHeight) / 2;

    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    // Draw mask around focus area
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(rect),
        Path()..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(left, top, boxWidth, boxHeight), Radius.circular(borderRadius))),
      ),
      paint,
    );

    // Draw borders
    final borderPaint = Paint()
      ..color = borderColor
      ..strokeWidth = borderWidth
      ..style = PaintingStyle.stroke;

    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(left, top, boxWidth, boxHeight), Radius.circular(borderRadius)),
      borderPaint,
    );
  }

  @override
  ShapeBorder scale(double t) => this;
}
