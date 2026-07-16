import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';
import '../../../config/theme.dart';
import '../../../services/admin_service.dart';

class ActivationView extends StatefulWidget {
  final DesktopState state;
  final VoidCallback onClose;

  const ActivationView({
    super.key,
    required this.state,
    required this.onClose,
  });

  @override
  State<ActivationView> createState() => _ActivationViewState();
}

class _ActivationViewState extends State<ActivationView> {
  final TextEditingController _keyController = TextEditingController();
  bool _isLoading = false;
  String? _errorText;

  Future<void> _activate() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() => _errorText = 'Valid activation required to use LANpad');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    final result = await widget.state.apiService.activateLicenseKey(key);
    
    if (mounted) {
      setState(() => _isLoading = false);
      if (result['status'] == 'success') {
        widget.state.onShowToast('LANpad Activated Successfully!');
        // Trigger a refresh of the admin status
        AdminService().refresh(force: true);
      } else {
        setState(() => _errorText = result['message'] ?? 'Activation failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black87,
      alignment: Alignment.center,
      child: Container(
        width: 400,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: kSurfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kOutlineVariant, width: 1),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () {
                      setState(() {
                        _errorText = 'License is required to continue.';
                      });
                    },
                    icon: const Icon(Icons.close, size: 20),
                    color: kOnSurfaceVariant,
                    splashRadius: 20,
                  ),
                ),
                // Pseudo-logo (You can replace this with an Image if you have an asset)
                Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: kSurfaceVariant,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Text('🚀', style: TextStyle(fontSize: 32)),
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  'LANpad Activation',
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: kOnSurface,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Direct local connection and\nsecure device communication.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: kOnSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'ACTIVATION KEY',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                      color: kOnSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _keyController,
                  style: GoogleFonts.inter(fontSize: 14, color: kOnSurface),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: kSurfaceLow,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: kOutlineVariant),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: kOutlineVariant),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: kPrimary),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
                if (_errorText != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _errorText!,
                    style: GoogleFonts.inter(fontSize: 12, color: kError),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _activate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kPrimary,
                      foregroundColor: kSurfaceLowest,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'ACTIVATE LANPAD',
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: TextButton(
                    onPressed: () async {
                      final uri = Uri.parse('https://lanpad.app/pricing');
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      } else {
                        widget.state.onShowToast('Could not open pricing page.');
                      }
                    },
                    style: TextButton.styleFrom(
                      backgroundColor: kSurfaceVariant,
                      foregroundColor: kOnSurface,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      'Get Activation Key',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
