import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../../../config/theme.dart';

class LicensesView extends StatefulWidget {
  final DesktopState state;
  const LicensesView({super.key, required this.state});

  @override
  State<LicensesView> createState() => _LicensesViewState();
}

class _LicensesViewState extends State<LicensesView> {
  final TextEditingController _keyController = TextEditingController();
  bool _loading = true;
  String _tier = 'FREE';
  String _key = '';
  String _expiresAt = '';
  int _daysLeft = 0;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadLicenseStatus();
  }

  Future<void> _loadLicenseStatus() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final res = await widget.state.apiService.fetchLicenseStatus();
    if (res['status'] == 'success' && mounted) {
      setState(() {
        _tier = res['tier'] ?? 'FREE';
        _key = res['key'] ?? '';
        _expiresAt = res['expires_at'] ?? '';
        _daysLeft = res['days_left'] ?? 0;
        _loading = false;
      });
    } else {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _activateKey() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() => _errorMessage = 'Please enter a key');
      return;
    }
    setState(() {
      _loading = true;
      _errorMessage = '';
    });
    final res = await widget.state.apiService.activateLicenseKey(key);
    if (res['status'] == 'success') {
      widget.state.onShowToast('License activated successfully! Tier: ${res['tier']}');
      _loadLicenseStatus();
    } else {
      setState(() {
        _errorMessage = res['message'] ?? 'Activation failed';
        _loading = false;
      });
      widget.state.onShowToast('Activation failed: $_errorMessage', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        // Top Bar Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
          ),
          child: Row(
            children: [
              Text('App Activation', style: GoogleFonts.outfit(
                fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(40),
            child: Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 500),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: kSurfaceContainer,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: kOutlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.key, color: kPrimary, size: 28),
                        const SizedBox(width: 12),
                        Text(
                          'LANpad Activation',
                          style: GoogleFonts.outfit(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: kOnSurface,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Direct local connection and secure device communication.',
                      style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
                    ),
                    const SizedBox(height: 32),
                    
                    // Status Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _tier != 'FREE' && _tier != 'BASIC'
                            ? Colors.green.withOpacity(0.08)
                            : kSurfaceLow,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _tier != 'FREE' && _tier != 'BASIC'
                              ? Colors.green.withOpacity(0.3)
                              : kOutlineVariant,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LICENSE STATE',
                            style: GoogleFonts.inter(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: kOnSurfaceVariant,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _tier == 'FREE' ? 'Unlicensed (Free Tier)' : 'Active (Tier: $_tier)',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: _tier != 'FREE' && _tier != 'BASIC' ? Colors.green : kOnSurface,
                            ),
                          ),
                          if (_expiresAt.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Text(
                              'Expires: $_expiresAt ($_daysLeft days remaining)',
                              style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Key Input
                    Text(
                      'ACTIVATION KEY',
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: kOnSurfaceVariant,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _keyController,
                      style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                      decoration: InputDecoration(
                        hintText: 'Enter activation key (AAAA-BBBB-CCCC-DDDD)',
                        hintStyle: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant.withOpacity(0.6)),
                        filled: true,
                        fillColor: kSurfaceLow,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: kOutlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: kPrimary),
                        ),
                      ),
                    ),
                    if (_errorMessage.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        _errorMessage,
                        style: GoogleFonts.inter(fontSize: 12, color: kError, fontWeight: FontWeight.w600),
                      ),
                    ],
                    const SizedBox(height: 28),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kPrimary,
                          foregroundColor: kSurfaceLowest,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _activateKey,
                        child: Text(
                          'Activate License',
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
