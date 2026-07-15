import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:archive/archive_io.dart';

import '../../services/server_service.dart';
import '../../services/tunnel_service.dart';
import '../../services/api_service.dart';
import '../../services/connection_service.dart';
import '../../services/websocket_service.dart';
import '../../models/file_model.dart';
import '../../models/history_model.dart';
import '../../models/resource_model.dart';

import 'desktop_state.dart';
import 'desktop_theme.dart';
import 'widgets/sidebar.dart';
import 'widgets/top_bar.dart';
import 'views/home_view.dart';
import 'views/files_view.dart';
import 'views/resources_view.dart';
import 'views/settings_view.dart';
import 'views/input_view.dart';
import 'views/setup_permissions_view.dart';
import 'views/file_previews_view.dart';
import 'views/onboarding_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Main desktop shell — owns all state and services,
/// delegates rendering to per-page view files.
class DesktopShell extends StatefulWidget {
  final bool hasAcceptedAgreement;
  const DesktopShell({super.key, this.hasAcceptedAgreement = true});

  @override
  State<DesktopShell> createState() => _DesktopShellState();
}

class _DesktopShellState extends State<DesktopShell> {
  // ── Services ──────────────────────────────────────────────────────
  final ServerService _serverService = ServerService();
  final TunnelService _tunnelService = TunnelService();
  final ApiService _apiService = ApiService();
  final WebSocketService _webSocketService = WebSocketService();
  final ConnectionService _connectionService = ConnectionService();

  late StreamSubscription _serverSub;
  late StreamSubscription _tunnelSub;

  // ── System Tray ───────────────────────────────────────────────────
  final SystemTray _systemTray = SystemTray();
  final Menu _menu = Menu();
  bool _trayInitialized = false;
  bool _isConnectedToLocalService = false;

  // ── Navigation ────────────────────────────────────────────────────
  DesktopView _currentView = DesktopView.home;

  // ── Network ───────────────────────────────────────────────────────
  bool _isDirectLan = true;
  String _localIp = 'Detecting...';

  // ── File state ────────────────────────────────────────────────────
  List<SharedFile> _files = [];
  bool _loadingFiles = false;
  List<HistoryItem> _history = [];
  bool _loadingHistory = false;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _uploadProgressName = '';
  String _uploadSpeed = '';
  String _uploadEta = '';
  final Set<String> _downloadedFileNames = {};
  final TextEditingController _fileSearchController = TextEditingController();

  // ── Hub / Resource state ──────────────────────────────────────────
  List<Hub> _hubs = [];
  bool _loadingHubs = false;
  Hub? _selectedHub;
  List<ResourceSnippet> _resources = [];
  List<ResourceSnippet> _filteredResources = [];
  final TextEditingController _hubSearchController = TextEditingController();

  // ── Misc ──────────────────────────────────────────────────────────
  bool _hasAccessibilityPermission = true;
  bool _hasAcceptedAgreement = true;
  Timer? _sessionTimer;
  int _sessionSeconds = 0;

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _serverSub = _serverService.onStatusChanged.listen((_) {
      setState(() {});
      _updateSystemTray();
      if (_serverService.isRunning) {
        if (!_isConnectedToLocalService) {
          _isConnectedToLocalService = true;
          _syncConnectionServiceAndStartWS();
        }
        _startSessionTimer();
      } else {
        if (_isConnectedToLocalService) {
          _isConnectedToLocalService = false;
          _webSocketService.disconnect();
        }
        _stopSessionTimer();
      }
    });
    _tunnelSub = _tunnelService.onStatusChanged.listen((_) {
      setState(() {});
      _updateSystemTray();
    });
    _fetchLocalIp();
    _initSystemTray();
    _loadDownloadedPrefs();

