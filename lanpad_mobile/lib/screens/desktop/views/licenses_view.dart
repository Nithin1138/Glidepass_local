import 'dart:io';
import 'dart:async';
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
  String _tier = 'FREE';
  String _key = '';
  String _expiresAt = '';
  int _daysLeft = 0;
  String _errorMessage = '';
  bool _refreshing = false;
  bool _keyObscured = true;

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

  Future<void> _loadLicenseStatus({bool force = false}) async {
    final res = await widget.state.apiService.fetchLicenseStatus(force: force);
    if (res['status'] == 'success' && mounted) {
      setState(() {
        _tier = (res['tier'] ?? 'FREE').toString().toUpperCase();
        _key = res['key'] ?? '';
        _expiresAt = res['expires_at'] ?? '';
        _daysLeft = res['days_left'] ?? 0;
      });
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
      _keyObscured = true; // Obscure new key by default
      await _loadLicenseStatus(force: true);
      await _admin.refresh(force: true);
    } else {
      setState(() {
        _errorMessage = res['message'] ?? 'Activation failed';
      });
      widget.state.onShowToast('Activation failed: $_errorMessage', isError: true);
    }
    if (mounted) setState(() => _activating = false);
  }

  Future<void> _handleRefresh() async {
    if (!widget.state.serverService.isRunning) {
      widget.state.onShowToast('Cannot refresh: Local server is offline', isError: true);
      return;
    }
    setState(() => _refreshing = true);
    try {
      await Future.wait([
        _loadLicenseStatus(force: true),
        _admin.refresh(force: true),
      ]);
    } catch (e) {
      debugPrint('Refresh failed: $e');
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _revealLicenseKey() async {
    try {
      bool success = false;
      if (Platform.isMacOS) {
        final result = await Process.run('osascript', [
          '-e',
          'do shell script "true" with administrator privileges with prompt "LANpad wants to show your activation key."'
        ]);
        success = (result.exitCode == 0);
      } else if (Platform.isWindows) {
        const psCmd = '\$cred = \$host.ui.PromptForCredential("LANpad Authentication", "Please authenticate to view your activation key.", "", ""); if (\$cred) { exit 0 } else { exit 1 }';
        final result = await Process.run('powershell', ['-Command', psCmd]);
        success = (result.exitCode == 0);
      } else {
        success = true;
      }

      if (success && mounted) {
        setState(() => _keyObscured = false);
        widget.state.onShowToast('Key revealed successfully');
        Timer(const Duration(seconds: 5), () {
          if (mounted) setState(() => _keyObscured = true);
        });
      } else {
        widget.state.onShowToast('Authentication failed', isError: true);
      }
    } catch (e) {
      debugPrint('[auth] Subprocess authentication failed: $e');
      if (mounted) {
        setState(() => _keyObscured = false);
        Timer(const Duration(seconds: 5), () {
          if (mounted) setState(() => _keyObscured = true);
        });
      }
    }
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
                        ? const SizedBox(width: 16, height: 16,
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
                if (!adminStatus.isLoaded) {
                  return Center(
                    child: CircularProgressIndicator(color: kPrimary),
                  );
                }

                // ── Monetization OFF → Ultra Pack view ──────────────
                if (!adminStatus.monetizationEnabled) {
                  return _UltraPackView(
                    tier: adminStatus.tier,
                    version: adminStatus.version,
                    updateInfo: ValueListenableBuilder<UpdateInfo?>(
                      valueListenable: _admin.updateInfo,
                      builder: (ctx, info, _) {
                        if (info != null && info.updateAvailable) {
                          return _UpdateBanner(update: info);
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  );
                }

                // ── Monetization ON → License + Limits + Activate ──
                final showLimits = (adminStatus.tier == 'FREE' || adminStatus.tier == 'BASIC');
                final Widget layoutWidget;

                if (showLimits) {
                  layoutWidget = Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 5,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _LicenseStatusCard(
                              tier: adminStatus.tier,
                              licenseKey: _key,
                              expiresAt: _expiresAt,
                              daysLeft: _daysLeft,
                              version: adminStatus.version,
                              tierColor: _tierColor(adminStatus.tier),
                              tierIcon: _tierIcon(adminStatus.tier),
                              keyObscured: _keyObscured,
                              onReveal: _revealLicenseKey,
                              onHide: () => setState(() => _keyObscured = true),
                            ),
                            const SizedBox(height: 20),
                            _ActivateCard(
                              controller: _keyController,
                              activating: _activating,
                              errorMessage: _errorMessage,
                              onActivate: _activateKey,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 4,
                        child: _FeatureLimitsCard(adminStatus: adminStatus),
                      ),
                    ],
                  );
                } else {
                  layoutWidget = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _LicenseStatusCard(
                        tier: adminStatus.tier,
                        licenseKey: _key,
                        expiresAt: _expiresAt,
                        daysLeft: _daysLeft,
                        version: adminStatus.version,
                        tierColor: _tierColor(adminStatus.tier),
                        tierIcon: _tierIcon(adminStatus.tier),
                        keyObscured: _keyObscured,
                        onReveal: _revealLicenseKey,
                        onHide: () => setState(() => _keyObscured = true),
                      ),
                      const SizedBox(height: 20),
                      _ActivateCard(
                        controller: _keyController,
                        activating: _activating,
                        errorMessage: _errorMessage,
                        onActivate: _activateKey,
                      ),
                    ],
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ValueListenableBuilder<UpdateInfo?>(
                      valueListenable: _admin.updateInfo,
                      builder: (ctx, info, _) {
                        if (info != null && info.updateAvailable) {
                          return _UpdateBanner(update: info);
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                    layoutWidget,
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

// ── Ultra Pack view (monetization OFF) ─────────────────────────────────────────

class _UltraPackView extends StatelessWidget {
  final String tier;
  final String version;
  final Widget updateInfo;
  const _UltraPackView({required this.tier, required this.version, required this.updateInfo});

  static const Color _kGreen = Color(0xFF10B981);

  static final _features = <(IconData, String)>[
    (LucideIcons.folder_open,  'File Sharing'),
    (LucideIcons.zap,          'Live Sync'),
    (LucideIcons.keyboard,     'Typing Mode'),
    (LucideIcons.clipboard,    'Clipboard'),
    (LucideIcons.network,      'Tunnel'),
    (LucideIcons.book_open,    'Resource Hub'),
    (LucideIcons.flame,        'Flash Mode'),
    (LucideIcons.activity,     'Inject Mode'),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        updateInfo,
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: _kGreen.withOpacity(0.28), width: 1.2),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              stops: [0.0, 0.5, 1.0],
              colors: [
                Color(0xFF061F2E),
                Color(0xFF0A1F1A),
                Color(0xFF0D1117),
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: _kGreen.withOpacity(0.08),
                blurRadius: 40,
                spreadRadius: 0,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                top: -60, left: -40,
                child: Container(
                  width: 280, height: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _kGreen.withOpacity(0.10),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(40, 44, 40, 40),
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 88, height: 88,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: _kGreen.withOpacity(0.15), width: 1),
                          ),
                        ),
                        Container(
                          width: 66, height: 66,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _kGreen.withOpacity(0.1),
                            border: Border.all(color: _kGreen.withOpacity(0.35), width: 1.5),
                            boxShadow: [
                              BoxShadow(
                                color: _kGreen.withOpacity(0.30),
                                blurRadius: 20,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Icon(LucideIcons.crown, size: 28, color: _kGreen),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      'Ultra Pack',
                      style: GoogleFonts.outfit(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -1.0,
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ACTIVE',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _kGreen,
                        letterSpacing: 4.0,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'All features are fully unlocked for everyone.',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.50),
                        fontWeight: FontWeight.w400,
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                    Row(children: [
                      Expanded(child: Divider(color: Colors.white.withOpacity(0.07), height: 1)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('INCLUDED FEATURES',
                          style: GoogleFonts.inter(
                            fontSize: 9, letterSpacing: 2.0,
                            color: Colors.white.withOpacity(0.25),
                            fontWeight: FontWeight.w600)),
                      ),
                      Expanded(child: Divider(color: Colors.white.withOpacity(0.07), height: 1)),
                    ]),
                    const SizedBox(height: 20),
                    GridView.count(
                      crossAxisCount: 4,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 2.4,
                      children: _features
                          .map((f) => _FeaturePill(icon: f.$1, label: f.$2))
                          .toList(),
                    ),
                    const SizedBox(height: 28),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
                      decoration: BoxDecoration(
                        color: _kGreen.withOpacity(0.10),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: _kGreen.withOpacity(0.25), width: 1),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Container(
                          width: 7, height: 7,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _kGreen,
                            boxShadow: [
                              BoxShadow(
                                color: _kGreen.withOpacity(0.6),
                                blurRadius: 6,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 9),
                        Text(
                          'No license required  ·  Everyone gets full access',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: _kGreen,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ]),
                    ),
                    if (version.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      Text('LANpad v$version',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: Colors.white.withOpacity(0.20))),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 12, color: const Color(0xFF10B981)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 11,
                color: Colors.white.withOpacity(0.75),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── License status card ────────────────────────────────────────────────────────

class _LicenseStatusCard extends StatelessWidget {
  final String tier;
  final String licenseKey;
  final String expiresAt;
  final int daysLeft;
  final String version;
  final Color tierColor;
  final IconData tierIcon;
  final bool keyObscured;
  final VoidCallback onReveal;
  final VoidCallback onHide;

  const _LicenseStatusCard({
    required this.tier,
    required this.licenseKey,
    required this.expiresAt,
    required this.daysLeft,
    required this.version,
    required this.tierColor,
    required this.tierIcon,
    required this.keyObscured,
    required this.onReveal,
    required this.onHide,
  });

  @override
  Widget build(BuildContext context) {
    final String displayKey = licenseKey.isEmpty
        ? 'No active key'
        : keyObscured
            ? '••••-••••-••••-••••'
            : licenseKey;

    return _SectionCard(
      title: 'License Status',
      icon: LucideIcons.key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sleek 3-column Grid for license plan info
          Row(
            children: [
              Expanded(
                child: _GridItem(
                  label: 'PLAN',
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(tierIcon, size: 13, color: tierColor),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(tier, style: GoogleFonts.inter(
                          fontSize: 13, fontWeight: FontWeight.bold, color: tierColor, letterSpacing: 0.8),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _GridItem(
                  label: 'EXPIRES IN',
                  child: Text(
                    licenseKey.isEmpty ? '--' : '$daysLeft days left',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _GridItem(
                  label: 'VERSION',
                  child: Text(
                    'v$version',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Obscured key field with TouchID/System Authentication
          if (licenseKey.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: kSurfaceLow,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: kOutlineVariant),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ACTIVATION KEY', style: GoogleFonts.inter(
                          fontSize: 9, fontWeight: FontWeight.bold, color: kOnSurfaceVariant, letterSpacing: 1.0)),
                        const SizedBox(height: 4),
                        Text(displayKey, style: GoogleFonts.jetBrainsMono(
                          fontSize: 13, color: kOnSurface, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  if (keyObscured)
                    ElevatedButton.icon(
                      onPressed: onReveal,
                      icon: const Icon(LucideIcons.key, size: 14),
                      label: Text('Reveal Key', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        elevation: 0,
                      ),
                    )
                  else ...[
                    IconButton(
                      onPressed: () => Clipboard.setData(ClipboardData(text: licenseKey)),
                      icon: const Icon(LucideIcons.copy, size: 14),
                      tooltip: 'Copy key',
                    ),
                    IconButton(
                      onPressed: onHide,
                      icon: const Icon(LucideIcons.eye_off, size: 14),
                      tooltip: 'Hide key',
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (tier == 'FREE') ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: kSurfaceLow,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: kOutlineVariant),
              ),
              child: Row(children: [
                Icon(LucideIcons.info, size: 14, color: kOnSurfaceVariant),
                const SizedBox(width: 8),
                Expanded(child: Text(
                  'You are on the free tier. Purchase or activate a key below to unlock higher limits.',
                  style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant, height: 1.4),
                )),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}

class _GridItem extends StatelessWidget {
  final String label;
  final Widget child;
  const _GridItem({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kSurfaceLow,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: GoogleFonts.inter(
            fontSize: 9, fontWeight: FontWeight.bold, color: kOnSurfaceVariant, letterSpacing: 1.0)),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

// ── Feature limits card ────────────────────────────────────────────────────────

class _FeatureLimitsCard extends StatelessWidget {
  final AdminStatus adminStatus;
  const _FeatureLimitsCard({required this.adminStatus});

  static final _featureRows = <String, (String, IconData)>{
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

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Feature Limits (Your Plan)',
      icon: LucideIcons.list,
      child: Column(
        children: _featureRows.entries.map((e) {
          final key = e.key;
          final (name, icon) = e.value;
          final val = adminStatus.featureLimits[key];
          final label = adminStatus.limitLabel(key);
          final isDisabled = val == -1;
          final isUnlimited = val == 0 || val == null;
          return _FeatureLimitRow(
            icon: icon,
            name: name,
            label: label,
            isDisabled: isDisabled,
            isUnlimited: isUnlimited,
          );
        }).toList(),
      ),
    );
  }
}

// ── Activate card ──────────────────────────────────────────────────────────────

class _ActivateCard extends StatelessWidget {
  final TextEditingController controller;
  final bool activating;
  final String errorMessage;
  final VoidCallback onActivate;
  const _ActivateCard({
    required this.controller,
    required this.activating,
    required this.errorMessage,
    required this.onActivate,
  });

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Activate a License Key',
      icon: LucideIcons.shield_check,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
            decoration: InputDecoration(
              hintText: 'AAAA-BBBB-CCCC-DDDD',
              hintStyle: GoogleFonts.inter(
                fontSize: 13, color: kOnSurfaceVariant.withOpacity(0.5)),
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
            onSubmitted: (_) => onActivate(),
          ),
          if (errorMessage.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(children: [
              Icon(LucideIcons.circle_alert, size: 13, color: kError),
              const SizedBox(width: 6),
              Expanded(child: Text(errorMessage, style: GoogleFonts.inter(
                fontSize: 12, color: kError, fontWeight: FontWeight.w500))),
            ]),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  onPressed: activating ? null : onActivate,
                  child: activating
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                      : Text('Activate License', style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: kSurfaceLow,
                  foregroundColor: kOnSurface,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: kOutlineVariant),
                  ),
                  elevation: 0,
                ),
                onPressed: () => launchUrl(Uri.parse('https://lanpad.app')),
                icon: const Icon(LucideIcons.external_link, size: 14),
                label: Text('Obtain Key', style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Shared helper widgets ──────────────────────────────────────────────────────

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
              Icon(icon, size: 14, color: kPrimary),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.inter(
                fontSize: 10, fontWeight: FontWeight.bold,
                color: kOnSurfaceVariant, letterSpacing: 0.9)),
            ]),
          ),
          const SizedBox(height: 12),
          Divider(color: kOutlineVariant, height: 1),
          Padding(padding: const EdgeInsets.all(18), child: child),
        ],
      ),
    );
  }
}

class _FeatureLimitRow extends StatelessWidget {
  final IconData icon;
  final String name;
  final String label;
  final bool isDisabled;
  final bool isUnlimited;
  const _FeatureLimitRow({
    required this.icon, required this.name, required this.label,
    required this.isDisabled, required this.isUnlimited,
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
        Icon(icon, size: 14,
            color: isDisabled ? kError.withOpacity(0.6) : kOnSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(child: Text(name, style: GoogleFonts.inter(
          fontSize: 13, color: kOnSurface))),
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
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bannerColor.withOpacity(0.35)),
      ),
      child: Row(children: [
        Icon(isForce ? LucideIcons.triangle_alert : LucideIcons.cloud_download,
            color: bannerColor, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            isForce
                ? 'Critical update required — v${update.latestVersion}'
                : 'Update available — v${update.latestVersion}',
            style: GoogleFonts.inter(
              fontSize: 13, fontWeight: FontWeight.bold, color: bannerColor),
          ),
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
