import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import '../desktop_state.dart';
import '../desktop_theme.dart';
import '../../../models/file_model.dart';

/// File Transfer Hub — Stitch blueprint "Resources / File Transfer Hub" screen.
/// Drop zone at top, active file list below, session stats sidebar.
import '../widgets/sidebar.dart';

class FilesView extends StatelessWidget {
  final DesktopState state;
  final TextEditingController searchController;
  final ValueChanged<DesktopView>? onNavigate;

  const FilesView({
    super.key,
    required this.state,
    required this.searchController,
    this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;
    final query = searchController.text.trim().toLowerCase();
    final filtered = state.files
        .where((f) => f.name.toLowerCase().contains(query))
        .toList();

    return Column(children: [
      _FilesTopBar(state: state, searchController: searchController, onNavigate: onNavigate),
      Expanded(child: isRunning
          ? _FilesContent(state: state, filtered: filtered)
          : _OfflinePrompt(onStart: state.onToggleServer)),
    ]);
  }
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
class _FilesTopBar extends StatelessWidget {
  final DesktopState state;
  final TextEditingController searchController;
  final ValueChanged<DesktopView>? onNavigate;
  const _FilesTopBar({required this.state, required this.searchController, this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final isRunning = state.serverService.isRunning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
      ),
      child: Row(children: [
        Text('File Transfer Hub', style: GoogleFonts.outfit(
          fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
        if (isRunning) ...[
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: kSecondary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: kSecondary.withValues(alpha: 0.2)),
            ),
            child: Text('HIGH SPEED LINK', style: GoogleFonts.inter(
              fontSize: 10, color: kSecondary, letterSpacing: 0.8, fontWeight: FontWeight.bold)),
          ),
        ],
        const Spacer(),
        if (onNavigate != null) ...[
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: kPrimary,
              side: BorderSide(color: kOutlineVariant),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            icon: const Icon(LucideIcons.file_search, size: 14),
            label: Text('Transfer Previews', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
            onPressed: () => onNavigate!(DesktopView.filePreviews),
          ),
          const SizedBox(width: 12),
        ],
        SizedBox(
          width: 260,
          child: StatefulBuilder(
            builder: (context, setLocal) => TextField(
              controller: searchController,
              onChanged: (_) => setLocal(() {}),
              style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
              decoration: kSearchDecoration('Search files...'),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Tooltip(
          message: 'Refresh',
          child: InkWell(
            onTap: () => state.onShowToast('Refreshing files...'),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: EdgeInsets.all(8),
              child: Icon(LucideIcons.refresh_cw, color: kPrimary, size: 18),
            ),
          ),
        ),
      ]),
    );
  }
}

// ─── Content ──────────────────────────────────────────────────────────────────
class _FilesContent extends StatelessWidget {
  final DesktopState state;
  final List<SharedFile> filtered;
  const _FilesContent({required this.state, required this.filtered});

  void _showDeleteAllDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        final textController = TextEditingController();
        bool canDelete = false;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0F1216),
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: kOutlineVariant),
              ),
              title: Text('Confirm Delete All',
                  style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'This action will permanently delete all shared files from the session. This cannot be undone.',
                    style: GoogleFonts.inter(color: kOnSurfaceVariant, fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'To verify, please type the word DELETE below:',
                    style: GoogleFonts.inter(color: kOnSurface, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: textController,
                    onChanged: (val) {
                      setModalState(() {
                        canDelete = val.trim().toUpperCase() == 'DELETE';
                      });
                    },
                    style: GoogleFonts.inter(color: kOnSurface, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'DELETE',
                      hintStyle: GoogleFonts.inter(color: kOnSurfaceVariant.withOpacity(0.4)),
                      filled: true,
                      fillColor: kSurfaceContainer,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: kOutlineVariant),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: kOutlineVariant),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: kPrimary),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('Cancel', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kError,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: canDelete
                      ? () {
                          Navigator.of(context).pop();
                          state.onDeleteAllFiles();
                        }
                      : null,
                  child: Text('Delete All',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Drop zone / upload area
        _DropZone(state: state),
        const SizedBox(height: 24),

        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // File list
          Expanded(flex: 7, child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text('Shared Files', style: GoogleFonts.outfit(
                  fontSize: 16, fontWeight: FontWeight.bold, color: kOnSurface)),
                const SizedBox(width: 10),
                if (state.files.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: kSurfaceVariant,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('${state.files.length}', style: GoogleFonts.inter(
                      fontSize: 11, color: kOnSurface, fontWeight: FontWeight.bold)),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _showDeleteAllDialog(context),
                    icon: Icon(LucideIcons.trash_2, size: 14, color: kError),
                    label: Text('Delete All',
                      style: GoogleFonts.inter(color: kError, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ]),
              const SizedBox(height: 12),
              if (state.loadingFiles)
                Center(child: CircularProgressIndicator(color: kPrimary))
              else if (filtered.isEmpty)
                _Empty(icon: LucideIcons.folder_open, message: 'No files shared yet')
              else
                Column(children: filtered.map((f) => _FileRow(
                  file: f,
                  isDownloaded: state.downloadedFileNames.contains(f.name),
                  onDownload: () => state.onDownloadFile(f),
                  onDelete: () => state.onDeleteFile(f),
                  formatBytes: state.formatBytes,
                )).toList()),
            ],
          )),
          const SizedBox(width: 20),

          // Stats sidebar
          SizedBox(
            width: 220,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: kGlassCard,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Session Stats', style: GoogleFonts.outfit(
                  fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
                const SizedBox(height: 16),
                _Stat('Files Shared', '${state.files.length}'),
                Divider(color: kOutlineVariant, height: 20),
                _Stat('Downloaded', '${state.downloadedFileNames.length}'),
                Divider(color: kOutlineVariant, height: 20),
                _Stat('Total Size', state.files.isEmpty ? '0 B'
                  : state.formatBytes(state.files.fold<int>(0, (s, f) => s + f.size))),
              ]),
            ),
          ),
        ]),
      ]),
    );
  }
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
class _DropZone extends StatelessWidget {
  final DesktopState state;
  const _DropZone({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.isUploading) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: kSurfaceLowest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kSecondary.withValues(alpha: 0.5), width: 2),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.sync_rounded, color: kSecondary, size: 18),
            const SizedBox(width: 10),
            Text('TRANSFERRING...', style: GoogleFonts.inter(
              fontSize: 11, fontWeight: FontWeight.bold,
              color: kSecondary, letterSpacing: 1)),
          ]),
          const SizedBox(height: 10),
          Text(state.uploadProgressName, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: state.uploadProgress, minHeight: 6,
              backgroundColor: kSurfaceVariant,
              valueColor: AlwaysStoppedAnimation<Color>(kPrimary),
            ),
          ),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(state.uploadSpeed, style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
            Text(state.uploadEta, style: GoogleFonts.inter(
              fontSize: 11, color: kPrimary, fontWeight: FontWeight.bold)),
          ]),
        ]),
      );
    }

    return GestureDetector(
      onTap: state.onPickAndUpload,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 200),
        decoration: BoxDecoration(
          color: kSurfaceLowest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kOutlineVariant, width: 2),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const SizedBox(height: 40),
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: kPrimary.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(LucideIcons.cloud_upload, color: kPrimary, size: 28),
          ),
          const SizedBox(height: 16),
          Text('Drop files to send', style: GoogleFonts.outfit(
            fontSize: 22, fontWeight: FontWeight.w600, color: kOnSurface)),
          const SizedBox(height: 4),
          Text('Maximum file size: 10GB per transfer',
            style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: state.onPickAndUpload,
              child: Text('Browse Files',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            const SizedBox(width: 12),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: kOutlineVariant),
                foregroundColor: kOnSurface,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: state.onPickFolder,
              child: Text('Select Folder', style: GoogleFonts.inter(fontSize: 14)),
            ),
          ]),
          const SizedBox(height: 36),
        ]),
      ),
    );
  }
}

