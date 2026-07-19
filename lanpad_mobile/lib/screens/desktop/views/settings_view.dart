import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/theme.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';

/// Settings view — matches the Stitch "Settings" screen with merged Legal/Compliance policies.
class SettingsView extends StatefulWidget {
  final DesktopState state;
  const SettingsView({super.key, required this.state});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  bool _launchAtStartup = true;
  bool _nativeNotifications = true;
  bool _autoPaste = false;
  bool _globalHook = true;
  double _typingDelay = 0.2; // simulation delay fraction

  final List<({String title, String desc, String path, String fallbackUrl})> _policies = const [
    (
      title: 'Terms of Service',
      desc: 'Terms of using the bridge services',
      path: '/terms',
      fallbackUrl: 'https://lanpad.app/terms'
    ),
    (
      title: 'Privacy Policy',
      desc: 'Data transmission & privacy standards',
      path: '/privacy',
      fallbackUrl: 'https://lanpad.app/privacy'
    ),
    (
      title: 'Content Policy',
      desc: 'Transfer guidelines and restrictions',
      path: '/content-policy',
      fallbackUrl: 'https://lanpad.app/content'
    ),
    (
      title: 'Copyright Takedown',
      desc: 'DMCA / Intellectual property claims',
      path: '/copyright-takedown',
      fallbackUrl: 'https://lanpad.app/dmca'
    ),
    (
      title: 'Refund Policy',
      desc: 'Relay & license monetization guidelines',
      path: '/refund-policy',
      fallbackUrl: 'https://lanpad.app/refund'
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _launchAtStartup = prefs.getBool('launch_at_startup') ?? true;
      _nativeNotifications = prefs.getBool('native_notifications') ?? true;
      _autoPaste = prefs.getBool('auto_paste') ?? false;
      _globalHook = prefs.getBool('global_hook') ?? true;
      _typingDelay = prefs.getDouble('typing_delay') ?? 0.2;
    });
  }

  Future<void> _saveBoolSetting(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _saveDoubleSetting(String key, double value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(key, value);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final isRunning = s.serverService.isRunning;

    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text('Settings', style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
          const Spacer(),
          // Node status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: kSurfaceContainer,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kOutlineVariant),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 7, height: 7, decoration: BoxDecoration(
                color: isRunning ? kSuccess : kOnSurfaceVariant,
                shape: BoxShape.circle,
                boxShadow: isRunning ? [BoxShadow(color: kSuccess.withValues(alpha: 0.5), blurRadius: 6)] : [],
              )),
              const SizedBox(width: 7),
              Text('NODE: ${s.localIp}', style: GoogleFonts.inter(
                fontSize: 11, color: kOnSurfaceVariant, letterSpacing: 0.5)),
            ]),
          ),
        ]),
      ),

      // ── Scrollable content ────────────────────────────────────────
      Expanded(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

              // ── General ──────────────────────────────────────────
              _SectionHeader(LucideIcons.settings_2, 'General'),
              const SizedBox(height: 12),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: _GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('VISUAL IDENTITY', style: GoogleFonts.inter(
                    fontSize: 10, color: kPrimary, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  const SizedBox(height: 6),
                  Text('Theme Preference', style: GoogleFonts.outfit(
                    fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                  const SizedBox(height: 4),
                  Text('Choose between technical dark mode or high-contrast light.',
                    style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
                  const SizedBox(height: 20),
                  _ThemeToggle(),
                ]))),
                const SizedBox(width: 16),
                Expanded(child: _GlassCard(child: Column(children: [
                  _Toggle('Launch at Startup', 'Start LANpad when you log in.',
                    _launchAtStartup, (v) {
                      setState(() => _launchAtStartup = v);
                      _saveBoolSetting('launch_at_startup', v);
                    }),
                  Divider(color: kOutlineVariant, height: 24),
                  _Toggle('Native Notifications', 'Show desktop alerts for new events.',
                    _nativeNotifications, (v) {
                      setState(() => _nativeNotifications = v);
                      _saveBoolSetting('native_notifications', v);
                    }),
                ]))),
              ]),
              const SizedBox(height: 16),

              // Full-width Theme Selector
              _GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('VISUAL STYLE & THEME', style: GoogleFonts.inter(
                      fontSize: 10, color: kPrimary, fontWeight: FontWeight.bold, letterSpacing: 1)),
                    const SizedBox(height: 6),
                    Text('Active Theme Accent', style: GoogleFonts.outfit(
                      fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                    const SizedBox(height: 4),
                    Text('Choose the global interface style and accent colors.',
                      style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
                    const SizedBox(height: 20),
                    _DesktopThemeSelector(),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── Connection ────────────────────────────────────────
              _SectionHeader(LucideIcons.router, 'Connection'),
              const SizedBox(height: 12),
              _GlassCard(child: Column(children: [
                Row(children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: kPrimary.withValues(alpha: 0.1), shape: BoxShape.circle),
                    child: Icon(LucideIcons.laptop, color: kPrimary, size: 22),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s.displayDeviceName, style: GoogleFonts.outfit(
                      fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                    Text('Local Bridge IP: ${s.localIp}  ·  Port: 8000',
                      style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                  ])),
                ]),
                Divider(color: kOutlineVariant, height: 28),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Network Interface', style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
                    Text('Primary adapter for local discovery and data transfer.',
                      style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: kSurfaceLowest,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: kOutlineVariant),
                    ),
                    child: Text('en0 (Wi-Fi) — ${s.localIp}',
                      style: GoogleFonts.inter(fontSize: 12, color: kOnSurface)),
                  ),
                ]),
                if (Platform.isMacOS) ...[
                  Divider(color: kOutlineVariant, height: 28),
                  Row(children: [
                    Container(width: 8, height: 8, decoration: BoxDecoration(
                      color: s.hasAccessibilityPermission ? kSuccess : const Color(0xFFFFB300),
                      shape: BoxShape.circle,
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(
                        s.hasAccessibilityPermission
                            ? 'Accessibility Granted'
                            : 'Accessibility Permission Needed',
                        style: GoogleFonts.inter(
                          fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface)),
                      Text('Required to simulate typing events from mobile devices.',
                        style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                    ])),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kSurfaceVariant, foregroundColor: kOnSurface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onPressed: s.onRequestAccessibility,
                      child: Text('Configure',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ]),
                ],
              ])),
              const SizedBox(height: 28),

              // ── Input Behavior ────────────────────────────────────
              _SectionHeader(LucideIcons.keyboard, 'Input Behavior'),
              const SizedBox(height: 12),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: _GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Typing Speed', style: GoogleFonts.inter(
                    fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
                  Text('Simulation delay (ms)',
                    style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                  const SizedBox(height: 16),
                  SliderTheme(
                    data: SliderThemeData(
                      activeTrackColor: kPrimary, inactiveTrackColor: kSurfaceVariant,
                      thumbColor: kPrimary, overlayColor: kPrimary.withValues(alpha: 0.1),
                    ),
                    child: Slider(
                      value: _typingDelay,
                      min: 0.05,
                      max: 1.0,
                      onChanged: (v) {
                        setState(() => _typingDelay = v);
                        _saveDoubleSetting('typing_delay', v);
                      },
                    ),
                  ),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Fast', style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                    Text('${(_typingDelay * 100).round()}ms', style: GoogleFonts.inter(
                      fontSize: 11, color: kPrimary, fontWeight: FontWeight.bold)),
                    Text('Slow', style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
                  ]),
                ]))),
                const SizedBox(width: 16),
                Expanded(child: _GlassCard(child:
                  _Toggle('Auto-Paste',
                    'Paste clipboard contents automatically on connection.',
                    _autoPaste, (v) {
                      setState(() => _autoPaste = v);
                      _saveBoolSetting('auto_paste', v);
                    }))),
                const SizedBox(width: 16),
                Expanded(child: _GlassCard(child:
                  _Toggle('Global Hook',
                    'Allow LANpad to intercept global media keys.',
                    _globalHook, (v) {
                      setState(() => _globalHook = v);
                      _saveBoolSetting('global_hook', v);
                    }))),
              ]),
              const SizedBox(height: 36),

              // ── About ─────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.only(top: 24),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: kOutlineVariant)),
                ),
                child: Column(children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('About LANpad', style: GoogleFonts.outfit(
                        fontSize: 22, fontWeight: FontWeight.w600, color: kOnSurface)),
                      const SizedBox(height: 8),
                      Text(
                        'LANpad Version 2.4.1 (Stable Build)\n'
                        'Architected for ultra-low latency local-first communication.\n'
                        'Licensed under the Technical Utility Agreement.',
                        style: GoogleFonts.inter(
                          fontSize: 13, color: kOnSurfaceVariant, height: 1.6)),
                    ])),
                    Column(children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => s.onShowToast('Checking for updates...'),
                        icon: const Icon(LucideIcons.download, size: 16),
                        label: Text('Check for Updates',
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: kOutlineVariant),
                          foregroundColor: kOnSurface,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () async {
                          final uri = Uri.parse('https://lanpad.app/docs');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri);
                          } else {
                            s.onShowToast('Could not launch documentation URL', isError: true);
                          }
                        },
                        child: Text('Documentation & API',
                          style: GoogleFonts.inter(fontSize: 13)),
                      ),
                    ]),
                  ]),
                  const SizedBox(height: 20),
                  // Info bento grid
                  GridView.count(
                    crossAxisCount: 4, shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 2.5,
                    children: [
                      _InfoBento('ARCHITECTURE', 'x86_64 / arm64'),
                      _InfoBento('KERNEL HASH', '8f2a...19d4'),
                      _InfoBento('UPTIME', isRunning ? 'Active' : '—'),
                      _InfoBento('TELEMETRY', 'Opted Out', valueColor: kError),
                    ],
                  ),
                ]),
              ),
              const SizedBox(height: 36),

              // ── Compliance & Legal Policies ───────────────────────
              _SectionHeader(LucideIcons.file_text, 'Compliance & Legal Policies'),
              const SizedBox(height: 12),
              _GlassCard(
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _policies.length,
                  separatorBuilder: (context, index) => Divider(color: kOutlineVariant, height: 1),
                  itemBuilder: (context, index) {
                    final policy = _policies[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(policy.title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
                      subtitle: Text(policy.desc, style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
                      trailing: Icon(LucideIcons.chevron_right, size: 16, color: kOnSurfaceVariant),
                      onTap: () async {
                        final serverUrl = s.serverService.isRunning ? 'http://localhost:8000' : 'https://lanpad.app';
                        final uri = Uri.parse('$serverUrl${policy.path}');
                        try {
                          final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
                          if (!success) {
                            final fallback = Uri.parse(policy.fallbackUrl);
                            await launchUrl(fallback, mode: LaunchMode.externalApplication);
                          }
                        } catch (e) {
                          try {
                            final fallback = Uri.parse(policy.fallbackUrl);
                            await launchUrl(fallback, mode: LaunchMode.externalApplication);
                          } catch (e2) {
                            s.onShowToast('Could not launch policy URL', isError: true);
                          }
                        }
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 40),
            ]),
          ),
        ),
      ),
    ]);
  }
}

