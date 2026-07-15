import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../../../models/resource_model.dart';
import '../../../config/theme.dart';

/// Hubs & Resources view — matches Stitch "Resources" screen.
/// Left: Hub list. Right: Resource card grid.
class ResourcesView extends StatelessWidget {
  final DesktopState state;
  final TextEditingController searchController;

  const ResourcesView({
    super.key,
    required this.state,
    required this.searchController,
  });

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;

    return Column(children: [
      // ── Top bar ─────────────────────────────────────────────────
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
        ),
        child: Row(children: [
          Text('Hubs & Resources', style: GoogleFonts.outfit(
            fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
          const Spacer(),
          if (state.selectedHub != null)
            SizedBox(
              width: 240,
              child: TextField(
                controller: searchController,
                onChanged: state.onFilterHubResources,
                style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                decoration: kSearchDecoration('Search resources...'),
              ),
            ),
        ]),
      ),

      // ── Content ─────────────────────────────────────────────────
      Expanded(child: isRunning
          ? _HubsContent(state: state)
          : _OfflinePrompt(onStart: state.onToggleServer)),
    ]);
  }
}

class _HubsContent extends StatelessWidget {
  final DesktopState state;
  const _HubsContent({required this.state});

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Left: Hub list sidebar
      Container(
        width: 240,
        decoration: BoxDecoration(
          border: Border(right: BorderSide(color: kOutlineVariant)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('KNOWLEDGE HUBS', style: GoogleFonts.inter(
              fontSize: 10, fontWeight: FontWeight.bold,
              color: kOnSurfaceVariant, letterSpacing: 1.2)),
          ),
          Expanded(child: state.loadingHubs
              ? Center(child: CircularProgressIndicator(color: kPrimary))
              : state.hubs.isEmpty
                  ? _Empty(icon: LucideIcons.book, message: 'No hubs available')
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      itemCount: state.hubs.length,
                      itemBuilder: (_, i) {
                        final hub = state.hubs[i];
                        final isSelected = state.selectedHub?.id == hub.id;
                        return GestureDetector(
                          onTap: () => state.onSelectHub(hub),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            margin: const EdgeInsets.only(bottom: 2),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected ? kSurfaceVariant : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(children: [
                              Icon(LucideIcons.layers, size: 15,
                                color: isSelected ? kPrimary : kOnSurfaceVariant),
                              const SizedBox(width: 10),
                              Expanded(child: Text(hub.title,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? kPrimary : kOnSurface),
                                maxLines: 1, overflow: TextOverflow.ellipsis)),
                            ]),
                          ),
                        );
                      },
                    )),
        ]),
      ),

      // Right: Resources grid
      Expanded(child: state.selectedHub == null
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(LucideIcons.layers, color: kOnSurfaceVariant, size: 40),
              const SizedBox(height: 12),
              Text('Select a hub to view resources',
                style: GoogleFonts.inter(fontSize: 14, color: kOnSurfaceVariant)),
            ]))
          : state.loadingHubs
              ? Center(child: CircularProgressIndicator(color: kPrimary))
              : state.filteredResources.isEmpty
                  ? _Empty(icon: LucideIcons.folder_open, message: 'No resources in this hub')
                  : GridView.builder(
                      padding: const EdgeInsets.all(20),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 300,
                        mainAxisSpacing: 14, crossAxisSpacing: 14,
                        childAspectRatio: 1.1,
                      ),
                      itemCount: state.filteredResources.length,
                      itemBuilder: (_, i) => _ResourceCard(resource: state.filteredResources[i]),
                    )),
    ]);
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
            ),
            child: Text('#$t', style: GoogleFonts.inter(
              fontSize: 9, fontWeight: FontWeight.w500, color: kPrimary)),
          )).toList()),
        ],
      ]),
    );
  }
}

class _OfflinePrompt extends StatelessWidget {
  final VoidCallback onStart;
  const _OfflinePrompt({required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Center(child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(LucideIcons.book_open, color: kOnSurfaceVariant.withValues(alpha: 0.4), size: 48),
        const SizedBox(height: 16),
        Text('Knowledge Hub Offline', style: GoogleFonts.outfit(
          fontSize: 18, fontWeight: FontWeight.bold, color: kOnSurface)),
        const SizedBox(height: 8),
        Text('Start the local sharing backend to load resources.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: onStart,
          style: FilledButton.styleFrom(
            backgroundColor: kPrimary, foregroundColor: kSurface,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          icon: const Icon(LucideIcons.play, size: 14),
          label: Text('Start Backend', style: GoogleFonts.inter(
            fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ]),
    ));
  }
}

class _Empty extends StatelessWidget {
  final IconData icon;
  final String message;
  const _Empty({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: kOnSurfaceVariant.withValues(alpha: 0.4), size: 32),
        const SizedBox(height: 10),
        Text(message, style: GoogleFonts.inter(
          fontSize: 13, color: kOnSurfaceVariant)),
      ]),
    );
  }
}