// ─── File Row ─────────────────────────────────────────────────────────────────
class _FileRow extends StatelessWidget {
  final SharedFile file;
  final bool isDownloaded;
  final VoidCallback onDownload;
  final VoidCallback onDelete;
  final String Function(int) formatBytes;

  const _FileRow({
    required this.file, required this.isDownloaded,
    required this.onDownload, required this.onDelete,
    required this.formatBytes,
  });

  @override
  Widget build(BuildContext context) {
    final isFolder = file.name.endsWith('.dir.zip');
    final displayName = isFolder ? file.name.replaceAll('.dir.zip', '') : file.name;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Row(children: [
        Container(
          width: 38, height: 38,
          decoration: BoxDecoration(
            color: kSurfaceLow, borderRadius: BorderRadius.circular(10),
            border: Border.all(color: kOutlineVariant),
          ),
          child: Icon(
            isFolder ? LucideIcons.folder : _fileIcon(file.name),
            color: isFolder ? const Color(0xFFF97316) : kOnSurfaceVariant,
            size: 18,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(displayName, style: GoogleFonts.inter(
            fontSize: 13, fontWeight: FontWeight.w600, color: kOnSurface),
            maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(formatBytes(file.size),
            style: GoogleFonts.inter(fontSize: 11, color: kOnSurfaceVariant)),
        ])),
        if (isDownloaded) ...[
          Icon(LucideIcons.circle_check, color: kSuccess, size: 15),
          const SizedBox(width: 6),
        ],
        IconButton(icon: Icon(LucideIcons.download, color: kPrimary, size: 16),
          onPressed: onDownload, tooltip: 'Download'),
        IconButton(icon: Icon(LucideIcons.trash_2, color: kOnSurfaceVariant, size: 16),
          onPressed: onDelete, tooltip: 'Delete'),
      ]),
    );
  }

  static IconData _fileIcon(String name) {
    final ext = name.split('.').last.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext)) return LucideIcons.image;
    if (['mp4', 'mov', 'avi', 'mkv'].contains(ext)) return LucideIcons.video;
    if (['mp3', 'wav', 'aac'].contains(ext)) return LucideIcons.music;
    if (['pdf'].contains(ext)) return LucideIcons.file_text;
    if (['zip', 'tar', 'gz', '7z'].contains(ext)) return LucideIcons.archive;
    return LucideIcons.file;
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat(this.label, this.value);

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant)),
      Text(value, style: GoogleFonts.outfit(
        fontSize: 14, fontWeight: FontWeight.bold, color: kOnSurface)),
    ],
  );
}

class _Empty extends StatelessWidget {
  final IconData icon;
  final String message;
  const _Empty({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: kOnSurfaceVariant, size: 36),
        const SizedBox(height: 12),
        Text(message, style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant)),
      ]),
    ),
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
      Text('Start the server to access files.',
        style: GoogleFonts.inter(fontSize: 14, color: kOnSurfaceVariant)),
      const SizedBox(height: 24),
      ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: kPrimary, foregroundColor: kSurfaceLowest,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: onStart,
        child: Text('Start Server',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
      ),
    ]),
  );
}
