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
    
    return Column(children: [
      _FilesTopBar(state: state, searchController: searchController, onNavigate: onNavigate),
      Expanded(child: isRunning
          ? _FilesContent(state: state, query: query)
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
        border: Border(bottom: BorderSide(color: kOutlineVariant.withOpacity(0.35), width: 1)),
      ),
      child: Row(children: [
        Expanded(
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              Text('File Transfer Hub', style: GoogleFonts.outfit(
                fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
            ],
          ),
        ),
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
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 260),
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
  final String query;
  const _FilesContent({required this.state, required this.query});

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

  Widget _buildTransferModeSelector(BuildContext context) {
    final mode = state.transferMode;
    final isParallel = mode == 'parallel';

    return LayoutBuilder(
      builder: (context, constraints) {
        final totalWidth = constraints.maxWidth;
        final innerWidth = totalWidth - 8; // account for 4px padding on each side
        final tabWidth = innerWidth / 2;

        return Container(
          height: 48,
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: kSurfaceContainer,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: kOutlineVariant),
          ),
          child: Stack(
            children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOutCubic,
                left: isParallel ? 0 : tabWidth,
                width: tabWidth,
                height: 38,
                child: Container(
                  decoration: BoxDecoration(
                    color: kPrimary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: kPrimary.withValues(alpha: 0.3), width: 1),
                  ),
                ),
              ),
              Row(
                children: [
                  // LEFT: Parallel Mode
                  Expanded(
                    child: InkWell(
                      onTap: () => state.onToggleTransferMode('parallel'),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              LucideIcons.send,
                              color: isParallel ? kPrimary : kOnSurfaceVariant,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Parallel Mode',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isParallel ? kPrimary : kOnSurface,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '(Direct P2P)',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: kOnSurfaceVariant.withValues(alpha: isParallel ? 0.7 : 0.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // RIGHT: Inbox Mode
                  Expanded(
                    child: InkWell(
                      onTap: () => state.onToggleTransferMode('inbox'),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              LucideIcons.inbox,
                              color: !isParallel ? kPrimary : kOnSurfaceVariant,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Inbox Mode',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: !isParallel ? kPrimary : kOnSurface,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '(Session Share)',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: kOnSurfaceVariant.withValues(alpha: !isParallel ? 0.7 : 0.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isParallel = state.transferMode == 'parallel';

    // All files for stats
    final parallelFiles = state.files.where((f) => f.inbox == false).toList();
    final inboxFiles = state.files.where((f) => f.inbox == true).toList();

    // Only files for the active mode, filtered by search query
    final activeFiles = (isParallel ? parallelFiles : inboxFiles)
        .where((f) => f.name.toLowerCase().contains(query))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _buildTransferModeSelector(context),
        const SizedBox(height: 16),

        // TOP AREA: Drop zone is full width
        _DropZone(state: state),
        const SizedBox(height: 24),

        // BOTTOM AREA: Row with File List (left, wider) and Stats (right, narrower)
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left column: Files list taking most width
            Expanded(
              flex: 6,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isParallel ? LucideIcons.send : LucideIcons.inbox,
                        color: kPrimary, size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isParallel ? 'Parallel Files' : 'Inbox Files',
                        style: GoogleFonts.outfit(
                          fontSize: 15, fontWeight: FontWeight.bold, color: kOnSurface),
                      ),
                      const SizedBox(width: 10),
                      if (activeFiles.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: kSurfaceVariant,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('${activeFiles.length}', style: GoogleFonts.inter(
                            fontSize: 11, color: kOnSurface, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (state.loadingFiles)
                    Center(child: CircularProgressIndicator(color: kPrimary))
                  else if (activeFiles.isEmpty)
                    _Empty(
                      icon: LucideIcons.folder_open,
                      message: isParallel
                          ? 'No parallel files shared yet'
                          : 'No inbox files waiting',
                    )
                  else
                    Column(
                      children: activeFiles.map((f) => _FileRow(
                        file: f,
                        isDownloaded: state.downloadedFileNames.contains(f.name),
                        onDownload: () => state.onDownloadFile(f),
                        onDelete: () => state.onDeleteFile(f),
                        formatBytes: state.formatBytes,
                      )).toList(),
                    ),

                  // --- Remote Hubs (only in Parallel mode) ---
                  if (isParallel && state.connectedRemoteHubs.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    ...state.connectedRemoteHubs.map((hub) {
                      final hubName = hub['name'] ?? hub['url'];
                      final List<SharedFile> hubFiles = (hub['files'] as List?)?.cast<SharedFile>() ?? [];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(LucideIcons.globe, size: 16, color: kPrimary),
                              const SizedBox(width: 8),
                              Text(
                                'Remote: $hubName'.toUpperCase(),
                                style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: kPrimary,
                                ),
                              ),
                              const Spacer(),
                              TextButton.icon(
                                onPressed: () => state.onDisconnectRemoteHub(hub['url']),
                                icon: Icon(LucideIcons.unplug, size: 14, color: kError),
                                label: Text('Disconnect',
                                    style: GoogleFonts.inter(color: kError, fontSize: 12, fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (hubFiles.isEmpty)
                            _Empty(icon: LucideIcons.folder_open, message: 'No files on remote device')
                          else
                            Column(
                              children: hubFiles.map((f) => _FileRow(
                                file: f,
                                isDownloaded: false,
                                onDownload: () => state.onDownloadFile(f,
                                    remoteUrl: hub['url'], remoteToken: hub['token']),
                                onDelete: () {},
                                formatBytes: state.formatBytes,
                                isRemote: true,
                              )).toList(),
                            ),
                          const SizedBox(height: 24),
                        ],
                      );
                    }),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 24),
            // Right column: Session Stats with decreased width (flex: 2)
            Expanded(
              flex: 2,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: kGlassCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('Session Stats', style: GoogleFonts.outfit(
                          fontSize: 13, fontWeight: FontWeight.bold, color: kOnSurface)),
                        const Spacer(),
                        if (state.files.isNotEmpty)
                          TextButton.icon(
                            style: TextButton.styleFrom(padding: EdgeInsets.zero),
                            onPressed: () => _showDeleteAllDialog(context),
                            icon: Icon(LucideIcons.trash_2, size: 11, color: kError),
                            label: Text('Clean',
                                style: GoogleFonts.inter(color: kError, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _Stat('Total Files', '${state.files.length}'),
                    Divider(color: kOutlineVariant, height: 10),
                    _Stat('Parallel P2P', '${parallelFiles.length}'),
                    Divider(color: kOutlineVariant, height: 10),
                    _Stat('Inbox Files', '${inboxFiles.length}'),
                    Divider(color: kOutlineVariant, height: 10),
                    _Stat('Downloaded',
                        '${state.files.where((f) => state.downloadedFileNames.contains(f.name)).length}'),
                    Divider(color: kOutlineVariant, height: 10),
                    _Stat('Total Size', state.files.isEmpty
                        ? '0 B'
                        : state.formatBytes(
                            state.files.fold<int>(0, (s, f) => s + f.size))),
                  ],
                ),
              ),
            ),
          ],
        ),
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
    return GestureDetector(
      onTap: state.isUploading ? null : state.onPickAndUpload,
      child: MouseRegion(
        cursor: state.isUploading ? SystemMouseCursors.basic : SystemMouseCursors.click,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          decoration: BoxDecoration(
            color: kSurfaceLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: state.isUploading
                  ? kSecondary.withValues(alpha: 0.5)
                  : kOutlineVariant.withValues(alpha: 0.5),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: state.isUploading
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.sync_rounded, color: kSecondary, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'TRANSFERRING...',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: kSecondary,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      state.uploadProgressName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: kOnSurface,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: state.uploadProgress,
                        minHeight: 4,
                        backgroundColor: kSurfaceVariant,
                        valueColor: AlwaysStoppedAnimation<Color>(kPrimary),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(state.uploadSpeed, style: GoogleFonts.inter(fontSize: 10, color: kOnSurfaceVariant)),
                        Text(state.uploadEta, style: GoogleFonts.inter(
                          fontSize: 10, color: kPrimary, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                )
              : Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: kPrimary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(LucideIcons.cloud_upload, color: kPrimary, size: 22),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Drag & drop files here to send',
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: kOnSurface,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Select files or folders from your computer to transfer',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: kOnSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        foregroundColor: kSurfaceLowest,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                      onPressed: state.onPickAndUpload,
                      child: Text(
                        'Browse Files',
                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: kOutlineVariant),
                        foregroundColor: kOnSurface,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: state.onPickFolder,
                      child: Text(
                        'Select Folder',
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
        ),
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
  final bool isRemote;

  const _FileRow({
    required this.file, required this.isDownloaded,
    required this.onDownload, required this.onDelete,
    required this.formatBytes,
    this.isRemote = false,
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
        if (!isRemote)
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
