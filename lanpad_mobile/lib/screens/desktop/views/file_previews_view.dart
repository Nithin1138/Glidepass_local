import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../desktop_theme.dart';
import '../desktop_state.dart';

import '../../../models/file_model.dart';
import 'package:intl/intl.dart';

import 'package:google_fonts/google_fonts.dart';
import '../widgets/sidebar.dart';

class FilePreviewsView extends StatefulWidget {
  final DesktopState state;
  final ValueChanged<DesktopView>? onNavigate;

  const FilePreviewsView({super.key, required this.state, this.onNavigate});

  @override
  State<FilePreviewsView> createState() => _FilePreviewsViewState();
}

class _FilePreviewsViewState extends State<FilePreviewsView> {
  SharedFile? _selectedFile;
  final Set<String> _selectedFileNames = {};

  String _currentFilter = 'All';
  final TextEditingController _searchController = TextEditingController();

  Map<String, dynamic>? _storageHealth;
  bool _isCleaningCache = false;

  final Map<String, Future<int>> _pdfInfoFutures = {};
  final Map<String, Future<String>> _textPreviewFutures = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    if (widget.state.allFiles.isNotEmpty) {
      _selectedFile = widget.state.allFiles.first;
    }
    _fetchStorage();
  }

  Future<void> _fetchStorage() async {
    final data = await widget.state.apiService.fetchStorageHealth();
    if (mounted) {
      setState(() {
        _storageHealth = data;
      });
    }
  }

  Future<void> _cleanCache() async {
    setState(() {
      _isCleaningCache = true;
    });
    await widget.state.apiService.cleanCache();
    await _fetchStorage();
    if (mounted) {
      setState(() {
        _isCleaningCache = false;
      });
    }
  }

  @override
  void didUpdateWidget(FilePreviewsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_selectedFile != null && !widget.state.allFiles.any((f) => f.name == _selectedFile!.name)) {
      _selectedFile = widget.state.allFiles.isNotEmpty ? widget.state.allFiles.first : null;
    } else if (widget.state.allFiles.isNotEmpty && _selectedFile == null) {
      _selectedFile = widget.state.allFiles.first;
    }
    if (widget.state.allFiles.length != oldWidget.state.allFiles.length) {
      _fetchStorage();
    }
  }

  List<SharedFile> get _filteredFiles {
    List<SharedFile> result = widget.state.allFiles;
    if (_currentFilter == 'Sent') {
      result = result.where((f) => !f.inbox).toList();
    } else if (_currentFilter == 'Received') {
      result = result.where((f) => f.inbox).toList();
    } else if (_currentFilter == 'Today') {
      final now = DateTime.now();
      result = result.where((f) {
        final d = DateTime.fromMillisecondsSinceEpoch((f.modified * 1000).round());
        return d.year == now.year && d.month == now.month && d.day == now.day;
      }).toList();
    } else if (_currentFilter == 'Older') {
      final now = DateTime.now();
      result = result.where((f) {
        final d = DateTime.fromMillisecondsSinceEpoch((f.modified * 1000).round());
        return !(d.year == now.year && d.month == now.month && d.day == now.day);
      }).toList();
    }

    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      result = result.where((f) => f.name.toLowerCase().contains(query)).toList();
    }
    
    return result;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: kOutlineVariant, width: 1)),
          ),
          child: Row(
            children: [
              if (widget.onNavigate != null) ...[
                IconButton(
                  icon: const Icon(Icons.arrow_back, size: 16),
                  onPressed: () => widget.onNavigate!(DesktopView.files),
                  tooltip: 'Back to Transfer Hub',
                  style: IconButton.styleFrom(
                    foregroundColor: kPrimary,
                    padding: const EdgeInsets.all(8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: kOutlineVariant),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Text('Transfer Previews', style: GoogleFonts.outfit(
                fontSize: 20, fontWeight: FontWeight.w600, color: kOnSurface)),
            ],
          ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 1000;

        final leftColumn = Column(
          children: [
            // Filter Row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: kOutlineVariant)),
              ),
              child: isNarrow
                  ? Row(
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: _buildFilterSelector(),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_selectedFileNames.isNotEmpty) ...[
                              IconButton(
                                tooltip: 'Delete Selected',
                                icon: Icon(Icons.delete_outline, size: 20, color: kError),
                                onPressed: () async {
                                  final count = _selectedFileNames.length;
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      backgroundColor: kSurfaceContainer,
                                      title: Text('Delete $count Files',
                                        style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
                                      content: Text('Remove $count selected files?',
                                        style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.of(ctx).pop(false),
                                          child: Text('Cancel', style: GoogleFonts.inter(color: kOnSurfaceVariant))),
                                        TextButton(
                                          onPressed: () => Navigator.of(ctx).pop(true),
                                          child: Text('Delete', style: GoogleFonts.inter(
                                            color: kError, fontWeight: FontWeight.bold))),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    final names = List<String>.from(_selectedFileNames);
                                    setState(() {
                                      _selectedFileNames.clear();
                                    });
                                    int successCount = 0;
                                    for (final name in names) {
                                      final success = await widget.state.apiService.deleteFile(name);
                                      if (success) successCount++;
                                    }
                                    widget.state.onShowToast('Removed $successCount files');
                                  }
                                },
                              ),
                              const SizedBox(width: 8),
                            ],
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 160),
                              child: TextField(
                                controller: _searchController,
                                onChanged: (_) => setState(() {}),
                                style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                                decoration: kSearchDecoration('Search...'),
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              onPressed: () {
                                setState(() {
                                  _currentFilter = 'All';
                                  _searchController.clear();
                                  _selectedFileNames.clear();
                                  _selectedFile = null;
                                  if (widget.state.allFiles.isNotEmpty) {
                                    _selectedFile = widget.state.allFiles.first;
                                  }
                                });
                              },
                              icon: const Icon(Icons.delete_sweep),
                              tooltip: 'Clear All Filters',
                            ),
                          ],
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: _buildFilterSelector(),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          children: [
                            if (_selectedFileNames.isNotEmpty) ...[
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  foregroundColor: kError,
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                ),
                                onPressed: () async {
                                  final count = _selectedFileNames.length;
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      backgroundColor: kSurfaceContainer,
                                      title: Text('Delete $count Files',
                                        style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
                                      content: Text('Remove $count selected files?',
                                        style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.of(ctx).pop(false),
                                          child: Text('Cancel', style: GoogleFonts.inter(color: kOnSurfaceVariant))),
                                        TextButton(
                                          onPressed: () => Navigator.of(ctx).pop(true),
                                          child: Text('Delete', style: GoogleFonts.inter(
                                            color: kError, fontWeight: FontWeight.bold))),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    final names = List<String>.from(_selectedFileNames);
                                    setState(() {
                                      _selectedFileNames.clear();
                                    });
                                    int successCount = 0;
                                    for (final name in names) {
                                      final success = await widget.state.apiService.deleteFile(name);
                                      if (success) successCount++;
                                    }
                                    widget.state.onShowToast('Removed $successCount files');
                                  }
                                },
                                icon: Icon(Icons.delete_outline, size: 16, color: kError),
                                label: Text('Delete (${_selectedFileNames.length})', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12)),
                              ),
                              const SizedBox(width: 8),
                            ],
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 200),
                              child: TextField(
                                controller: _searchController,
                                onChanged: (_) => setState(() {}),
                                style: GoogleFonts.inter(fontSize: 13, color: kOnSurface),
                                decoration: kSearchDecoration('Search files...'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: () {
                                setState(() {
                                  _currentFilter = 'All';
                                  _searchController.clear();
                                  _selectedFileNames.clear();
                                  _selectedFile = null;
                                  if (widget.state.allFiles.isNotEmpty) {
                                    _selectedFile = widget.state.allFiles.first;
                                  }
                                });
                              },
                              icon: const Icon(Icons.delete_sweep),
                              tooltip: 'Clear All Filters',
                            ),
                          ],
                        ),
                      ],
                    ),
            ),
            // Transfer List
            Expanded(
              child: widget.state.loadingFiles
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredFiles.isEmpty
                      ? Center(child: Text('No files available', style: kBodyMd.copyWith(color: kOnSurfaceVariant)))
                      : ListView(
                          padding: const EdgeInsets.all(24),
                          children: [
                            _buildTableRowHeader(),
                            const SizedBox(height: 8),
                            ..._filteredFiles.map((file) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: InkWell(
                                  onTap: () => setState(() => _selectedFile = file),
                                  borderRadius: BorderRadius.circular(8),
                                  child: _buildTableRow(file, _selectedFile?.name == file.name),
                                ),
                              );
                            }),
                          ],
                        ),
            ),
          ],
        );

        final rightColumn = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Preview Card
            if (_selectedFile != null)
              Container(
                decoration: BoxDecoration(
                  color: kSurfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('File Preview', style: kHeadlineMd.copyWith(fontSize: 18)),
                          Row(
                            children: [
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                icon: const Icon(Icons.fullscreen, size: 20),
                                tooltip: 'Open Reading Mode',
                                onPressed: () => _showReadingMode(_selectedFile!),
                              ),
                              const SizedBox(width: 12),
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                icon: const Icon(Icons.close, size: 18),
                                onPressed: () {
                                  setState(() {
                                    _selectedFile = null;
                                  });
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Divider(height: 1, color: kOutlineVariant),
                    Container(
                      height: 256,
                      width: double.infinity,
                      color: kSurfaceVariant,
                      child: Center(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (Widget child, Animation<double> animation) {
                            final offsetAnimation = Tween<Offset>(
                              begin: const Offset(1.0, 0.0),
                              end: Offset.zero,
                            ).animate(CurvedAnimation(parent: animation, curve: Curves.easeInOutCubic));
                            return SlideTransition(
                              position: offsetAnimation,
                              child: child,
                            );
                          },
                          child: Container(
                            key: ValueKey<String>(_selectedFile!.name),
                            child: _buildFilePreviewWidget(_selectedFile!),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_selectedFile!.name, style: kBodyMd.copyWith(fontWeight: FontWeight.bold, fontFamily: 'Geist', color: kOnSurface)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.download, size: 20),
                            onPressed: () {
                              widget.state.onDownloadFile(_selectedFile!);
                            },
                            tooltip: 'Download',
                          ),
                          IconButton(
                            icon: const Icon(Icons.share, size: 20),
                            onPressed: () async {
                              await widget.state.apiService.shareFile(_selectedFile!.name);
                              final url = '${widget.state.connectionService.serverUrl}/api/files/download/${Uri.encodeComponent(_selectedFile!.name)}?sid=${widget.state.connectionService.sessionId}';
                              Clipboard.setData(ClipboardData(text: url));
                              widget.state.onShowToast('Share link copied to clipboard');
                              if (widget.onNavigate != null) {
                                widget.onNavigate!(DesktopView.files);
                              }
                            },
                            tooltip: 'Share & Redirect',
                          ),
                          IconButton(
                            icon: Icon(Icons.delete_outline, size: 20, color: kError),
                            onPressed: () async {
                              await widget.state.onDeleteFile(_selectedFile!);
                            },
                            tooltip: 'Delete File',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text('Select a file to view details', style: kBodyMd.copyWith(color: kOnSurfaceVariant)),
                ),
              ),
            const SizedBox(height: 24),
            // Storage Health Card
            Builder(
              builder: (context) {
                double diskTotal = 1.0;
                double diskUsed = 0.0;
                double diskFree = 0.0;
                double cacheSize = 0.0;
                
                if (_storageHealth != null && _storageHealth!['status'] == 'success') {
                  diskTotal = (_storageHealth!['disk_total'] ?? 1.0).toDouble();
                  diskUsed = (_storageHealth!['disk_used'] ?? 0.0).toDouble();
                  diskFree = (_storageHealth!['disk_free'] ?? 0.0).toDouble();
                  cacheSize = (_storageHealth!['cache_size'] ?? 0.0).toDouble();
                }

                String formatBytes(double bytes) {
                  if (bytes < 1024) return '${bytes.toStringAsFixed(0)} B';
                  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
                  if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
                  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
                }

                final healthPercent = diskTotal > 0 ? (diskFree / diskTotal * 100).clamp(0.0, 100.0) : 100.0;
                final diskRatio = diskTotal > 0 ? (diskUsed / diskTotal).clamp(0.0, 1.0) : 0.0;
                
                final maxCache = 10.0 * 1024 * 1024 * 1024;
                final cacheRatio = (cacheSize / maxCache).clamp(0.0, 1.0);

                return Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: kSurfaceContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.storage, color: kSecondary),
                              const SizedBox(width: 8),
                              Text('Storage Health', style: kHeadlineMd.copyWith(fontSize: 16)),
                            ],
                          ),
                          Text('${healthPercent.toStringAsFixed(0)}% Health', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildProgressBar('Local Drive', '${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}', diskRatio, kPrimary),
                      const SizedBox(height: 12),
                      _buildProgressBar('LANpad Cache', '${formatBytes(cacheSize)} / 10 GB', cacheRatio, kSecondary),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Icon(Icons.info, size: 14, color: kTertiary),
                          const SizedBox(width: 8),
                          Expanded(child: Text('Cache automatically clears files older than 48h.', style: kLabelMd.copyWith(color: kOnSurfaceVariant))),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _isCleaningCache ? null : _cleanCache,
                          child: _isCleaningCache 
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) 
                              : const Text('Clean Cache'),
                        ),
                      ),
                    ],
                  ),
                );
              }
            ),
          ],
        );

        if (isNarrow) {
          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 380,
                  child: leftColumn,
                ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: rightColumn,
                ),
              ],
            ),
          );
        } else {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left Column
              Expanded(child: leftColumn),
              // Right Column
              Container(
                width: 320,
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: kOutlineVariant)),
                  color: kSurfaceLow,
                ),
                padding: const EdgeInsets.all(16),
                child: SingleChildScrollView(
                  child: rightColumn,
                ),
              ),
            ],
          );
        }
      },
    ),
  ),
],
);
}  void _showReadingMode(SharedFile file) {
    showDialog(
      context: context,
      builder: (context) => _ReadingModeDialog(
        file: file,
        previewWidgetBuilder: (context, isFS) => _buildFilePreviewWidget(file, isFullScreen: isFS),
      ),
    );
  }

  Widget _buildFilterSelector() {
    final filters = ['All', 'Sent', 'Received', 'Today', 'Older'];
    final activeIndex = filters.indexOf(_currentFilter);
    const itemWidth = 84.0;
    const itemHeight = 34.0;

    return Container(
      height: itemHeight + 8,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: kSurfaceContainer,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOutCubic,
            left: activeIndex >= 0 ? activeIndex * itemWidth : 0,
            top: 0,
            bottom: 0,
            width: itemWidth,
            child: Container(
              decoration: BoxDecoration(
                color: kPrimary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: kPrimary.withOpacity(0.3), width: 1),
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: filters.map((text) {
              final active = _currentFilter == text;
              return SizedBox(
                width: itemWidth,
                height: itemHeight,
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _currentFilter = text;
                      _selectedFile = null;
                      if (_filteredFiles.isNotEmpty) {
                        _selectedFile = _filteredFiles.first;
                      }
                    });
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Center(
                    child: Text(
                      text,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: active ? FontWeight.bold : FontWeight.normal,
                        color: active ? kPrimary : kOnSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilePreviewWidget(SharedFile file, {bool isFullScreen = false}) {
    final ext = file.name.split('.').last.toLowerCase();
    final isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext);
    
    if (isImage) {
      final url = '${widget.state.connectionService.serverUrl}/api/files/download/${Uri.encodeComponent(file.name)}?sid=${widget.state.connectionService.sessionId}';
      return Image.network(url, fit: BoxFit.contain);
    }

    if (ext == 'pdf') {
      final future = _pdfInfoFutures.putIfAbsent(file.name, () => widget.state.apiService.fetchPdfInfo(file.name));
      return FutureBuilder<int>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final pageCount = snapshot.data ?? 0;
          if (pageCount == 0) {
            return const Center(child: Text('Failed to load PDF preview.'));
          }
          return Container(
            color: kSurfaceLow,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: pageCount,
              itemBuilder: (context, index) {
                final pageUrl = '${widget.state.connectionService.serverUrl}/api/files/pdf_page/${Uri.encodeComponent(file.name)}/$index?sid=${widget.state.connectionService.sessionId}';
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  elevation: 2,
                  child: Image.network(
                    pageUrl,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return SizedBox(
                        height: 300,
                        child: Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                : null,
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          );
        },
      );
    }

    final isTextOrDoc = ['doc', 'docx', 'txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'sh', 'bat'].contains(ext);

    if (isTextOrDoc) {
      final future = _textPreviewFutures.putIfAbsent(file.name, () => widget.state.apiService.fetchFileTextPreview(file.name));
      return FutureBuilder<String>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}', style: kBodyMd));
          }
          final text = snapshot.data ?? '';
          return Container(
            padding: const EdgeInsets.all(16),
            width: double.infinity,
            height: double.infinity,
            color: kSurfaceLow,
            alignment: Alignment.topLeft,
            child: SingleChildScrollView(
              child: SelectableText(
                text,
                style: GoogleFonts.firaCode(
                  fontSize: isFullScreen ? 14 : 12,
                  color: kOnSurface,
                ),
              ),
            ),
          );
        },
      );
    }
    
    IconData icon = Icons.insert_drive_file;
    Color color = kOnSurfaceVariant;
    if (['mp4', 'mov', 'avi', 'mkv'].contains(ext)) {
      icon = Icons.video_file;
      color = Colors.purpleAccent;
    } else if (['mp3', 'wav', 'ogg'].contains(ext)) {
      icon = Icons.audio_file;
      color = Colors.orangeAccent;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].contains(ext)) {
      icon = Icons.folder_zip;
      color = Colors.amber;
    }
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: isFullScreen ? 128 : 64, color: color),
        const SizedBox(height: 12),
        Text('.$ext', style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
      ],
    );
  }



  IconData _getFileIcon(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    if (['pdf'].contains(ext)) return Icons.picture_as_pdf_outlined;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext)) return Icons.image_outlined;
    if (['zip', 'rar', 'tar', 'gz', '7z', 'dmg'].contains(ext)) return Icons.archive_outlined;
    if (['txt', 'md', 'json', 'yaml', 'xml', 'csv', 'ini'].contains(ext)) return Icons.description_outlined;
    if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv'].contains(ext)) return Icons.movie_outlined;
    if (['mp3', 'wav', 'm4a', 'flac', 'ogg'].contains(ext)) return Icons.music_note_outlined;
    return Icons.insert_drive_file_outlined;
  }

  Color _getFileColor(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    if (['pdf'].contains(ext)) return kError;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].contains(ext)) return kSecondary;
    if (['zip', 'rar', 'tar', 'gz', '7z', 'dmg'].contains(ext)) return Colors.amber;
    if (['txt', 'md', 'json', 'yaml', 'xml', 'csv', 'ini'].contains(ext)) return kPrimary;
    if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv'].contains(ext)) return Colors.purple;
    if (['mp3', 'wav', 'm4a', 'flac', 'ogg'].contains(ext)) return Colors.orange;
    return kOnSurfaceVariant;
  }

  Widget _buildTableRowHeader() {
    final filtered = _filteredFiles;
    final allSelected = filtered.isNotEmpty && filtered.every((f) => _selectedFileNames.contains(f.name));

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            height: 32,
            child: Checkbox(
              value: allSelected,
              activeColor: kPrimary,
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    _selectedFileNames.addAll(filtered.map((f) => f.name));
                  } else {
                    _selectedFileNames.clear();
                  }
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(width: 50, child: Text('TYPE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 2, child: Text('FILE NAME', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 2, child: Text('SOURCE / DEST', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 1, child: Text('TRANSFER MODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 1, child: Text('SIZE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          Expanded(flex: 1, child: Text('TIME', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          SizedBox(width: 80, child: Text('STATUS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kOnSurfaceVariant))),
          SizedBox(width: 40),
        ],
      ),
    );
  }

  Widget _buildTableRow(SharedFile file, bool isSelected) {
    final date = DateTime.fromMillisecondsSinceEpoch((file.modified * 1000).toInt());
    final timeStr = DateFormat.MMMd().add_Hm().format(date);
    final sizeStr = '${(file.size / 1024 / 1024).toStringAsFixed(1)} MB';
    
    final isChecked = _selectedFileNames.contains(file.name);
    final iconData = _getFileIcon(file.name);
    final typeColor = _getFileColor(file.name);

    final kBodySm = kBodyMd.copyWith(fontSize: 12);
    final kLabelSm = kLabelMd.copyWith(fontSize: 10);

    return Container(
      decoration: BoxDecoration(
        color: isSelected ? kPrimary.withOpacity(0.05) : kSurfaceLow,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isSelected ? kPrimary.withOpacity(0.3) : Colors.transparent),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            height: 32,
            child: Checkbox(
              value: isChecked,
              activeColor: kPrimary,
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    _selectedFileNames.add(file.name);
                  } else {
                    _selectedFileNames.remove(file.name);
                  }
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 50,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Icon(iconData, color: typeColor, size: 16),
            ),
          ),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(file.name, style: kBodySm, overflow: TextOverflow.ellipsis),
                Text('Size: $sizeStr', style: kLabelSm.copyWith(color: kOnSurfaceVariant.withOpacity(0.5))),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    file.uploadedBy ?? (file.inbox ? 'Mobile Device' : (widget.state.serverService.deviceName.isNotEmpty ? widget.state.serverService.deviceName : 'Desktop')),
                    style: kBodySm,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward, size: 12, color: kOutlineVariant),
                const SizedBox(width: 4),
                Expanded(
                  child: Text('Hub', style: kBodySm, overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 1,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: file.inbox ? kPrimary.withOpacity(0.08) : kSecondary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  file.inbox ? 'INBOX' : 'PARALLEL',
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: file.inbox ? kPrimary : kSecondary,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(sizeStr, style: kBodySm.copyWith(fontFamily: 'Geist', color: kOnSurfaceVariant)),
          ),
          Expanded(
            flex: 1,
            child: Text(timeStr, style: kBodySm.copyWith(fontFamily: 'Geist', color: kOnSurfaceVariant)),
          ),
          SizedBox(
            width: 80,
            child: Row(
              children: [
                Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(color: kSecondary, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
                Text('SUCCESS', style: kLabelSm.copyWith(color: kSecondary)),
              ],
            ),
          ),
          SizedBox(width: 40, child: Icon(Icons.more_vert, size: 16, color: kOnSurfaceVariant)),
        ],
      ),
    );
  }

  Widget _buildDetailBox(String title, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kSurfaceLowest,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: kOutlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: kLabelMd.copyWith(color: kOnSurfaceVariant, fontSize: 10)),
          Text(value, style: kBodyMd.copyWith(fontFamily: 'Geist')),
        ],
      ),
    );
  }

  Widget _buildProgressBar(String title, String subtitle, double progress, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: kLabelMd),
            Text(subtitle, style: kLabelMd.copyWith(color: kOnSurfaceVariant)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: kSurfaceVariant,
          valueColor: AlwaysStoppedAnimation<Color>(color),
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
      ],
    );
  }
}

