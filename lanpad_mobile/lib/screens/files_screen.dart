import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/connection_service.dart';
import '../services/websocket_service.dart';
import '../models/file_model.dart';
import '../widgets/aurora_background.dart';
import '../widgets/liquid_glass_card.dart';
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
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _uploadProgressName = '';
  String _uploadSpeed = '';
  String _uploadEta = '';
  
  String _transferMode = 'parallel'; // 'parallel', 'inbox'
  final Set<String> _downloadedFileNames = {};

  @override
  void initState() {
    super.initState();
    _loadFiles();
    _loadDownloadedPrefs();
    _initWebSocket();
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  Future<void> _loadDownloadedPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('downloaded_files') ?? [];
    setState(() {
      _downloadedFileNames.addAll(list);
    });
  }

  Future<void> _markFileDownloaded(String name) async {
    final prefs = await SharedPreferences.getInstance();
    _downloadedFileNames.add(name);
    await prefs.setStringList('downloaded_files', _downloadedFileNames.toList());
    setState(() {});
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

  @override
  void dispose() {
    _webSocketService.disconnect();
    super.dispose();
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
    _triggerHaptic();
    final result = await FilePicker.platform.pickFiles(allowMultiple: true);
    if (result != null && result.files.isNotEmpty) {
      final totalFiles = result.files.length;
      int uploadedCount = 0;

      for (int i = 0; i < totalFiles; i++) {
        final fileInfo = result.files[i];
        if (fileInfo.path == null) continue;
        final path = fileInfo.path!;
        final file = File(path);
        final filename = fileInfo.name;
        
        final displayPrefix = '(${i + 1}/$totalFiles)';
        setState(() {
          _isUploading = true;
          _uploadProgressName = '$displayPrefix $filename';
          _uploadProgress = 0.0;
          _uploadSpeed = '';
          _uploadEta = '';
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
            uploadedCount++;
            // Increment files stats
            final prefs = await SharedPreferences.getInstance();
            final current = prefs.getInt('files_count') ?? 0;
            await prefs.setInt('files_count', current + 1);
          } else {
            _showToast('Failed to upload $filename: Status ${response.statusCode}', isError: true);
          }
        } catch (e) {
          _showToast('Failed to upload $filename: $e', isError: true);
        }
      }

      if (uploadedCount > 0) {
        _showToast('Successfully uploaded $uploadedCount of $totalFiles files!');
        _loadFiles();
      }

      setState(() {
        _isUploading = false;
        _uploadProgressName = '';
        _uploadProgress = 0.0;
        _uploadSpeed = '';
        _uploadEta = '';
      });
      _triggerHaptic();
    }
  }

  Future<void> _downloadFile(SharedFile file) async {
    _triggerHaptic();
    final baseUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId ?? '';
    final nameEncoded = Uri.encodeComponent(file.name);
    final url = Uri.parse('$baseUrl/api/files/download/$nameEncoded?sid=$sid');
    
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
      await _markFileDownloaded(file.name);
      _showToast('Starting file download...');
    } catch (e) {
      _showToast('Could not open download link', isError: true);
    }
  }

  Future<void> _deleteFile(SharedFile file) async {
    _triggerHaptic();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: context.bgColor,
          surfaceTintColor: Colors.transparent,
          title: Text('Delete File', style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold, color: context.textMain)),
          content: Text('Are you sure you want to remove "${file.name}" from the session?', style: TextStyle(color: context.textMain)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text('Cancel', style: TextStyle(color: context.textMuted)),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: AppTheme.redStatus, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      final success = await _apiService.deleteFile(file.name);
      if (success) {
        _showToast('File removed');
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
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
          const AuroraBackground(),
          
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
                      Text(
                        'FILE TRANSFER',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                          color: AppTheme.accentColor,
                        ),
                      ),
                      IconButton(
                        icon: Icon(LucideIcons.refresh_cw, color: AppTheme.accentColor, size: 20),
                        onPressed: _loadFiles,
                      ),
                    ],
                  ),
                ),
                
                // Slow connection warning banner
                if (!isLocal)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                    child: LiquidGlassCard(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                      borderRadius: 12,
                      isFlat: true,
                      liquidColor: AppTheme.redStatus.withOpacity(0.08),
                      borderColor: AppTheme.redStatus.withOpacity(0.25),
                      child: Row(
                        children: [
                          Icon(LucideIcons.triangle_alert, size: 14, color: AppTheme.redStatus),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Connection is slow. Switch to LAN (50+MB/s)',
                              style: TextStyle(fontSize: 10, color: AppTheme.redStatus, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                
                // Transfer Mode Swapping Buttons
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      _buildTransferModeButton('parallel', LucideIcons.zap, 'Parallel Mode'),
                      const SizedBox(width: 12),
                      _buildTransferModeButton('inbox', LucideIcons.inbox, 'Inbox Mode'),
                    ],
                  ),
                ),
                
                // Upload Zone / Progress Card
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: LiquidGlassCard(
                    isFlat: false,
                    child: _isUploading
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'SHARING FILE...',
                                style: TextStyle(fontFamily: 'Outfit', fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accentColor),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _uploadProgressName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textMain),
                              ),
                              const SizedBox(height: 12),
                              // Linear progress indicator
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: LinearProgressIndicator(
                                  value: _uploadProgress,
                                  minHeight: 6,
                                  backgroundColor: Colors.white.withOpacity(0.1),
                                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.accentColor),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _uploadSpeed,
                                    style: TextStyle(fontSize: 10, color: context.textMuted),
                                  ),
                                  Text(
                                    _uploadEta,
                                    style: TextStyle(fontSize: 10, color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ],
                          )
                        : GestureDetector(
                            onTap: _pickAndUploadFile,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.01),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: context.borderColor,
                                  style: BorderStyle.solid,
                                ),
                              ),
                              child: Column(
                                children: [
                                  Icon(LucideIcons.cloud_upload, size: 36, color: AppTheme.accentColor),
                                  const SizedBox(height: 12),
                                  Text(
                                    'CHOOSE FILES TO SHARE',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: context.textMain, letterSpacing: 0.5),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Supports large files (5-10 GB+)',
                                    style: TextStyle(fontSize: 9, color: context.textMuted),
                                  ),
                                ],
                              ),
                            ),
                          ),
                  ),
                ),
                
                // Shared Files List
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: _isLoading
                        ? Center(
                            child: CircularProgressIndicator(color: AppTheme.accentColor),
                          )
                        : _files.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(LucideIcons.inbox, size: 40, color: context.textMuted),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No shared files in this session',
                                      style: TextStyle(color: context.textMuted, fontSize: 13),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.only(bottom: 140), // padding to clear bottom navigation bar
                                itemCount: _files.length,
                                itemBuilder: (context, index) {
                                  final file = _files[index];
                                  final isDownloaded = _downloadedFileNames.contains(file.name);
                                  
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12.0),
                                    child: LiquidGlassCard(
                                      isFlat: false,
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                      child: Row(
                                        children: [
                                          Icon(LucideIcons.folder_up, color: AppTheme.accentColor, size: 24),
                                          const SizedBox(width: 14),
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
                                                        style: TextStyle(
                                                          fontSize: 13,
                                                          fontWeight: FontWeight.bold,
                                                          color: context.textMain,
                                                        ),
                                                      ),
                                                    ),
                                                    if (isDownloaded) ...[
                                                      const SizedBox(width: 6),
                                                      const Icon(LucideIcons.circle_check, color: Color(0xFF00C853), size: 14),
                                                    ],
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  _formatBytes(file.size),
                                                  style: TextStyle(fontSize: 10, color: context.textMuted),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          
                                          // Download & Trash actions
                                          Row(
                                            children: [
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
                                                    color: isDownloaded ? const Color(0xFF00C853) : Colors.white,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              GestureDetector(
                                                onTap: () => _deleteFile(file),
                                                child: Container(
                                                  padding: const EdgeInsets.all(8),
                                                  decoration: BoxDecoration(
                                                    color: AppTheme.redStatus.withOpacity(0.15),
                                                    borderRadius: BorderRadius.circular(8),
                                                    border: Border.all(color: AppTheme.redStatus.withOpacity(0.2)),
                                                  ),
                                                  child: const Icon(
                                                    LucideIcons.trash_2,
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
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransferModeButton(String modeValue, IconData icon, String label) {
    final isSelected = _transferMode == modeValue;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _triggerHaptic();
          setState(() => _transferMode = modeValue);
        },
        child: LiquidGlassCard(
          padding: const EdgeInsets.symmetric(vertical: 12),
          borderRadius: 12,
          borderColor: isSelected ? AppTheme.accentColor : null,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? AppTheme.accentColor : context.textMuted),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? context.textMain : context.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
