import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../../../config/theme.dart';
import '../../../services/admin_service.dart';

class LicensesView extends StatefulWidget {
  final DesktopState state;
  const LicensesView({super.key, required this.state});

  @override
  State<LicensesView> createState() => _LicensesViewState();
}

class _LicensesViewState extends State<LicensesView> {
  final TextEditingController _keyController = TextEditingController();
  bool _activating = false;
  bool _loadingLicense = true;
  String _tier = 'FREE';
  String _key = '';
  String _expiresAt = '';
  int _daysLeft = 0;
  String _errorMessage = '';
  bool _refreshing = false;

  final AdminService _admin = AdminService();

  @override
  void initState() {
    super.initState();
    _loadLicenseStatus();
  }

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  Future<void> _loadLicenseStatus() async {
    if (!mounted) return;
    setState(() => _loadingLicense = true);
    final res = await widget.state.apiService.fetchLicenseStatus();
    if (res['status'] == 'success' && mounted) {
      setState(() {
        _tier = (res['tier'] ?? 'FREE').toString().toUpperCase();
        _key = res['key'] ?? '';
        _expiresAt = res['expires_at'] ?? '';
        _daysLeft = res['days_left'] ?? 0;
        _loadingLicense = false;
      });
    } else {
      if (mounted) setState(() => _loadingLicense = false);
    }
  }