    if (_serverService.isRunning) {
      _isConnectedToLocalService = true;
      _syncConnectionServiceAndStartWS();
      _startSessionTimer();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAccessibility();
    });
  }

  @override
  void dispose() {
    _serverSub.cancel();
    _tunnelSub.cancel();
    _sessionTimer?.cancel();
    _fileSearchController.dispose();
    _hubSearchController.dispose();
    super.dispose();
  }

  // ─────────────────────────────────────────────────────────────────
  // Session timer
  // ─────────────────────────────────────────────────────────────────

  void _startSessionTimer() {
    _sessionTimer?.cancel();
    _sessionSeconds = 0;
    _sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _sessionSeconds++);
    });
  }

  void _stopSessionTimer() {
    _sessionTimer?.cancel();
    _sessionSeconds = 0;
  }

  String get _sessionTimeFormatted {
    final h = _sessionSeconds ~/ 3600;
    final m = (_sessionSeconds % 3600) ~/ 60;
    final s = _sessionSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:'
        '${m.toString().padLeft(2, '0')}:'
        '${s.toString().padLeft(2, '0')}';
  }

  // ─────────────────────────────────────────────────────────────────
  // System tray
  // ─────────────────────────────────────────────────────────────────

  Future<void> _initSystemTray() async {
    if (!Platform.isMacOS && !Platform.isWindows) return;
    try {
      await _systemTray.initSystemTray(
        title: 'LANpad',
        iconPath: Platform.isWindows ? 'assets/app_icon.ico' : 'assets/menubar_icon.png',
        isTemplate: true,
      );
      _trayInitialized = true;
      _updateSystemTray();
    } catch (e) {
      print('System tray init failed: $e');
    }
  }

  Future<void> _updateSystemTray() async {
    if (!_trayInitialized) return;
    final isRunning = _serverService.isRunning;
    await _menu.buildFrom([
      MenuItemLabel(label: 'Server Status: ${isRunning ? 'Running' : 'Offline'}', enabled: false),
      MenuSeparator(),
      MenuItemLabel(label: isRunning ? 'Stop Server' : 'Start Server',
        onClicked: (_) => _toggleServer()),
      MenuItemLabel(label: 'Show Dashboard', onClicked: (_) async {
        await windowManager.show();
        await windowManager.focus();
      }),
      MenuSeparator(),
      MenuItemLabel(label: 'Quit LANpad', onClicked: (_) => exit(0)),
    ]);
    await _systemTray.setContextMenu(_menu);
  }

  // ─────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────

  Future<void> _checkAccessibility() async {
    if (!Platform.isMacOS) return;
    const platform = MethodChannel('lanpad/system');
    try {
      final bool hasPermission = await platform.invokeMethod('checkAccessibility');
      setState(() => _hasAccessibilityPermission = hasPermission);
      if (!hasPermission) _showPermissionDialog();
    } catch (_) {}
  }

  Future<void> _requestAccessibility() async {
    const platform = MethodChannel('lanpad/system');
    try {
      await platform.invokeMethod('requestAccessibility');
    } catch (_) {}
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: kSurfaceContainer,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: kOutlineVariant),
        ),
        child: Container(
          width: 480,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(LucideIcons.shield_alert, color: kPrimary, size: 32),
                const SizedBox(width: 16),
                Expanded(child: Text('Accessibility Permission Needed',
                  style: GoogleFonts.outfit(
                    fontSize: 18, fontWeight: FontWeight.bold, color: kOnSurface))),
              ]),
              const SizedBox(height: 16),
              Text(
                'To auto-type text from your phone, macOS requires Accessibility permissions.\n\n'
                '1. Open System Settings → Privacy & Security → Accessibility\n'
                '2. Remove LANpad if already listed, then add it again\n'
                '3. Restart LANpad',
                style: GoogleFonts.inter(fontSize: 13, height: 1.6, color: kOnSurfaceVariant),
              ),
              const SizedBox(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text('Later', style: GoogleFonts.inter(color: kOnSurfaceVariant)),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary, foregroundColor: kSurfaceLowest),
                  onPressed: () async {
                    await _requestAccessibility();
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: Text('Open Settings',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Services & data
  // ─────────────────────────────────────────────────────────────────

  Future<void> _syncConnectionServiceAndStartWS() async {
    await _connectionService.connect('http://localhost:8000', _serverService.sessionToken);
    _initWebSocket();
    _loadFiles();
    _loadHistory();
    _loadHubs();
  }

  void _initWebSocket() {
    final serverUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId;
    if (serverUrl != null && sid != null) {
      _webSocketService.connect(serverUrl, sid, onFilesChanged: (_) => _loadFiles());
    }
  }

  Future<void> _loadDownloadedPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('downloaded_files') ?? [];
    setState(() => _downloadedFileNames.addAll(list));
  }

  Future<void> _markFileDownloaded(String name) async {
    final prefs = await SharedPreferences.getInstance();
    _downloadedFileNames.add(name);
    await prefs.setStringList('downloaded_files', _downloadedFileNames.toList());
    setState(() {});
  }

  Future<void> _loadFiles() async {
    if (!_serverService.isRunning) return;
    if (_files.isEmpty) setState(() => _loadingFiles = true);
    final list = await _apiService.fetchFiles();
    setState(() { _files = list; _loadingFiles = false; });
  }

  Future<void> _loadHistory() async {
    if (!_serverService.isRunning) return;
    if (_history.isEmpty) setState(() => _loadingHistory = true);
    final list = await _apiService.fetchHistory();
    setState(() { _history = list; _loadingHistory = false; });
  }

  Future<void> _loadHubs() async {
    if (!_serverService.isRunning) return;
    if (_hubs.isEmpty) setState(() => _loadingHubs = true);
    final list = await _apiService.fetchHubs();
    setState(() { _hubs = list; _loadingHubs = false; });
  }

  Future<void> _selectHub(Hub hub) async {
    setState(() { _selectedHub = hub; _loadingHubs = true; });
    final list = await _apiService.fetchResources(hub.id);
    setState(() { _resources = list; _filteredResources = list; _loadingHubs = false; });
  }

  void _filterHubResources(String query) {
    setState(() {
      _filteredResources = query.isEmpty
          ? _resources
          : _resources.where((r) =>
              r.title.toLowerCase().contains(query.toLowerCase()) ||
              r.content.toLowerCase().contains(query.toLowerCase())).toList();
    });
  }

  Future<void> _pickAndUploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(allowMultiple: true);
      if (result != null && result.files.isNotEmpty) {
        int uploadedCount = 0;
        for (int i = 0; i < result.files.length; i++) {
          final fileInfo = result.files[i];
          if (fileInfo.path == null) continue;
          final file = File(fileInfo.path!);
          final filename = fileInfo.name;
          setState(() {
            _isUploading = true;
            _uploadProgressName = '(${i + 1}/${result.files.length}) $filename';
            _uploadProgress = 0.0;
          });
          final startTime = DateTime.now();
          try {
            final response = await _apiService.uploadFileDirect(
              file: file, filename: filename, mode: 'parallel',
              onProgress: (sent, total) {
                final elapsed = DateTime.now().difference(startTime).inSeconds;
                final speedMbps = elapsed > 0 ? (sent * 8) / (elapsed * 1024 * 1024) : 0.0;
                setState(() {
                  _uploadProgress = sent / total;
                  _uploadSpeed = '${speedMbps.toStringAsFixed(1)} Mbps';
                  _uploadEta = speedMbps > 0
                      ? '${((total - sent) * 8 / (speedMbps * 1024 * 1024)).round()}s remaining'
                      : 'calculating...';
                });
              },
            );
            if (response.statusCode == 200) uploadedCount++;
            else _showToast('Failed to upload $filename', isError: true);
          } catch (e) {
            _showToast('Failed: $e', isError: true);
          }
        }
        if (uploadedCount > 0) {
          _showToast('Uploaded $uploadedCount files successfully!');
          _loadFiles();
        }
      }
    } catch (e) {
      _showToast('File picker error: $e', isError: true);
    } finally {
      setState(() { _isUploading = false; _uploadProgressName = ''; _uploadProgress = 0.0; });
    }
  }

  Future<void> _pickFolder() async {
    try {
      final String? selectedDirectory = await FilePicker.platform.getDirectoryPath();
      if (selectedDirectory != null) {
        final dir = Directory(selectedDirectory);
        final folderName = p.basename(selectedDirectory);
        final tempDir = await getTemporaryDirectory();
        final zipFilePath = p.join(tempDir.path, '$folderName.dir.zip');
        final zipFile = File(zipFilePath);
        if (zipFile.existsSync()) {
          zipFile.deleteSync();
        }
        
        setState(() {
          _isUploading = true;
          _uploadProgressName = 'Compressing folder: $folderName...';
          _uploadProgress = 0.0;
        });

        // Pure Dart folder compression
        final encoder = ZipFileEncoder();
        encoder.create(zipFilePath);
        await encoder.addDirectory(dir);
        encoder.close();

        if (zipFile.existsSync()) {
          setState(() {
            _uploadProgressName = '$folderName (Folder)';
            _uploadProgress = 0.0;
          });
          final startTime = DateTime.now();
          try {
            final response = await _apiService.uploadFileDirect(
              file: zipFile, filename: '$folderName.dir.zip', mode: 'parallel',
              onProgress: (sent, total) {
                final elapsed = DateTime.now().difference(startTime).inSeconds;
                final speedMbps = elapsed > 0 ? (sent * 8) / (elapsed * 1024 * 1024) : 0.0;
                setState(() {
                  _uploadProgress = sent / total;
                  _uploadSpeed = '${speedMbps.toStringAsFixed(1)} Mbps';
                  _uploadEta = speedMbps > 0
                      ? '${((total - sent) * 8 / (speedMbps * 1024 * 1024)).round()}s remaining'
                      : 'calculating...';
                });
              },
            );
            if (response.statusCode == 200) {
              _showToast('Uploaded folder "$folderName" successfully!');
              _loadFiles();
            } else {
              _showToast('Failed to upload folder', isError: true);
            }
          } catch (e) {
            _showToast('Failed to upload: $e', isError: true);
          } finally {
            try { zipFile.deleteSync(); } catch (_) {}
          }
        } else {
          _showToast('Folder compression failed', isError: true);
        }
      }
    } catch (e) {
      _showToast('Folder picker error: $e', isError: true);
    } finally {
      setState(() { _isUploading = false; _uploadProgressName = ''; _uploadProgress = 0.0; });
    }
  }

  Future<void> _deleteAllFiles() async {
    final filesCopy = List<SharedFile>.from(_files);
    if (filesCopy.isEmpty) return;
    int deletedCount = 0;
    for (final file in filesCopy) {
      try {
        final success = await _apiService.deleteFile(file.name);
        if (success) deletedCount++;
      } catch (e) {
        debugPrint('Error deleting ${file.name}: $e');
      }
    }
    _showToast('Deleted $deletedCount files successfully!');
    _loadFiles();
  }

  Future<void> _disconnectRemoteDevice(String deviceName) async {
    try {
      final success = await _apiService.disconnectDevice(deviceName);
      if (success) {
        _showToast('Disconnected device: $deviceName');
        await _serverService.refreshConnections();
        setState(() {});
      } else {
        _showToast('Failed to disconnect device', isError: true);
      }
    } catch (e) {
      _showToast('Error: $e', isError: true);
    }
  }

  Future<void> _downloadFile(SharedFile file) async {
    final baseUrl = _connectionService.serverUrl;
    final sid = _connectionService.sessionId ?? '';
    final url = Uri.parse('$baseUrl/api/files/download/${Uri.encodeComponent(file.name)}?sid=$sid');
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
      await _markFileDownloaded(file.name);
      _showToast('Starting download...');
    } catch (e) {
      _showToast('Could not open download link', isError: true);
    }
  }

  Future<void> _deleteFile(SharedFile file) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: kSurfaceContainer,
        title: Text('Delete File',
          style: GoogleFonts.outfit(color: kOnSurface, fontWeight: FontWeight.bold)),
        content: Text('Remove "${file.name}"?',
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
      final success = await _apiService.deleteFile(file.name);
      if (success) { _showToast('File removed'); _loadFiles(); }
      else _showToast('Failed to delete file', isError: true);
    }
  }

  void _showToast(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message, style: GoogleFonts.inter(
        color: isError ? kError : kOnSurface, fontWeight: FontWeight.w600)),
      backgroundColor: isError ? const Color(0xFF93000A) : kSurfaceContainer,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isError ? kError.withValues(alpha: 0.4) : kOutlineVariant),
      ),
    ));
  }

  String _formatBytes(int bytes) {
    if (bytes <= 0) return '0 B';
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    final i = (log(bytes) / log(1024)).floor();
    return '${(bytes / pow(1024, i)).toStringAsFixed(2)} ${suffixes[i]}';
  }

  Future<void> _fetchLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4, includeLinkLocal: false);
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('169.254')) {
            setState(() => _localIp = addr.address);
            return;
          }
        }
      }
    } catch (_) {}
    setState(() => _localIp = '127.0.0.1');
  }

  Future<void> _reconnectSession() async {
    _showToast('Reconnecting...');
    await _tunnelService.stopTunnel();
    await _serverService.stopServer();
    _webSocketService.disconnect();
    await _fetchLocalIp();
    await _serverService.startServer();
    await _tunnelService.startTunnel();
    if (_serverService.isRunning) await _syncConnectionServiceAndStartWS();
    setState(() {});
  }

  Future<void> _toggleServer() async {
    if (_serverService.isRunning) {
      await _serverService.stopServer();
      await _tunnelService.stopTunnel();
      _webSocketService.disconnect();
    } else {
      await _serverService.startServer();
      await _tunnelService.startTunnel();
      if (_serverService.isRunning) await _syncConnectionServiceAndStartWS();
    }
    setState(() {});
  }

  // ─────────────────────────────────────────────────────────────────
  // State builder
  // ─────────────────────────────────────────────────────────────────

  DesktopState _buildState() => DesktopState(
    serverService: _serverService,
    tunnelService: _tunnelService,
    apiService: _apiService,
    connectionService: _connectionService,
    webSocketService: _webSocketService,
    localIp: _localIp,
    isDirectLan: _isDirectLan,
    sessionTimeFormatted: _sessionTimeFormatted,
    files: _files,
    loadingFiles: _loadingFiles,
    isUploading: _isUploading,
    uploadProgress: _uploadProgress,
    uploadProgressName: _uploadProgressName,
    uploadSpeed: _uploadSpeed,
    uploadEta: _uploadEta,
    downloadedFileNames: _downloadedFileNames,
    history: _history,
    loadingHistory: _loadingHistory,
    hubs: _hubs,
    loadingHubs: _loadingHubs,
    selectedHub: _selectedHub,
    resources: _resources,
    filteredResources: _filteredResources,
    hasAccessibilityPermission: _hasAccessibilityPermission,
    onToggleServer: _toggleServer,
    onReconnect: _reconnectSession,
    onPickAndUpload: _pickAndUploadFile,
    onPickFolder: _pickFolder,
    onToggleLanMode: (val) => setState(() => _isDirectLan = val),
    onDownloadFile: _downloadFile,
    onDeleteFile: _deleteFile,
    onDeleteAllFiles: _deleteAllFiles,
    onSelectHub: _selectHub,
    onFilterHubResources: _filterHubResources,
    onRequestAccessibility: _requestAccessibility,
    onShowToast: _showToast,
    onDisconnectRemoteDevice: _disconnectRemoteDevice,
    formatBytes: _formatBytes,
  );

  // ─────────────────────────────────────────────────────────────────
  // Build
  // ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (!_hasAcceptedAgreement) {
      return OnboardingView(
        onAccept: () async {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool('has_accepted_agreement', true);
          setState(() => _hasAcceptedAgreement = true);
        },
      );
    }

    final state = _buildState();

    return Scaffold(
      backgroundColor: kSurface,
      body: Row(children: [
        // ── Sidebar ─────────────────────────────────────────────────
        DesktopSidebar(
          currentView: _currentView,
          onNavigate: (view) => setState(() => _currentView = view),
          state: state,
        ),

        // ── Main content ─────────────────────────────────────────────
        Expanded(
          child: Column(children: [
            DesktopTopBar(state: state),
            Expanded(child: _buildView(state)),
          ]),
        ),
      ]),
    );
  }

  Widget _buildView(DesktopState state) {
    switch (_currentView) {
      case DesktopView.home:
        return HomeView(state: state);
      case DesktopView.files:
        return FilesView(
          state: state, 
          searchController: _fileSearchController,
          onNavigate: (view) => setState(() => _currentView = view),
        );
      case DesktopView.resources:
        return ResourcesView(state: state, searchController: _hubSearchController);
      case DesktopView.history:
        return HomeView(state: state);
      case DesktopView.settings:
        return SettingsView(state: state);
      case DesktopView.input:
        return InputView(state: state);
      case DesktopView.terms:
        return SettingsView(state: state);
      case DesktopView.setupPermissions:
        return SetupPermissionsView(state: state);
      case DesktopView.connectionRecovery:
        return HomeView(state: state);
      case DesktopView.filePreviews:
        return FilePreviewsView(
          state: state,
          onNavigate: (view) => setState(() => _currentView = view),
        );
    }
  }
}
