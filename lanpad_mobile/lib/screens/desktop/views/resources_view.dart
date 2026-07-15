import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../../../models/resource_model.dart';
import '../../../config/theme.dart';

/// Hubs & Resources view — matches Stitch "Resources" screen.
/// Left: Hub list. Right: Resource card grid.
class ResourcesView extends StatefulWidget {
  final DesktopState state;
  final TextEditingController searchController;

  const ResourcesView({
    super.key,
    required this.state,
    required this.searchController,
  });

  @override
  State<ResourcesView> createState() => _ResourcesViewState();
}

class _ResourcesViewState extends State<ResourcesView> {
  bool _showLicenses = false;

  @override
  Widget build(BuildContext context) {
    final isRunning = widget.state.serverService.isRunning;

    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text(
            _showLicenses ? 'App Activation' : 'Hubs & Resources',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface),
          ),
          const Spacer(),
          if (widget.state.selectedHub != null && !_showLicenses)
            SizedBox(
              width: 240,
              child: TextField(
                controller: widget.searchController,
                onChanged: widget.state.onFilterHubResources,
                style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                decoration: kSearchDecoration('Search resources...'),
              ),
            ),
        ]),
      ),

      // ── Content ─────────────────────────────────────────────────
      Expanded(
        child: isRunning
            ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Left: Hub list sidebar
                Container(
                  width: 240,
                  decoration: BoxDecoration(
                    border: Border(right: BorderSide(color: kOutlineVariant)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Text(
                          'KNOWLEDGE HUBS',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: kOnSurfaceVariant,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                      Expanded(
                        child: widget.state.loadingHubs
                            ? Center(child: CircularProgressIndicator(color: kPrimary))
                            : widget.state.hubs.isEmpty
                                ? _Empty(icon: LucideIcons.book, message: 'No hubs available')
                                : ListView.builder(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    itemCount: widget.state.hubs.length,
                                    itemBuilder: (_, i) {
                                      final hub = widget.state.hubs[i];
                                      final isSelected = widget.state.selectedHub?.id == hub.id && !_showLicenses;
                                      return GestureDetector(
                                        onTap: () {
                                          widget.state.onSelectHub(hub);
                                          setState(() => _showLicenses = false);
                                        },
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 150),
                                          margin: const EdgeInsets.only(bottom: 2),
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                          decoration: BoxDecoration(
                                            color: isSelected ? kSurfaceVariant : Colors.transparent,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Row(children: [
                                            Icon(
                                              LucideIcons.layers,
                                              size: 15,
                                              color: isSelected ? kPrimary : kOnSurfaceVariant,
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                hub.title,
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                                  color: isSelected ? kPrimary : kOnSurface,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ]),
                                        ),
                                      );
                                    },
                                  ),
                      ),
                      const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: GestureDetector(
                          onTap: () {
                            setState(() => _showLicenses = true);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: _showLicenses ? kSurfaceVariant : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(children: [
                              Icon(
                                LucideIcons.key,
                                size: 15,
                                color: _showLicenses ? kPrimary : kOnSurfaceVariant,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'App Activation',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: _showLicenses ? FontWeight.bold : FontWeight.normal,
                                    color: _showLicenses ? kPrimary : kOnSurface,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ]),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Right panel
                Expanded(
                  child: _showLicenses
                      ? _LicensesPanel(state: widget.state)
                      : widget.state.selectedHub == null
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.layers, color: kOnSurfaceVariant, size: 40),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Select a hub to view resources',
                                    style: GoogleFonts.inter(fontSize: 14, color: kOnSurfaceVariant),
                                  ),
                                ],
                              ),
                            )
                          : widget.state.loadingHubs
                              ? Center(child: CircularProgressIndicator(color: kPrimary))
                              : widget.state.filteredResources.isEmpty
                                  ? _Empty(icon: LucideIcons.folder_open, message: 'No resources in this hub')
                                  : GridView.builder(
                                      padding: const EdgeInsets.all(20),
                                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                                        maxCrossAxisExtent: 300,
                                        mainAxisSpacing: 14,
                                        crossAxisSpacing: 14,
                                        childAspectRatio: 1.1,
                                      ),
                                      itemCount: widget.state.filteredResources.length,
                                      itemBuilder: (_, i) => _ResourceCard(resource: widget.state.filteredResources[i]),
                                    ),
                ),
              ])
            : _OfflinePrompt(onStart: widget.state.onToggleServer),
      ),
    ]);
  }
}

class _LicensesPanel extends StatefulWidget {
  final DesktopState state;
  const _LicensesPanel({required this.state});

  @override
  State<_LicensesPanel> createState() => _LicensesPanelState();
}

class _LicensesPanelState extends State<_LicensesPanel> {
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

    return SingleChildScrollView(
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
    );
  }
}

class _ResourceCard extends StatelessWidget {
  final ResourceSnippet resource;
  const _ResourceCard({required this.resource});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(LucideIcons.file_code, color: kPrimary, size: 20),
          const Spacer(),
          if (resource.language != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: kSurfaceVariant, borderRadius: BorderRadius.circular(6)),
              child: Text(resource.language!.toUpperCase(),
                style: GoogleFonts.inter(fontSize: 9, color: kOnSurfaceVariant, letterSpacing: 1)),
            ),
        ]),
        const SizedBox(height: 10),
        Text(resource.title, style: GoogleFonts.outfit(
          fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface),
          maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 6),
        Expanded(child: Text(resource.content,
          style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant, height: 1.5),
          maxLines: 4, overflow: TextOverflow.ellipsis)),
        if (resource.tags.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(spacing: 4, children: resource.tags.take(3).map((t) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: kPrimary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: kPrimary.withValues(alpha: 0.2)),
            ),
            child: Text(t, style: GoogleFonts.inter(
              fontSize: 9, color: kPrimary, letterSpacing: 0.3)),
          )).toList()),
        ],
      ]),
    );
  }
}

class _Empty extends StatelessWidget {
  final IconData icon;
  final String message;
  const _Empty({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: kOnSurfaceVariant, size: 36),
      const SizedBox(height: 12),
      Text(message, style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
    ]),
  );
}

class _OfflinePrompt extends StatelessWidget {
  final VoidCallback onStart;
  const _OfflinePrompt({required this.onStart});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(LucideIcons.server_off, color: kOnSurfaceVariant, size: 48),
      const SizedBox(height: 16),
      Text('Server is offline', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w600, color: kOnSurface)),
      const SizedBox(height: 8),
      Text('Start the server to access hubs.',
        style: GoogleFonts.inter(fontSize: 14, color: kOnSurfaceVariant)),
      const SizedBox(height: 24),
      ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: onStart,
        child: Text('Start Server', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      ),
    ]),
  );
}
