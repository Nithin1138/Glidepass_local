import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/connection_service.dart';
import '../widgets/nebula_background.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  final _sidController = TextEditingController();
  bool _isScanning = false;
  bool _isLoading = false;

  Future<void> _startQRScan() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      setState(() {
        _isScanning = true;
      });
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Camera permission required to scan pairing QR code'),
            backgroundColor: AppTheme.redStatus,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
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
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } else {
      _showToast('Failed to connect. Check URL/Network.', isError: true);
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
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
          const NebulaBackground(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 40),
                    // Logo Stack
                    Center(
                      child: Column(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: AppTheme.cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.borderColor),
                            ),
                            child: const Center(
                              child: Icon(Icons.bolt, size: 30, color: AppTheme.accentColor),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'LANPAD',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 4.0,
                              color: AppTheme.textMain,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                    const Text(
                      'Connect to Laptop',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Scan the QR code displayed on the LANpad desktop app, or enter pairing details manually.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.textMuted,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 32),
                    // QR Scan Trigger Button
                    AnimatedButton(
                      onTap: _startQRScan,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.accentColor, Color(0xFF009BF5)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.qr_code_scanner, color: Colors.white),
                          SizedBox(width: 10),
                          Text(
                            'SCAN PAIRING QR CODE',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Row(
                      children: [
                        Expanded(child: Divider(color: AppTheme.borderColor)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16.0),
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          child: Text('OR MANUAL ENTRY'),
                        ),
                        Expanded(child: Divider(color: AppTheme.borderColor)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    // Manual entry fields
                    GlassmorphicCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: _urlController,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: InputDecoration(
                              labelText: 'Laptop Address / URL',
                              labelStyle: const TextStyle(color: AppTheme.textMuted),
                              hintText: 'e.g. 192.168.0.106:8000',
                              hintStyle: const TextStyle(color: Colors.white24),
                              prefixIcon: const Icon(Icons.laptop, color: AppTheme.textMuted),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                            ),
                            validator: (val) => val == null || val.isEmpty ? 'URL required' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _sidController,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: InputDecoration(
                              labelText: 'Session Token (sid)',
                              labelStyle: const TextStyle(color: AppTheme.textMuted),
                              prefixIcon: const Icon(Icons.key, color: AppTheme.textMuted),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Connect manual button
                    AnimatedButton(
                      onTap: _isLoading
                          ? () {}
                          : () {
                              if (_formKey.currentState!.validate()) {
                                _submitConnection(_urlController.text, _sidController.text);
                              }
                            },
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'CONNECT MANUALLY',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                    ),
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
