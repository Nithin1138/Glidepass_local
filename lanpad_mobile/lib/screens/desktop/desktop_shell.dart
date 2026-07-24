import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
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
import '../../services/update_service.dart';
import '../../models/file_model.dart';
import '../../models/history_model.dart';
import '../../models/resource_model.dart';
import '../../config/theme.dart';
import '../../services/admin_service.dart';
import 'desktop_state.dart';
import 'desktop_theme.dart';
import 'widgets/sidebar.dart';
import 'widgets/top_bar.dart';
import 'views/activation_view.dart';
import 'views/home_view.dart';
import 'views/files_view.dart';
import 'views/resources_view.dart';
import 'views/settings_view.dart';
import 'views/input_view.dart';
import 'views/setup_permissions_view.dart';
import 'views/file_previews_view.dart';
import 'views/onboarding_view.dart';
import 'views/licenses_view.dart';

class ActiveToast {
  final String id;
  final String message;
  final bool isError;
  ActiveToast({required this.id, required this.message, this.isError = false});
}

/// Main desktop shell — owns all state and services,
/// delegates rendering to per-page view files.
class DesktopShell extends StatefulWidget {
  final bool hasAcceptedAgreement;
  const DesktopShell({super.key, this.hasAcceptedAgreement = true});

  @override
  State<DesktopShell> createState() => _DesktopShellState();
}

class _DesktopShellState extends State<DesktopShell> with WindowListener {
  // ── Services ──────────────────────────────────────────────────────
  final ServerService _serverService = ServerService();
  final TunnelService _tunnelService = TunnelService();
  final ApiService _apiService = ApiService();
  final WebSocketService _webSocketService = WebSocketService();
  final ConnectionService _connectionService = ConnectionService();
  final AdminService _adminService = AdminService();
  final List<ActiveToast> _activeToasts = [];

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

  // ── Other state ───────────────────────────────────────────────────
  List<SharedFile> _files = [];
  List<SharedFile> _allFiles = [];
  bool _loadingFiles = false;
  bool _isFilesHovered = false;
  List<HistoryItem> _history = [];
  bool _loadingHistory = false;

  // Remote Hub connections (Desktop to Desktop)
  List<Map<String, dynamic>> _connectedRemoteHubs = [];
  Timer? _remoteHubPollTimer;

  bool _isInit = false;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _uploadProgressName = '';
  String _uploadSpeed = '';
  String _uploadEta = '';
  final Set<String> _downloadedFileNames = {};
  final TextEditingController _fileSearchController = TextEditingController();
  String _transferMode = 'parallel'; // 'inbox' (upload to session) or 'parallel' (direct to device)

  // ── Hub / Resource state ──────────────────────────────────────────
  List<Hub> _hubs = [];
  bool _loadingHubs = false;
  Hub? _selectedHub;
  Category? _selectedCategory;
  Topic? _selectedTopic;
  String? _initialInputText;
  List<ResourceSnippet> _resources = [];
  List<ResourceSnippet> _filteredResources = [];
  final TextEditingController _hubSearchController = TextEditingController();

  // ── Misc ──────────────────────────────────────────────────────────
  bool _hasAccessibilityPermission = true;
  bool _isPermissionDialogOpen = false;
  bool _hasAcceptedAgreement = true;
  bool _isSidebarOpen = true;
  double _lastWidth = 0.0;
  Timer? _sessionTimer;
  int _sessionSeconds = 0;

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    DesktopThemeManager.instance.init().then((_) {
      if (mounted) setState(() {});
    });
    DesktopThemeManager.instance.addListener(_onThemeChanged);
    AppTheme.themeModeNotifier.addListener(_onThemeChanged);