  Future<void> _activateKey() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() => _errorMessage = 'Please enter an activation key');
      return;
    }
    setState(() { _activating = true; _errorMessage = ''; });
    final res = await widget.state.apiService.activateLicenseKey(key);
    if (res['status'] == 'success') {
      _admin.logEvent('activated:${res['tier']}');
      widget.state.onShowToast('License activated! Tier: ${res['tier']}');
      _keyController.clear();
      await _loadLicenseStatus();
      await _admin.refresh();
    } else {
      setState(() {
        _errorMessage = res['message'] ?? 'Activation failed';
        _activating = false;
      });
      widget.state.onShowToast('Activation failed: $_errorMessage', isError: true);
    }
    if (mounted) setState(() => _activating = false);
  }

  Future<void> _handleRefresh() async {
    setState(() => _refreshing = true);
    await Future.wait([_loadLicenseStatus(), _admin.refresh()]);
    if (mounted) setState(() => _refreshing = false);
  }

  Color _tierColor(String t) {
    switch (t) {
      case 'DEVELOPER': return const Color(0xFF00E5FF);
      case 'PRO': return const Color(0xFFFFB300);
      case 'BASIC': return const Color(0xFF66BB6A);
      default: return kOnSurfaceVariant;
    }
  }

  IconData _tierIcon(String t) {
    switch (t) {
      case 'DEVELOPER': return LucideIcons.code;
      case 'PRO': return LucideIcons.crown;
      case 'BASIC': return LucideIcons.star;
      default: return LucideIcons.user;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Header bar ──────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
          ),
          child: Row(
            children: [
              Icon(LucideIcons.shield_check, size: 18, color: kPrimary),
              const SizedBox(width: 10),
              Text('App Activation', style: GoogleFonts.outfit(
                fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
              const Spacer(),
              Tooltip(
                message: 'Refresh status',
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: _handleRefresh,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: _refreshing
                        ? const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(LucideIcons.refresh_cw, size: 16, color: kOnSurfaceVariant),
                  ),
                ),
              ),
            ],
          ),
        ),

        // ── Body ────────────────────────────────────────────────────
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ValueListenableBuilder<AdminStatus>(
              valueListenable: _admin.status,
              builder: (ctx, adminStatus, _) {
                return ValueListenableBuilder<UpdateInfo?>(
                  valueListenable: _admin.updateInfo,
                  builder: (ctx, updateInfo, _) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Update Banner ──────────────────────────
                        if (updateInfo != null && updateInfo.updateAvailable)
                          _UpdateBanner(update: updateInfo),

                        const SizedBox(height: 0),

                        // ── Two-column grid ───────────────────────
                        LayoutBuilder(builder: (ctx, constraints) {
                          final wide = constraints.maxWidth > 760;
                          return wide
                              ? Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: _leftColumn(adminStatus)),
                                    const SizedBox(width: 24),
                                    Expanded(child: _rightColumn(adminStatus)),
                                  ],
                                )
                              : Column(children: [
                                  _leftColumn(adminStatus),
                                  const SizedBox(height: 24),
                                  _rightColumn(adminStatus),
                                ]);
                        }),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _leftColumn(AdminStatus adminStatus) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // License status card
        _SectionCard(
          title: 'License Status',
          icon: LucideIcons.key,
          child: _loadingLicense
              ? const Center(child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator()))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _tierColor(_tier).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _tierColor(_tier).withOpacity(0.4)),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(_tierIcon(_tier), size: 12, color: _tierColor(_tier)),
                          const SizedBox(width: 6),
                          Text(_tier, style: GoogleFonts.inter(
                            fontSize: 11, fontWeight: FontWeight.bold,
                            color: _tierColor(_tier), letterSpacing: 0.8)),
                        ]),
                      ),
                      const SizedBox(width: 12),
                      if (adminStatus.monetizationEnabled)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF7C3AED).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF7C3AED).withOpacity(0.35)),
                          ),
                          child: Text('Monetization ON', style: GoogleFonts.inter(
                            fontSize: 10, color: const Color(0xFF7C3AED),
                            fontWeight: FontWeight.w600)),
                        ),
                    ]),
                    const SizedBox(height: 16),
                    if (_key.isNotEmpty) ...[
                      _InfoRow(label: 'Key', value: _key, copyable: true),
                      const SizedBox(height: 8),
                    ],
                    if (_expiresAt.isNotEmpty) ...[
                      _InfoRow(
                        label: 'Expires',
                        value: '$_expiresAt ($_daysLeft days left)',
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (adminStatus.version.isNotEmpty)
                      _InfoRow(label: 'App Version', value: adminStatus.version),
                  ],
                ),
        ),
        const SizedBox(height: 20),

        // Activate card
        _SectionCard(
          title: 'Activate a Key',
          icon: LucideIcons.shield_check,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _keyController,
                style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                decoration: InputDecoration(
                  hintText: 'AAAA-BBBB-CCCC-DDDD',
                  hintStyle: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant.withOpacity(0.5)),
                  filled: true,
                  fillColor: kSurfaceLow,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: kOutlineVariant),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: kPrimary, width: 1.5),
                  ),
                ),
                onSubmitted: (_) => _activateKey(),
              ),
              if (_errorMessage.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(children: [
                  Icon(LucideIcons.circle_alert, size: 13, color: kError),
                  const SizedBox(width: 6),
                  Expanded(child: Text(_errorMessage, style: GoogleFonts.inter(
                    fontSize: 12, color: kError, fontWeight: FontWeight.w500))),
                ]),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  onPressed: _activating ? null : _activateKey,
                  child: _activating
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                      : Text('Activate License', style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _rightColumn(AdminStatus adminStatus) {
    // Feature limit list
    final featureRows = const {
      'allow_file_share': ('File Sharing', LucideIcons.folder_open),
      'allow_live_sync': ('Live Sync', LucideIcons.zap),
      'allow_typing': ('Typing Mode', LucideIcons.keyboard),
      'allow_typing_mode': ('Coding Typing', LucideIcons.code),
      'allow_inject': ('Inject Mode', LucideIcons.activity),
      'allow_raw': ('Flash Mode', LucideIcons.flame),
      'allow_select_copy': ('Select Copy', LucideIcons.copy),
      'allow_fetch': ('Fetch Clipboard', LucideIcons.clipboard),
      'allow_resource_access': ('Resource Hub', LucideIcons.book_open),
      'allow_tunnel': ('Tunnel / Remote', LucideIcons.network),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionCard(
          title: 'Feature Limits',
          icon: LucideIcons.list,
          child: adminStatus.isLoaded
              ? Column(
                  children: featureRows.entries.map((e) {
                    final key = e.key;
                    final (name, icon) = e.value;
                    final val = adminStatus.featureLimits[key];
                    final label = adminStatus.limitLabel(key);
                    final isDisabled = val == -1;
                    final isUnlimited = val == 0;
                    return _FeatureLimitRow(
                      icon: icon,
                      name: name,
                      label: label,
                      isDisabled: isDisabled,
                      isUnlimited: isUnlimited,
                    );
                  }).toList(),
                )
              : Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Column(children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 12),
                      Text('Fetching limits from cloud…',
                          style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                    ]),
                  ),
                ),
        ),
        const SizedBox(height: 20),

        // Monetization info card
        _SectionCard(
          title: 'Monetization',
          icon: LucideIcons.dollar_sign,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Container(
                  width: 8, height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: adminStatus.monetizationEnabled
                        ? const Color(0xFF10B981)
                        : kOnSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  adminStatus.monetizationEnabled
                      ? 'Monetization is ENABLED by admin'
                      : 'Monetization is DISABLED — all features unlocked',
                  style: GoogleFonts.inter(
                    fontSize: 13, color: kOnSurface, fontWeight: FontWeight.w500),
                ),
              ]),
              const SizedBox(height: 12),
              Text(
                adminStatus.monetizationEnabled
                    ? 'Feature limits are enforced based on your current license tier. Upgrade to unlock higher quotas.'
                    : 'The admin has disabled monetization. No feature limits are currently enforced for any tier.',
                style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant, height: 1.5),
              ),
              if (adminStatus.isFreeTier && adminStatus.monetizationEnabled) ...[
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  icon: const Icon(LucideIcons.external_link, size: 14),
                  label: Text('Get a Pro License', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: kPrimary,
                    side: BorderSide(color: kPrimary.withOpacity(0.4)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => launchUrl(Uri.parse('https://lanpad.app/pricing')),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ── Helper Widgets ─────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  const _SectionCard({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 0),
            child: Row(children: [
              Icon(icon, size: 15, color: kPrimary),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.inter(
                fontSize: 11, fontWeight: FontWeight.bold,
                color: kOnSurfaceVariant, letterSpacing: 0.8)),
            ]),
          ),
          const SizedBox(height: 14),
          Divider(color: kOutlineVariant, height: 1),
          Padding(
            padding: const EdgeInsets.all(18),
            child: child,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool copyable;
  const _InfoRow({required this.label, required this.value, this.copyable = false});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      SizedBox(
        width: 90,
        child: Text(label, style: GoogleFonts.inter(
          fontSize: 12, color: kOnSurfaceVariant)),
      ),
      Expanded(child: Text(value, style: GoogleFonts.inter(
        fontSize: 12, color: kOnSurface, fontWeight: FontWeight.w500))),
      if (copyable)
        InkWell(
          borderRadius: BorderRadius.circular(4),
          onTap: () => Clipboard.setData(ClipboardData(text: value)),
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Icon(LucideIcons.copy, size: 13, color: kOnSurfaceVariant),
          ),
        ),
    ]);
  }
}