// ── Private widgets ───────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionHeader(this.icon, this.label);

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, color: kPrimary, size: 20),
    const SizedBox(width: 10),
    Text(label, style: GoogleFonts.outfit(
      fontSize: 22, fontWeight: FontWeight.w600, color: kOnSurface)),
  ]);
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: kGlassCard,
    child: Material(
      type: MaterialType.transparency,
      child: child,
    ),
  );
}

class _Toggle extends StatelessWidget {
  final String title;
  final String desc;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _Toggle(this.title, this.desc, this.value, this.onChanged);

  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: GoogleFonts.inter(
        fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
      Text(desc, style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
    ])),
    Switch(
      value: value,
      onChanged: onChanged,
      activeThumbColor: kPrimary,
      activeTrackColor: kPrimary.withValues(alpha: 0.3),
      inactiveThumbColor: kOnSurfaceVariant,
      inactiveTrackColor: kSurfaceVariant,
    ),
  ]);
}

class _InfoBento extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoBento(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: kSurfaceLow,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: kOutlineVariant),
    ),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(label, style: GoogleFonts.inter(
        fontSize: 9, color: kOnSurfaceVariant, letterSpacing: 1.1)),
      const SizedBox(height: 4),
      Text(value, style: GoogleFonts.inter(
        fontSize: 13, fontWeight: FontWeight.bold,
        color: valueColor ?? kOnSurface)),
    ]),
  );
}