class _ReadingModeDialog extends StatefulWidget {
  final SharedFile file;
  final Widget Function(BuildContext, bool) previewWidgetBuilder;

  const _ReadingModeDialog({
    required this.file,
    required this.previewWidgetBuilder,
  });

  @override
  State<_ReadingModeDialog> createState() => _ReadingModeDialogState();
}

class _ReadingModeDialogState extends State<_ReadingModeDialog> {
  final TransformationController _transformationController = TransformationController();
  double _zoomLevel = 1.0;
  late final Widget _cachedPreview;

  void _zoom(double factor) {
    setState(() {
      final double newScale = (_zoomLevel * factor).clamp(0.8, 4.0);
      if (newScale == _zoomLevel) return;
      _zoomLevel = newScale;
      
      // Update matrix scale while preserving translation (pan)
      final matrix = _transformationController.value.clone();
      final double currentScale = matrix.getMaxScaleOnAxis();
      if (currentScale > 0) {
        final double scaleChange = _zoomLevel / currentScale;
        matrix.scale(scaleChange);
        _transformationController.value = matrix;
      }
    });
  }

  @override
  void initState() {
    super.initState();
    // Cache the preview widget once so zooming/setState doesn't rebuild/re-fetch it
    _cachedPreview = widget.previewWidgetBuilder(context, true);
  }

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      backgroundColor: kSurface,
      child: Scaffold(
        backgroundColor: kSurface,
        appBar: AppBar(
          backgroundColor: kSurfaceLow,
          title: Text(widget.file.name, style: kHeadlineMd.copyWith(fontSize: 16)),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.zoom_out),
              tooltip: 'Zoom Out',
              onPressed: () => _zoom(0.8),
            ),
            Center(
              child: Text(
                '${(_zoomLevel * 100).toStringAsFixed(0)}%',
                style: kLabelMd.copyWith(color: kOnSurfaceVariant),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.zoom_in),
              tooltip: 'Zoom In',
              onPressed: () => _zoom(1.2),
            ),
            IconButton(
              icon: const Icon(Icons.settings_backup_restore),
              tooltip: 'Reset Zoom',
              onPressed: () {
                setState(() {
                  _zoomLevel = 1.0;
                  _transformationController.value = Matrix4.identity();
                });
              },
            ),
            const SizedBox(width: 16),
          ],
        ),
        body: Container(
          color: Colors.black.withOpacity(0.03),
          child: InteractiveViewer(
            transformationController: _transformationController,
            minScale: 0.8,
            maxScale: 4.0,
            onInteractionUpdate: (details) {
              final scale = _transformationController.value.getMaxScaleOnAxis();
              if (scale != _zoomLevel) {
                setState(() {
                  _zoomLevel = scale;
                });
              }
            },
            child: Center(
              child: Container(
                width: 800,
                margin: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  color: kSurfaceContainer,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _cachedPreview,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