    _serverSub = _serverService.onStatusChanged.listen((_) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) setState(() {});
        });
      }
      _updateSystemTray();
      if (_serverService.isServerReady) {
        _adminService.refresh(force: true);
        if (!_isConnectedToLocalService) {
          _isConnectedToLocalService = true;
          _syncConnectionServiceAndStartWS();
        }
        _startSessionTimer();
      } else if (!_serverService.isRunning) {
        if (_isConnectedToLocalService) {
          _isConnectedToLocalService = false;
          _webSocketService.disconnect();
        }
        _stopSessionTimer();
      }
    });
    _tunnelSub = _tunnelService.onStatusChanged.listen((_) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) setState(() {});
        });
      }
      _updateSystemTray();
    });
    _fetchLocalIp();
    _loadDownloadedPrefs();

    if (_serverService.isRunning) {
      _isConnectedToLocalService = true;
      _syncConnectionServiceAndStartWS();
      _startSessionTimer();
    } else {
      _serverService.startServer();
    }

    // ── Admin service: poll status + check updates ─────────────────
    _adminService.init(_apiService);
    _adminService.refresh(force: true);
    _adminService.updateInfo.addListener(_onUpdateInfoChanged);
    _adminService.status.addListener(_onAdminStatusChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      windowManager.addListener(this);
      _initSystemTray();
      _checkAccessibility();
    });

    _startMobileUploadPolling();
    _startRemoteHubPolling();
  }

  void _onThemeChanged() {
    if (mounted) setState(() {});
  }

  void _onAdminStatusChanged() {
    if (mounted) setState(() {});
  }

  Timer? _mobileUploadPollTimer;
  bool _isLocalUploadActive = false;

  void _startMobileUploadPolling() {
    _mobileUploadPollTimer = Timer.periodic(const Duration(milliseconds: 200), (timer) async {
      if (!_serverService.isRunning || _isLocalUploadActive) return;

      final res = await _apiService.fetchUploadProgress();
      if (res['active'] == true && mounted) {
        final modePrefix = res['mode'] == 'inbox' ? 'Receiving to Inbox' : 'Receiving';
        final filename = res['filename'] ?? 'Unknown';
        final copied = (res['written'] as num?)?.toDouble() ?? 0.0;
        final total = (res['size'] as num?)?.toDouble() ?? 1.0;
        final elapsed = DateTime.now().difference(
          DateTime.fromMillisecondsSinceEpoch(((res['start_time'] as num) * 1000).toInt())
        ).inSeconds;

        final speedMbps = elapsed > 0 ? (copied * 8) / (elapsed * 1024 * 1024) : 0.0;
        setState(() {
          _isUploading = true;
          _uploadProgressName = '$modePrefix: $filename';
          _uploadProgress = total > 0 ? copied / total : 0;
          _uploadSpeed = '${speedMbps.toStringAsFixed(1)} Mbps';
          _uploadEta = speedMbps > 0
              ? '${((total - copied) * 8 / (speedMbps * 1024 * 1024)).round()}s remaining'
              : 'calculating...';
        });
      } else if (_isUploading && !_isLocalUploadActive && mounted) {
        setState(() {
          _isUploading = false;
          _uploadProgressName = '';
          _uploadProgress = 0.0;
        });
        _loadFiles(); // Refresh files list when receiving completes
      }
    });
  }

  void _startRemoteHubPolling() {
    _remoteHubPollTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (_connectedRemoteHubs.isEmpty) return;
      bool changed = false;
      for (var i = 0; i < _connectedRemoteHubs.length; i++) {
        final hub = _connectedRemoteHubs[i];
        final url = hub['url'];
        final token = hub['token'];
        try {
          final res = await http.get(Uri.parse('$url/api/files/list?sid=$token&client_device=${Uri.encodeComponent(_serverService.deviceName)}')).timeout(const Duration(seconds: 3));
          if (res.statusCode == 200) {
            final data = jsonDecode(res.body);
            if (data['status'] == 'success') {
              final List<dynamic> fileList = data['files'] ?? [];
              final files = fileList.map((f) => SharedFile.fromJson(f)).toList();
              // Check if files changed
              if (jsonEncode(files) != jsonEncode(hub['files'])) {
                _connectedRemoteHubs[i]['files'] = files;
                changed = true;
              }
            }
          }
        } catch (_) {}
      }
      if (changed && mounted) {
        setState(() {}); // Trigger rebuild to update FilesView
      }
    });
  }

  String? _declinedUpdateVersion;
  bool _isUpdatePromptOpen = false;

  void _onUpdateInfoChanged() {
    final info = _adminService.updateInfo.value;
    if (info != null && info.updateAvailable) {
      if (_isUpdatePromptOpen || _declinedUpdateVersion == info.latestVersion) return;
      _promptUpdate(info);
    }
  }

  void _promptUpdate(UpdateInfo info) {
    if (!mounted) return;
    _isUpdatePromptOpen = true;

    showDialog(
      context: context,
      barrierDismissible: !info.forceUpdate,
      builder: (context) {
        return _UpdateDialog(
          info: info,
          onDecline: () {
            _declinedUpdateVersion = info.latestVersion;
            Navigator.pop(context);
            _isUpdatePromptOpen = false;
          },
        );
      },
    ).then((_) => _isUpdatePromptOpen = false);
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    _serverSub.cancel();
    _tunnelSub.cancel();
    _sessionTimer?.cancel();
    _fileSearchController.dispose();
    _hubSearchController.dispose();
    _adminService.updateInfo.removeListener(_onUpdateInfoChanged);
    _adminService.status.removeListener(_onAdminStatusChanged);
    _adminService.dispose();
    _mobileUploadPollTimer?.cancel();
    _remoteHubPollTimer?.cancel();
    DesktopThemeManager.instance.removeListener(_onThemeChanged);
    AppTheme.themeModeNotifier.removeListener(_onThemeChanged);
    super.dispose();
  }

  @override
  void onWindowClose() async {
    final status = _adminService.status.value;
    final needsActivation = status.isLoaded && 
                            status.monetizationEnabled && 
                            !status.freeEnabled &&
                            (status.tier == 'FREE' || status.tier == 'UNLICENSED');

    if (needsActivation) {
      _showToast("License is required to continue. Please activate.");
    } else {
      await windowManager.destroy();
    }
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
        title: '',
        iconPath: Platform.isWindows ? 'assets/app_icon.ico' : 'assets/menubar_icon.png',
        isTemplate: true,
      );
      _systemTray.registerSystemTrayEventHandler((eventName) {
        if (eventName == 'click' || eventName == 'rightClick') {
          _systemTray.popUpContextMenu();
        }
      });
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
      MenuItemLabel(label: 'Server Status: ${isRunning ? 'Running 🟢' : 'Offline 🔴'}', enabled: false),
      if (isRunning) ...[
        MenuSeparator(),
        MenuItemLabel(
          label: 'Connected Devices: ${_hubs.isNotEmpty ? '${_hubs.length} active' : 'None active'}', 
          enabled: false
        ),
        MenuItemLabel(
          label: 'Shared Files: ${_files.length} items', 
          enabled: false
        ),
        MenuSeparator(),
        MenuItemLabel(
          label: 'Send File...', 
          onClicked: (_) async {
            await windowManager.show();
            await windowManager.focus();
            if (mounted) {
              setState(() {
                _currentView = DesktopView.files;
              });
            }
          }
        ),
      ],
      MenuSeparator(),
      MenuItemLabel(label: isRunning ? 'Stop Server' : 'Start Server',
        onClicked: (_) => _toggleServer()),
      MenuItemLabel(label: 'Show Dashboard', onClicked: (_) async {
        await windowManager.show();
        await windowManager.focus();
      }),
      MenuItemLabel(label: 'About LANpad', onClicked: (_) {
        if (Platform.isMacOS) {
          Process.run('osascript', [
            '-e',
            'display dialog "LANpad — The Ultimate Cross-Device Clipboard\n\nExperience seamless, secure, and lightning-fast syncing across all your devices.\n\n\nCrafted with passion by Veera Nithin." with title "About LANpad" buttons {"Awesome!"} default button "Awesome!" with icon note'
          ]);
        }
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
    if (_isPermissionDialogOpen) return;
    _isPermissionDialogOpen = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: const Color(0xFF1E1E1E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        child: Container(
          width: 540,
          padding: const EdgeInsets.all(28),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFF2D8CFF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Center(
                  child: Icon(
                    LucideIcons.folder,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LANpad Needs Permissions',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'To auto-type text from your phone, macOS requires you to grant Accessibility permissions to LANpad.\n\n'
                      '1. Open System Settings -> Privacy & Security -> Accessibility.\n'
                      '2. IMPORTANT: If LANpad is already listed, you MUST remove it first (select it and click the - button).\n'
                      '3. Click the + button and add LANpad.app again.\n'
                      '4. Restart LANpad.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        height: 1.5,
                        color: Colors.white.withOpacity(0.75),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2D8CFF),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            elevation: 0,
                          ),
                          onPressed: () async {
                            await _requestAccessibility();
                            if (ctx.mounted) Navigator.of(ctx).pop();
                          },
                          child: Text(
                            'Open Settings',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF333333),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            elevation: 0,
                          ),
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: Text(
                            'Later',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ).then((_) => _isPermissionDialogOpen = false);
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
    final list = await _apiService.fetchFiles(showAll: false);
    final allList = await _apiService.fetchFiles(showAll: true);
    setState(() { 
      _files = list; 
      _allFiles = allList;
      _loadingFiles = false; 
    });
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

  Future<void> _selectHub(Hub? hub) async {
    if (hub == null) {
      setState(() {
        _selectedHub = null;
        _selectedCategory = null;
        _selectedTopic = null;
        _resources = [];
        _filteredResources = [];
      });
      return;
    }
    setState(() {
      _selectedHub = hub;
      _selectedCategory = null;
      _selectedTopic = null;
      _loadingHubs = true;
    });
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
            _isLocalUploadActive = true;
            _isUploading = true;
            _uploadProgressName = '(${i + 1}/${result.files.length}) $filename';
            _uploadProgress = 0.0;
          });
          final startTime = DateTime.now();
          try {
            final response = await _apiService.uploadFileDirect(
              file: file, filename: filename, mode: _transferMode,
              uploader: _serverService.deviceName.isNotEmpty ? _serverService.deviceName : 'Desktop',
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
      setState(() { _isUploading = false; _isLocalUploadActive = false; _uploadProgressName = ''; _uploadProgress = 0.0; });
    }
  }

  Future<void> _uploadDirectFile(String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) {
      _showToast('File not found: $filePath', isError: true);
      return;
    }
    final filename = file.path.replaceAll('\\', '/').split('/').last;
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
        uploader: _serverService.deviceName.isNotEmpty ? _serverService.deviceName : 'Desktop',
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
        _showToast('Uploaded $filename successfully!');
        _loadFiles();
      } else {
        _showToast('Failed to upload $filename', isError: true);
      }
    } catch (e) {
      _showToast('Failed: $e', isError: true);
    } finally {
      setState(() {
        _isUploading = false;
        _uploadProgressName = '';
        _uploadProgress = 0.0;
      });
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
          _isLocalUploadActive = true;
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
              file: zipFile, filename: '$folderName.dir.zip', mode: _transferMode,
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
      setState(() { _isUploading = false; _isLocalUploadActive = false; _uploadProgressName = ''; _uploadProgress = 0.0; });
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

  Future<String?> _connectToRemoteHub(String url, String sid) async {
    var targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'http://$targetUrl';
    }
    if (targetUrl.endsWith('/')) {
      targetUrl = targetUrl.substring(0, targetUrl.length - 1);
    }

    // Remove existing if any to allow fresh reconnect/code validation
    _connectedRemoteHubs.removeWhere((h) => h['url'] == targetUrl);

    try {
      final res = await http.get(Uri.parse('$targetUrl/api/connection/info?_t=${DateTime.now().millisecondsSinceEpoch}')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 'success') {
          if (data['session_code'] != sid) {
            throw 'Session Code Mismatch. Check the 6-digit code.';
          }
          final name = data['device_name'] ?? targetUrl;
          
          final filesRes = await http.get(Uri.parse('$targetUrl/api/files/list?sid=$sid')).timeout(const Duration(seconds: 5));
          List<SharedFile> initialFiles = [];
          if (filesRes.statusCode == 200) {
            final fData = jsonDecode(filesRes.body);
            if (fData['status'] == 'success') {
              initialFiles = (fData['files'] as List).map((f) => SharedFile.fromJson(f)).toList();
            }
          }

          setState(() {
            _connectedRemoteHubs.add({
              'url': targetUrl,
              'token': sid,
              'name': name,
              'files': initialFiles,
            });
            _currentView = DesktopView.files;
          });
          _showToast('Connected to $name');
          return null; // success
        } else {
          return data['message'] ?? 'Unknown error';
        }
      } else {
        return 'HTTP ${res.statusCode}';
      }
    } catch (e) {
      _showToast('Connection failed: $e', isError: true);
      return e.toString();
    }
  }

  void _disconnectRemoteHub(String url) {
    setState(() {
      _connectedRemoteHubs.removeWhere((h) => h['url'] == url);
    });
    _showToast('Disconnected remote hub');
  }

  Future<void> _downloadFile(SharedFile file, {String? remoteUrl, String? remoteToken}) async {
    final baseUrl = remoteUrl ?? _connectionService.serverUrl;
    final sid = remoteToken ?? _connectionService.sessionId ?? '';
    final url = Uri.parse('$baseUrl/api/files/download/${Uri.encodeComponent(file.name)}?sid=$sid');
    _showToast('Downloading "${file.name}"...');
    try {
      Directory? downloadsDir = await getDownloadsDirectory();
      downloadsDir ??= await getApplicationDocumentsDirectory();
      
      final savePath = p.join(downloadsDir.path, file.name);
      
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final localFile = File(savePath);
        await localFile.writeAsBytes(response.bodyBytes);
        
        await _markFileDownloaded(file.name);
        _showToast('Downloaded to: $savePath');
      } else {
        throw 'HTTP ${response.statusCode}';
      }
    } catch (e) {
      _showToast('Download failed: $e', isError: true);
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
    final id = DateTime.now().millisecondsSinceEpoch.toString() + message;
    setState(() {
      _activeToasts.add(ActiveToast(id: id, message: message, isError: isError));
    });
    Timer(const Duration(seconds: 4), () {
      if (mounted) {
        setState(() {
          _activeToasts.removeWhere((t) => t.id == id);
        });
      }
    });
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
    allFiles: _allFiles,
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
    isSidebarOpen: _isSidebarOpen,
    transferMode: _transferMode,
    onToggleTransferMode: (val) => setState(() => _transferMode = val),
    onToggleServer: _toggleServer,
    onReconnect: _reconnectSession,
    onPickAndUpload: _pickAndUploadFile,
    onPickFolder: _pickFolder,
    onToggleLanMode: (val) {
      setState(() => _isDirectLan = val);
      if (!val && _tunnelService.tunnelUrl == null && !_tunnelService.isConnecting) {
        _tunnelService.startTunnel();
      }
    },
    onDownloadFile: _downloadFile,
    onDeleteFile: _deleteFile,
    onDeleteAllFiles: _deleteAllFiles,
    onSelectHub: _selectHub,
    onFilterHubResources: _filterHubResources,
    onOpenSettings: () => setState(() => _currentView = DesktopView.settings),
    onToggleSidebar: () => setState(() => _isSidebarOpen = !_isSidebarOpen),
    onRequestAccessibility: _requestAccessibility,
    onShowToast: _showToast,
    onRefreshHistory: _loadHistory,
    onDisconnectRemoteDevice: _disconnectRemoteDevice,
    connectedRemoteHubs: _connectedRemoteHubs,
    onConnectToRemoteHub: _connectToRemoteHub,
    onDisconnectRemoteHub: _disconnectRemoteHub,
    onUploadFileDirect: _uploadDirectFile,
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
          _apiService.sendTelemetry('desktop_agreement_accepted');
        },
      );
    }

    final double currentWidth = MediaQuery.of(context).size.width;
    if (_lastWidth == 0.0) {
      _lastWidth = currentWidth;
      _isSidebarOpen = currentWidth >= 1050;
    } else if ((currentWidth < 1050 && _lastWidth >= 1050) || (currentWidth >= 1050 && _lastWidth < 1050)) {
      _isSidebarOpen = currentWidth >= 1050;
      _lastWidth = currentWidth;
    } else {
      _lastWidth = currentWidth;
    }

    final state = _buildState();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Positioned.fill(child: DesktopThemeBackground()),
          if (_serverService.hasCrashed)
            _DesktopCrashView(
              crashLog: _serverService.crashLog,
              onRetry: () {
                _serverService.startServer();
                setState(() {});
              },
            )
          else if (_adminService.status.value.isLoaded && 
                   _adminService.status.value.monetizationEnabled && 
                   !_adminService.status.value.freeEnabled &&
                   (_adminService.status.value.tier == 'FREE' || _adminService.status.value.tier == 'UNLICENSED'))
            ActivationView(
              state: state,
              onClose: () async {
                await windowManager.hide();
              },
            )
          else if (!_serverService.isServerReady)
            _DesktopSplashView(
              isStarting: _serverService.isStarting,
              onStart: () {
                _serverService.startServer();
                setState(() {});
              },
            )
          else
            Row(
              children: [
                // ── Sidebar ─────────────────────────────────────────────────
                DesktopSidebar(
                  currentView: _currentView,
                  onNavigate: (view) {
                    setState(() {
                      if (view != DesktopView.input) {
                        _initialInputText = null;
                      }
                      _currentView = view;
                    });
                  },
                  state: state,
                ),

                // ── Main content ─────────────────────────────────────────────
                Expanded(
                  child: Column(
                    children: [
                      DesktopTopBar(state: state),
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          switchInCurve: Curves.easeInOutCubic,
                          switchOutCurve: Curves.easeInOutCubic,
                          transitionBuilder: (Widget child, Animation<double> animation) {
                            final inAnimation = Tween<Offset>(
                              begin: const Offset(0.02, 0.0),
                              end: Offset.zero,
                            ).animate(animation);
                            final fadeAnimation = Tween<double>(
                              begin: 0.0,
                              end: 1.0,
                            ).animate(animation);
                            return FadeTransition(
                              opacity: fadeAnimation,
                              child: SlideTransition(
                                position: inAnimation,
                                child: child,
                              ),
                            );
                          },
                          child: KeyedSubtree(
                            key: ValueKey<DesktopView>(_currentView),
                            child: _buildView(state),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          if (_activeToasts.isNotEmpty)
            Positioned(
              top: 24,
              right: 24,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: _activeToasts.map((toast) {
                  final isDark = AppTheme.isDark;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Material(
                      color: Colors.transparent,
                      child: Container(
                        width: 320,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: toast.isError
                              ? (isDark ? const Color(0xFF5A000A) : const Color(0xFFFFDAD6))
                              : kSurfaceContainer,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: toast.isError
                                ? kError.withOpacity(0.5)
                                : kOutlineVariant,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Icon(
                              toast.isError ? Icons.error_outline : Icons.check_circle_outline,
                              color: toast.isError ? kError : Colors.green,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                toast.message,
                                style: GoogleFonts.inter(
                                  color: toast.isError
                                      ? (isDark ? const Color(0xFFFFDAD6) : const Color(0xFF410002))
                                      : kOnSurface,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: () {
                                setState(() {
                                  _activeToasts.removeWhere((t) => t.id == toast.id);
                                });
                              },
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              splashRadius: 16,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
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
        return ResourcesView(
          state: state,
          searchController: _hubSearchController,
          selectedCategory: _selectedCategory,
          selectedTopic: _selectedTopic,
          onCategoryChanged: (cat) => setState(() => _selectedCategory = cat),
          onTopicChanged: (topic) => setState(() => _selectedTopic = topic),
          onNavigate: (view) => setState(() => _currentView = view),
          onNavigateToInput: (text) {
            setState(() {
              _initialInputText = text;
              _currentView = DesktopView.input;
            });
          },
        );
      case DesktopView.history:
        return HomeView(state: state);
      case DesktopView.settings:
        return SettingsView(state: state);
      case DesktopView.input:
        return InputView(state: state, initialText: _initialInputText);
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
      case DesktopView.licenses:
        return LicensesView(state: state);
    }
  }
}

class _UpdateDialog extends StatefulWidget {
  final UpdateInfo info;
  final VoidCallback onDecline;

  const _UpdateDialog({required this.info, required this.onDecline});

  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog> {
  double _progress = 0;
  bool _downloading = false;
  String? _error;

  void _startUpdate() {
    setState(() {
      _downloading = true;
      _error = null;
    });

    UpdateService().applyUpdate(
      updateInfo: widget.info,
      onProgress: (p) => setState(() => _progress = p),
      onError: (err) => setState(() {
        _downloading = false;
        _error = err;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(LucideIcons.download, color: kPrimary),
          const SizedBox(width: 10),
          Text(widget.info.forceUpdate ? 'Critical Update Required' : 'Update Available'),
        ],
      ),
      content: SizedBox(
        width: 350,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'A new version of LANpad (v\${widget.info.latestVersion}) is available.\n\n' +
              (widget.info.forceUpdate ? 'This is a required update and cannot be skipped.' : 'Would you like to download and install it automatically now?'),
              style: GoogleFonts.inter(fontSize: 14, color: kOnSurface),
            ),
            if (widget.info.releaseNotes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kSurfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.info.releaseNotes,
                  style: GoogleFonts.inter(fontSize: 13, color: kOnSurfaceVariant),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text('Error: $_error', style: GoogleFonts.inter(fontSize: 13, color: Colors.redAccent)),
            ],
            if (_downloading) ...[
              const SizedBox(height: 24),
              LinearProgressIndicator(value: _progress, backgroundColor: kSurfaceVariant, color: kPrimary),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  '\${(_progress * 100).toStringAsFixed(0)}%',
                  style: GoogleFonts.inter(fontSize: 12, color: kOnSurfaceVariant),
                ),
              ),
            ]
          ],
        ),
      ),
      actions: [
        if (!widget.info.forceUpdate && !_downloading)
          TextButton(
            onPressed: widget.onDecline,
            child: Text('Later', style: TextStyle(color: kOnSurfaceVariant)),
          ),
        if (!_downloading)
          FilledButton(
            onPressed: _startUpdate,
            child: const Text('Update Now'),
          ),
      ],
    );
  }
}
// ─────────────────────────────────────────────────────────────────
// Splash View
// ─────────────────────────────────────────────────────────────────

class _DesktopSplashView extends StatelessWidget {
  final bool isStarting;
  final VoidCallback onStart;

  const _DesktopSplashView({required this.isStarting, required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isStarting) ...[
              CircularProgressIndicator(color: kPrimary),
              const SizedBox(height: 24),
              Text(
                'Starting LANpad server...',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: kOnSurface,
                ),
              ),
            ] else ...[
              Icon(LucideIcons.power, size: 48, color: kOnSurfaceVariant),
              const SizedBox(height: 24),
              Text(
                'LANpad server is stopped',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: kOnSurface,
                ),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onStart,
                icon: const Icon(LucideIcons.play, size: 18),
                label: const Text('Start Server'),
                style: FilledButton.styleFrom(
                  backgroundColor: kPrimary,
                  foregroundColor: kSurfaceLowest,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Crash View
// ─────────────────────────────────────────────────────────────────

class _DesktopCrashView extends StatelessWidget {
  final String crashLog;
  final VoidCallback onRetry;

  const _DesktopCrashView({required this.crashLog, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF1E0A0A),
      padding: const EdgeInsets.all(48),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_rounded, color: Colors.redAccent, size: 32),
              const SizedBox(width: 16),
              Text(
                'LANpad Backend Crashed',
                style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'The Python backend server exited unexpectedly. Please report this error.',
            style: GoogleFonts.inter(fontSize: 16, color: Colors.white70),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
              ),
              child: SingleChildScrollView(
                child: Text(
                  crashLog,
                  style: const TextStyle(fontFamily: 'monospace', color: Colors.redAccent, fontSize: 13),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            ),
            onPressed: onRetry,
            icon: const Icon(LucideIcons.refresh_cw, size: 18),
            label: const Text('Restart Server'),
          ),
        ],
      ),
    );
  }
}