class _ThemeToggle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AppTheme.themeModeNotifier,
      builder: (context, _) {
        final mode = AppTheme.themeModeNotifier.value;
        final selectedIndex = mode == ThemeMode.dark ? 0 : 1; // 0 for Dark, 1 for Light

        return Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: kSurfaceLowest,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: kOutlineVariant),
          ),
          child: Row(children: ['Dark', 'Light'].asMap().entries.map((e) {
            final isActive = e.key == selectedIndex;
            return Expanded(child: GestureDetector(
              onTap: () async {
                final targetMode = e.key == 0 ? ThemeMode.dark : ThemeMode.light;
                AppTheme.themeModeNotifier.value = targetMode;
                final prefs = await SharedPreferences.getInstance();
                await prefs.setInt('theme_mode', e.key == 0 ? 1 : 0);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isActive ? kSurfaceVariant : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(child: Text(e.value, style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                  color: isActive ? kPrimary : kOnSurfaceVariant,
                ))),
              ),
            ));
          }).toList()),
        );
      }
    );
  }
}

class _DesktopThemeSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final themes = [
      (
        key: 'gemini',
        name: 'Aether Glow',
        desc: 'Shifting multi-color aurora (Default)',
        colors: [const Color(0xFF4285F4), const Color(0xFF9C27F0), const Color(0xFFF94BA4)]
      ),
      (
        key: 'arc',
        name: 'Arc Space',
        desc: 'Continuous playful hue-shifting mesh',
        colors: [const Color(0xFFFF6F61), const Color(0xFF7C5CFF), const Color(0xFFFFC15E)]
      ),
      (
        key: 'linear',
        name: 'Monochrome',
        desc: 'Restrained deep indigo periwinkle',
        colors: [const Color(0xFF5E6AD2), const Color(0xFF8B93F0), const Color(0xFF17181C)]
      ),
      (
        key: 'liquid_glass_blue',
        name: 'Liquid Glass',
        desc: 'Translucent frosted material',
        colors: [const Color(0xFF3B82F6), const Color(0xFF22D3EE), const Color(0xFF030711)]
      ),
      (
        key: 'spotify',
        name: 'Neon Dark',
        desc: 'Bold true black with neon green accent',
        colors: [const Color(0xFF1ED760), const Color(0xFF2D46B9), const Color(0xFF000000)]
      ),
    ];

    final current = DesktopThemeManager.instance.currentTheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        final useGrid = constraints.maxWidth > 580;
        final cols = useGrid ? 3 : 2;
        
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: themes.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: useGrid ? 3.6 : 3.0,
          ),
          itemBuilder: (context, index) {
            final t = themes[index];
            final isSelected = t.key == current;
            return GestureDetector(
              onTap: () {
                DesktopThemeManager.instance.setTheme(t.key);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? kPrimary.withValues(alpha: 0.08) : kSurfaceLowest,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? kPrimary : kOutlineVariant.withValues(alpha: 0.4),
                    width: isSelected ? 1.6 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    // Palette preview circle
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: t.colors,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        t.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? kPrimary : kOnSurface,
                        ),
                      ),
                    ),
                    if (isSelected)
                      Icon(
                        LucideIcons.check,
                        color: kPrimary,
                        size: 13,
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