class _FeatureLimitRow extends StatelessWidget {
  final IconData icon;
  final String name;
  final String label;
  final bool isDisabled;
  final bool isUnlimited;
  const _FeatureLimitRow({
    required this.icon,
    required this.name,
    required this.label,
    required this.isDisabled,
    required this.isUnlimited,
  });

  @override
  Widget build(BuildContext context) {
    final labelColor = isDisabled
        ? kError
        : isUnlimited
            ? const Color(0xFF10B981)
            : kOnSurface;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Icon(icon, size: 14, color: isDisabled ? kError.withOpacity(0.6) : kOnSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(child: Text(name, style: GoogleFonts.inter(fontSize: 13, color: kOnSurface))),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: labelColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: labelColor.withOpacity(0.2)),
          ),
          child: Text(label, style: GoogleFonts.inter(
            fontSize: 11, fontWeight: FontWeight.w600, color: labelColor)),
        ),
      ]),
    );
  }
}

class _UpdateBanner extends StatelessWidget {
  final UpdateInfo update;
  const _UpdateBanner({required this.update});

  @override
  Widget build(BuildContext context) {
    final isForce = update.forceUpdate;
    final bannerColor = isForce ? kError : const Color(0xFFB45309);
    final bgColor = isForce
        ? kError.withOpacity(0.08)
        : const Color(0xFFB45309).withOpacity(0.08);

    String downloadUrl = '';
    if (Platform.isMacOS) downloadUrl = update.macUrl;
    if (Platform.isWindows) downloadUrl = update.windowsUrl;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bannerColor.withOpacity(0.35)),
      ),
      child: Row(children: [
        Icon(isForce ? LucideIcons.triangle_alert : LucideIcons.cloud_download,
            color: bannerColor, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              isForce
                  ? 'Critical Update Required — v${update.latestVersion}'
                  : 'Update Available — v${update.latestVersion}',
              style: GoogleFonts.inter(
                fontSize: 13, fontWeight: FontWeight.bold, color: bannerColor),
            ),
            if (update.releaseNotes.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(update.releaseNotes,
                  style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
            ],
          ]),
        ),
        if (downloadUrl.isNotEmpty)
          TextButton(
            onPressed: () => launchUrl(Uri.parse(downloadUrl)),
            style: TextButton.styleFrom(foregroundColor: bannerColor),
            child: Text('Download', style: GoogleFonts.inter(
              fontWeight: FontWeight.bold, fontSize: 12)),
          ),
      ]),
    );
  }
}
