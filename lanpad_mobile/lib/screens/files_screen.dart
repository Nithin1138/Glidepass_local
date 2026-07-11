import 'dart:io';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/connection_service.dart';
import '../services/websocket_service.dart';
import '../models/file_model.dart';
import '../widgets/nebula_background.dart';
import '../widgets/glassmorphic_card.dart';
import '../widgets/animated_button.dart';
import '../config/theme.dart';

class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  final ApiService _apiService = ApiService();
  final ConnectionService _connectionService = ConnectionService();
  final WebSocketService _webSocketService = WebSocketService();

  List<SharedFile> _files = [];
  bool _isLoading = false;
  
  // Upload status variables
  bool _isUploading = false;
  String _uploadProgressName = '';
  double _uploadProgress = 0.0;
  String _uploadSpeed = '';
  String _uploadEta = '';

  String _transferMode = 'parallel'; // 'parallel' or 'inbox'
  Set<String> _downloadedFileNames = {};

  @override
  void initState() {
    super.initState();
    _loadDownloadedFiles();
    _loadFiles();
    _initWebSocket();
  }

  @override
  void dispose() {
    _webSocketService.disconnect();
    super.dispose();
  }

  void _initWebSocket() {
    final serverUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId;
    if (serverUrl != null && sid != null) {
      _webSocketService.connect(
        serverUrl,
        sid,
        onFilesChanged: (_) {
          _loadFiles();
        },
      );
    }
  }

  Future<void> _loadDownloadedFiles() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('downloaded_files') ?? [];
    setState(() {
      _downloadedFileNames = list.toSet();
    });
  }

  Future<void> _markFileDownloaded(String name) async {
    final prefs = await SharedPreferences.getInstance();
    _downloadedFileNames.add(name);
    await prefs.setStringList('downloaded_files', _downloadedFileNames.toList());
    setState(() {});
  }

  Future<void> _loadFiles() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final list = await _apiService.fetchFiles();
    setState(() {
      _files = list;
      _isLoading = false;
    });
  }

  Future<void> _pickAndUploadFile() async {
    final result = await FilePicker.platform.pickFiles();
    if (result != null && result.files.single.path != null) {
      final path = result.files.single.path!;
      final file = File(path);
      final filename = result.files.single.name;
      
      setState(() {
        _isUploading = true;
        _uploadProgressName = filename;
        _uploadProgress = 0.0;
      });

      final startTime = DateTime.now();

      try {
        final response = await _apiService.uploadFileDirect(
          file: file,
          filename: filename,
          mode: _transferMode,
          onProgress: (sent, total) {
            if (!mounted) return;
            final elapsed = DateTime.now().difference(startTime).inSeconds;
            double speedMbps = 0.0;
            if (elapsed > 0) {
              speedMbps = (sent * 8) / (elapsed * 1024 * 1024);
            }
            final progressPct = sent / total;
            
            setState(() {
              _uploadProgress = progressPct;
              _uploadSpeed = '${speedMbps.toStringAsFixed(1)} Mbps';
              if (speedMbps > 0) {
                final remainingBytes = total - sent;
                final etaSeconds = (remainingBytes * 8) / (speedMbps * 1024 * 1024);
                _uploadEta = '${etaSeconds.round()}s remaining';
              } else {
                _uploadEta = 'calculating...';
              }
            });
          },
        );

        if (response.statusCode == 200) {
          _showToast('Upload completed successfully!');
          _loadFiles();
        } else {
          _showToast('Upload failed: Status ${response.statusCode}', isError: true);
        }
      } catch (e) {
        _showToast('Upload failed: $e', isError: true);
      } finally {
        setState(() {
          _isUploading = false;
          _uploadProgressName = '';
          _uploadProgress = 0.0;
          _uploadSpeed = '';
          _uploadEta = '';
        });
      }
    }
  }

  Future<void> _downloadFile(SharedFile file) async {
    final baseUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId ?? '';
    final nameEncoded = Uri.encodeComponent(file.name);
    final url = Uri.parse('$baseUrl/api/files/download/$nameEncoded?sid=$sid');
    
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
      await _markFileDownloaded(file.name);
      _showToast('Starting file download...');
    } else {
      _showToast('Could not open download link', isError: true);
    }
  }

  Future<void> _deleteFile(SharedFile file) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0D0D10),
          surfaceTintColor: Colors.transparent,
          title: const Text('Delete File', style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold)),
          content: Text('Are you sure you want to remove "${file.name}" from the session?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: AppTheme.redStatus)),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      final success = await _apiService.deleteFile(file.name);
      if (success) {
        _showToast('File removed successfully');
        _loadFiles();
      } else {
        _showToast('Failed to delete file', isError: true);
      }
    }
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.redStatus : AppTheme.accentColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes <= 0) return "0 B";
    const suffixes = ["B", "KB", "MB", "GB", "TB"];
    var i = (log(bytes) / log(1024)).floor();
    return '${(bytes / pow(1024, i)).toStringAsFixed(2)} ${suffixes[i]}';
  }

  @override
  Widget build(BuildContext context) {
    final isLocal = _connectionService.isLocalConnection;

    return Scaffold(
      body: Stack(
        children: [
          const NebulaBackground(),
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(LucideIcons.arrowLeft, color: Colors.white70),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                          const Text(
                            'FILE TRANSFER',
                            style: TextStyle(
                              fontFamily: 'Outfit',
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: AppTheme.accentColor,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.refreshCw, color: AppTheme.accentColor, size: 18),
                        onPressed: _loadFiles,
                      ),
                    ],
                  ),
                ),
                
                // Slow connection warning banner
                if (!isLocal)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.accentColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.accentColor.withOpacity(0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(LucideIcons.alertTriangle, size: 14, color: AppTheme.accentColor),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Connection is slow. Switch to LAN (50+MB/s)',
                            style: TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                
                // Mode Switch Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _transferMode = 'parallel'),
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 12,
                            borderColor: _transferMode == 'parallel' ? AppTheme.accentColor : null,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.zap, size: 14, color: _transferMode == 'parallel' ? AppTheme.accentColor : AppTheme.textMuted),
                                const SizedBox(width: 8),
                                Text(
                                  'Parallel Mode',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: _transferMode == 'parallel' ? Colors.white : AppTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _transferMode = 'inbox'),
                          child: GlassmorphicCard(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: 12,
                            borderColor: _transferMode == 'inbox' ? AppTheme.accentColor : null,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.inbox, size: 14, color: _transferMode == 'inbox' ? AppTheme.accentColor : AppTheme.textMuted),
                                const SizedBox(width: 8),
                                Text(
                                  'Inbox Mode',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: _transferMode == 'inbox' ? Colors.white : AppTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Dropzone card / file upload area
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: GestureDetector(
                    onTap: _pickAndUploadFile,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.02),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppTheme.borderColor,
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: const Column(
                        children: [
                          Icon(LucideIcons.uploadCloud, size: 36, color: AppTheme.accentColor),
                          SizedBox(height: 12),
                          Text(
                            'CHOOSE FILES TO SHARE',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Supports large files (5-10 GB+)',
                            style: TextStyle(fontSize: 9, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                // Upload Progress Indicator
                if (_isUploading)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: GlassmorphicCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  _uploadProgressName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                              Text(
                                '${(_uploadProgress * 100).toStringAsFixed(0)}%',
                                style: const TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: _uploadProgress,
                            backgroundColor: Colors.white12,
                            color: AppTheme.accentColor,
                            minHeight: 4,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_uploadSpeed, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                              Text(_uploadEta, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                
                // File List Header Label
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Text(
                    'DISCOVERED SHARED FILES (${_files.length})',
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 0.5),
                  ),
                ),
                
                // Files List view
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.accentColor))
                      : _files.isEmpty
                          ? const Center(
                              child: Text(
                                'No files shared this session.\nUpload a file above to start!',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4),
                              ),
                            )
                          : ListView.builder(
                              itemCount: _files.length,
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              itemBuilder: (context, index) {
                                final file = _files[index];
                                final isDownloaded = _downloadedFileNames.contains(file.name);
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.02),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isDownloaded
                                            ? const Color(0xFF00C853).withOpacity(0.4)
                                            : AppTheme.borderColor,
                                      ),
                                      boxShadow: isDownloaded
                                          ? [
                                              BoxShadow(
                                                color: const Color(0xFF00C853).withOpacity(0.05),
                                                blurRadius: 8,
                                              )
                                            ]
                                          : null,
                                    ),
                                    child: Row(
                                      children: [
                                        // File Icon Info
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      file.name,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.bold,
                                                        color: Colors.white,
                                                      ),
                                                    ),
                                                  ),
                                                  if (isDownloaded) ...[
                                                    const SizedBox(width: 6),
                                                    const Icon(LucideIcons.checkCircle2, color: Color(0xFF00C853), size: 14),
                                                  ],
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                _formatBytes(file.size),
                                                style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        // Actions Row: Download & Trash
                                        Row(
                                          children: [
                                            // Download
                                            GestureDetector(
                                              onTap: () => _downloadFile(file),
                                              child: Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: isDownloaded ? const Color(0x2600C853) : AppTheme.accentColor,
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Icon(
                                                  isDownloaded ? LucideIcons.check : LucideIcons.download,
                                                  size: 14,
                                                  color: isDownloaded ? const Color(0xFF00C853) : Colors.black,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            // Delete
                                            GestureDetector(
                                              onTap: () => _deleteFile(file),
                                              child: Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: AppTheme.redStatus.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(8),
                                                  border: Border.all(color: AppTheme.redStatus.withOpacity(0.2)),
                                                ),
                                                child: const Icon(
                                                  LucideIcons.trash2,
                                                  size: 14,
                                                  color: AppTheme.redStatus,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
