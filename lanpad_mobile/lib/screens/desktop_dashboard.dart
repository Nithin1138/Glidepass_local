import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/server_service.dart';
import '../services/tunnel_service.dart';
import '../services/api_service.dart';
import '../services/connection_service.dart';
import '../services/websocket_service.dart';
import '../models/file_model.dart';
import '../models/resource_model.dart';

enum DesktopView {
  dashboard,
  files,
  hubs,
  settings,
}

class DesktopDashboard extends StatefulWidget {
  const DesktopDashboard({super.key});

  @override
  State<DesktopDashboard> createState() => _DesktopDashboardState();
}

class _DesktopDashboardState extends State<DesktopDashboard> {
  final ServerService _serverService = ServerService();
  final TunnelService _tunnelService = TunnelService();
  late StreamSubscription _serverSub;
  late StreamSubscription _tunnelSub;

  bool _isDirectLan = true;
  String _localIp = 'Detecting...';

  final SystemTray _systemTray = SystemTray();
  final Menu _menu = Menu();
  bool _trayInitialized = false;
  bool _isConnectedToLocalService = false;

  // View state navigation
  DesktopView _currentView = DesktopView.dashboard;

  // API & Service instances
  final ApiService _apiService = ApiService();
  final WebSocketService _webSocketService = WebSocketService();
  final ConnectionService _connectionService = ConnectionService();

  // File Sharing state
  List<SharedFile> _files = [];
  bool _loadingFiles = false;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _uploadProgressName = '';
  String _uploadSpeed = '';
  String _uploadEta = '';
  final Set<String> _downloadedFileNames = {};
  final TextEditingController _fileSearchController = TextEditingController();

  // Hubs / Resources state
  List<Hub> _hubs = [];
  bool _loadingHubs = false;
  Hub? _selectedHub;
  List<ResourceSnippet> _resources = [];
  List<ResourceSnippet> _filteredResources = [];
  final TextEditingController _hubSearchController = TextEditingController();
  bool _hasAccessibilityPermission = true;

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
      } else {
        if (_isConnectedToLocalService) {
          _isConnectedToLocalService = false;
          _webSocketService.disconnect();
        }
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
    }
    
    // Check macOS accessibility permission on first startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAccessibility();
    });
  }

  Future<void> _initSystemTray() async {
    if (!Platform.isMacOS && !Platform.isWindows) return;
    try {
      await _systemTray.initSystemTray(
        title: "LANpad",
        iconPath: Platform.isWindows ? 'assets/app_icon.ico' : 'assets/menubar_icon.png',
        isTemplate: true,
      );
      _trayInitialized = true;
      _updateSystemTray();
    } catch (e) {
      print("System tray init failed: $e");
    }
  }

  Future<void> _updateSystemTray() async {
    if (!_trayInitialized) return;
    final isRunning = _serverService.isRunning;
    
    await _menu.buildFrom([
      MenuItemLabel(
        label: 'Server Status: ${isRunning ? 'Running' : 'Offline'}',
        enabled: false,
      ),
      MenuSeparator(),
      MenuItemLabel(
        label: isRunning ? 'Stop Server' : 'Start Server',
        onClicked: (menuItem) {
          _toggleServer();
        },
      ),
      MenuItemLabel(
        label: 'Show Dashboard',
        onClicked: (menuItem) async {
          await windowManager.show();
          await windowManager.focus();
        },
      ),
      MenuItemLabel(
        label: 'About LANpad',
        onClicked: (menuItem) {
          _showAboutDialog();
        },
      ),
      MenuSeparator(),
      MenuItemLabel(
        label: 'Quit LANpad',
        onClicked: (menuItem) {
          exit(0);
        },
      ),
    ]);
    
    await _systemTray.setContextMenu(_menu);
  }

  Future<void> _checkAccessibility() async {
    if (!Platform.isMacOS) return;
    const platform = MethodChannel('lanpad/system');
    try {
      final bool hasPermission = await platform.invokeMethod('checkAccessibility');
      setState(() {
        _hasAccessibilityPermission = hasPermission;
      });
      if (!hasPermission) {
        _showPermissionDialog();
      }
    } catch (_) {}
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Dialog(
          backgroundColor: const Color(0xFF1C1C24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFF2C2C3E)),
          ),
          child: Container(
            width: 480,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0077C0).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        LucideIcons.shield_alert,
                        color: Color(0xFF0077C0),
                        size: 32,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LANpad Needs Permissions',
                            style: GoogleFonts.outfit(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'To auto-type text from your phone, macOS requires you to grant Accessibility permissions to LANpad.\n\n'
                            '1. Open System Settings -> Privacy & Security -> Accessibility.\n'
                            '2. IMPORTANT: If LANpad is already listed, you MUST remove it first (select it and click the \'-\' button).\n'
                            '3. Click the \'+\' button and add LANpad.app again.\n'
                            '4. Restart LANpad.',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              height: 1.5,
                              color: const Color(0xFFC0C0D0),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Later',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                      ),
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0077C0),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Open Settings',
                        style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                      ),
                      onPressed: () async {
                        const platform = MethodChannel('lanpad/system');
                        await platform.invokeMethod('requestAccessibility');
                        Navigator.of(context).pop();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAboutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1C1C24),
          title: Text('About LANpad', style: GoogleFonts.outfit(color: Colors.white)),
          content: Text(
            'LANpad is a ultra-fast cross-device sharing bridge.\nVersion 1.2.3',
            style: GoogleFonts.inter(color: const Color(0xFFC0C0D0)),
          ),
          actions: [
            TextButton(
              child: const Text('OK'),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        );
      },
    );
  }

  Future<void> _syncConnectionServiceAndStartWS() async {
    await _connectionService.connect('http://localhost:8000', _serverService.sessionToken);
    _initWebSocket();
    _loadFiles();
    _loadHubs();
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

  Future<void> _loadFiles() async {
    if (!_serverService.isRunning) return;
    if (_files.isEmpty) {
      setState(() => _loadingFiles = true);
    }
    final list = await _apiService.fetchFiles();
    setState(() {
      _files = list;
      _loadingFiles = false;
    });
  }

  Future<void> _loadHubs() async {
    if (!_serverService.isRunning) return;
    if (_hubs.isEmpty) {
      setState(() => _loadingHubs = true);
    }
    final list = await _apiService.fetchHubs();
    setState(() {
      _hubs = list;
      _loadingHubs = false;
    });
  }

  Future<void> _selectHub(Hub hub) async {
    setState(() {
      _selectedHub = hub;
      _loadingHubs = true;
    });
    final list = await _apiService.fetchResources(hub.id);
    setState(() {
      _resources = list;
      _filteredResources = list;
      _loadingHubs = false;
    });
  }

  void _filterHubResources(String query) {
    if (query.isEmpty) {
      setState(() {
        _filteredResources = _resources;
      });
    } else {
      setState(() {
        _filteredResources = _resources.where((r) =>
          r.title.toLowerCase().contains(query.toLowerCase()) ||
          r.content.toLowerCase().contains(query.toLowerCase())
        ).toList();
      });
    }
  }

  Future<void> _pickAndUploadFile() async {
    try {
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
              mode: 'parallel',
              onProgress: (sent, total) {
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
            } else {
              _showToast('Failed to upload $filename', isError: true);
            }
          } catch (e) {
            _showToast('Failed to upload $filename: $e', isError: true);
          }
        }

        if (uploadedCount > 0) {
          _showToast('Successfully uploaded $uploadedCount files!');
          _loadFiles();
        }
      }
    } catch (e) {
      print("File picker exception: $e");
      _showToast("Failed to pick files: $e", isError: true);
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

  Future<void> _downloadFile(SharedFile file) async {
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
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1C1C24),
          title: Text('Delete File', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          content: Text('Are you sure you want to remove "${file.name}"?', style: GoogleFonts.inter(color: Colors.white)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text('Cancel', style: GoogleFonts.inter(color: const Color(0xFF8888A0))),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: isError ? Colors.redAccent : const Color(0xFF0077C0),
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
  void dispose() {
    _serverSub.cancel();
    _tunnelSub.cancel();
    super.dispose();
  }

  Future<void> _fetchLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLinkLocal: false,
      );
      for (final interface in interfaces) {
        for (final addr in interface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('169.254')) {
            setState(() {
              _localIp = addr.address;
            });
            return;
          }
        }
      }
    } catch (_) {}
    setState(() {
      _localIp = '127.0.0.1';
    });
  }

  Future<void> _reconnectSession() async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Reconnecting Wi-Fi and refreshing tunnel...',
          style: GoogleFonts.inter(color: Colors.white),
        ),
        backgroundColor: const Color(0xFF1E1E2F),
        duration: const Duration(seconds: 2),
      ),
    );

    // Stop current tunnel and server
    await _tunnelService.stopTunnel();
    await _serverService.stopServer();
    _webSocketService.disconnect();

    // Re-detect IP
    await _fetchLocalIp();

    // Start server and tunnel fresh
    await _serverService.startServer();
    await _tunnelService.startTunnel();

    if (_serverService.isRunning) {
      await _syncConnectionServiceAndStartWS();
    }

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
      if (_serverService.isRunning) {
        await _syncConnectionServiceAndStartWS();
      }
    }
    setState(() {});
  }

  String get _displayDeviceName {
    if (_serverService.deviceName.isNotEmpty) {
      return _serverService.deviceName;
    }
    final host = Platform.localHostname;
    return host.split('.').first;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData.dark();
    final isRunning = _serverService.isRunning;

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F13),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F0F13), Color(0xFF161622)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Row(
          children: [
            // Left Navigation/Control Bar
            Container(
              width: 280,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFF181824),
                border: Border(
                  right: BorderSide(color: Color(0xFF262636), width: 1),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2C2C3E),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  LucideIcons.keyboard,
                                  color: Color(0xFFFF7A45),
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                'LANpad',
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              const Spacer(),
                              if (isRunning)
                                IconButton(
                                  icon: const Icon(
                                    LucideIcons.refresh_cw,
                                    color: Color(0xFFFF7A45),
                                    size: 16,
                                  ),
                                  tooltip: 'Reconnect Wi-Fi / Refresh Tunnel',
                                  onPressed: _reconnectSession,
                                ),
                            ],
                          ),
                          const SizedBox(height: 20),
        
                          // Server Master Control Button
                          GestureDetector(
                            onTap: _toggleServer,
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                gradient: isRunning
                                    ? const LinearGradient(colors: [Color(0xFFFF4D4D), Color(0xFFFF7A45)])
                                    : const LinearGradient(colors: [Color(0xFF0077C0), Color(0xFF00B4D8)]),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: (isRunning ? const Color(0xFFFF4D4D) : const Color(0xFF0077C0))
                                        .withOpacity(0.3),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  )
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  isRunning ? 'Stop Server' : 'Start Server',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
        
                          // Sidebar Navigation
                          Text(
                            'NAVIGATION',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF8888A0),
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildNavItem(
                            title: 'Dashboard',
                            icon: LucideIcons.layout_dashboard,
                            view: DesktopView.dashboard,
                          ),
                          const SizedBox(height: 6),
                          _buildNavItem(
                            title: 'Shared Files',
                            icon: LucideIcons.folder_open,
                            view: DesktopView.files,
                          ),
                          const SizedBox(height: 6),
                          _buildNavItem(
                            title: 'Hubs & Resources',
                            icon: LucideIcons.book_open,
                            view: DesktopView.hubs,
                          ),
                          const SizedBox(height: 6),
                          _buildNavItem(
                            title: 'Settings & Legals',
                            icon: LucideIcons.settings,
                            view: DesktopView.settings,
                          ),
                          const SizedBox(height: 18),
        
                          // Mode Selector Card
                          Text(
                            'CONNECTION MODE',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF8888A0),
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildModeToggle(
                            title: 'Direct LAN',
                            subtitle: 'Local Wi-Fi connections',
                            icon: LucideIcons.wifi,
                            isActive: _isDirectLan,
                            onTap: () {
                              if (_isDirectLan) return;
                              setState(() => _isDirectLan = true);
                            },
                          ),
                          const SizedBox(height: 8),
                          _buildModeToggle(
                            title: 'Hybrid Relay',
                            subtitle: 'Internet secure tunnel',
                            icon: LucideIcons.globe,
                            isActive: !_isDirectLan,
                            onTap: () {
                              if (!_isDirectLan) return;
                              setState(() => _isDirectLan = false);
                            },
                          ),
                          if (isRunning) ...[
                            const SizedBox(height: 16),
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: QrImageView(
                                  data: _isDirectLan
                                      ? 'http://$_localIp:8000?sid=${_serverService.sessionToken}'
                                      : '${_tunnelService.tunnelUrl ?? 'https://lanpad.app'}?sid=${_serverService.sessionToken}',
                                  version: QrVersions.auto,
                                  size: 110.0,
                                  gapless: false,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Device Status Badge
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF20202F),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF2C2C3E)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isRunning ? const Color(0xFF00C853) : const Color(0xFF8888A0),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isRunning ? 'Server Live' : 'Offline',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isRunning ? const Color(0xFF00C853) : const Color(0xFF8888A0),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Device Name:',
                          style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0)),
                        ),
                        Text(
                          _displayDeviceName,
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Session Code:',
                          style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0)),
                        ),
                        Text(
                          isRunning ? _serverService.sessionCode : 'Offline',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isRunning ? const Color(0xFF0077C0) : const Color(0xFF8888A0),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Main Display Pane
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Builder(
                  builder: (context) {
                    switch (_currentView) {
                      case DesktopView.dashboard:
                        return _buildDashboardView();
                      case DesktopView.files:
                        return _buildFilesView();
                      case DesktopView.hubs:
                        return _buildHubsView();
                      case DesktopView.settings:
                        return _buildSettingsView();
                    }
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeToggle({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF222234) : const Color(0xFF1A1A26),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? const Color(0xFF0077C0) : const Color(0xFF2C2C3E),
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isActive ? const Color(0xFF0077C0) : const Color(0xFF8888A0), size: 20),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: const Color(0xFF8888A0),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required String title,
    required IconData icon,
    required DesktopView view,
  }) {
    final isSelected = _currentView == view;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentView = view;
        });
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0077C0).withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF0077C0).withOpacity(0.3) : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFF00B4D8) : const Color(0xFF8888A0),
              size: 16,
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : const Color(0xFF8888A0),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardView() {
    final isRunning = _serverService.isRunning;
    final lastFiles = _files.take(3).toList();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Dashboard',
                    style: GoogleFonts.outfit(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isRunning
                        ? (_isDirectLan
                            ? 'Connect using direct URL: http://$_localIp:8000'
                            : (_tunnelService.tunnelUrl != null
                                ? 'Connect using tunnel: ${_tunnelService.tunnelUrl}'
                                : 'Establishing secure tunnel...'))
                        : 'Start the local bridge to connect your devices.',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: const Color(0xFF8888A0),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E2F),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF2C2C3E)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.users, color: Color(0xFF0077C0), size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '${_serverService.connectedClientsCount} Connected',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),

        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF181824),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF262636)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Connected Devices',
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _serverService.connectedDeviceNames.isEmpty
                            ? Center(
                                child: Text(
                                  'No devices currently paired.',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF60607F),
                                    fontSize: 13,
                                  ),
                                ),
                              )
                            : ListView.builder(
                                itemCount: _serverService.connectedDeviceNames.length,
                                itemBuilder: (context, idx) {
                                  final name = _serverService.connectedDeviceNames[idx];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF20202F),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: const Color(0xFF2C2C3E)),
                                    ),
                                    child: Row(
                                      children: [
                                        const CircleAvatar(
                                          backgroundColor: Color(0xFF0077C0),
                                          child: Icon(LucideIcons.smartphone, color: Colors.white, size: 16),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(
                                          name,
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const Spacer(),
                                        const Icon(LucideIcons.circle_check, color: Color(0xFF00C853), size: 16),
                                      ],
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 24),

              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF181824),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF262636)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Shared Files Log',
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          if (isRunning && _files.isNotEmpty)
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _currentView = DesktopView.files;
                                });
                              },
                              child: Text(
                                'View All (${_files.length})',
                                style: GoogleFonts.inter(color: const Color(0xFF00B4D8), fontSize: 12),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: !isRunning
                            ? Center(
                                child: Text(
                                  'Start server to share files.',
                                  style: GoogleFonts.inter(color: const Color(0xFF60607F), fontSize: 13),
                                ),
                              )
                            : _files.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(
                                          LucideIcons.folder_open,
                                          size: 44,
                                          color: Color(0xFF8888A0),
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          'No files shared yet',
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        ElevatedButton.icon(
                                          icon: const Icon(LucideIcons.upload, size: 14),
                                          label: const Text('Share File'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF0077C0),
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          ),
                                          onPressed: _pickAndUploadFile,
                                        ),
                                      ],
                                    ),
                                  )
                                : Column(
                                    children: [
                                      Expanded(
                                        child: ListView.builder(
                                          itemCount: lastFiles.length,
                                          itemBuilder: (context, idx) {
                                            final file = lastFiles[idx];
                                            return Container(
                                              margin: const EdgeInsets.only(bottom: 10),
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF20202F),
                                                borderRadius: BorderRadius.circular(12),
                                                border: Border.all(color: const Color(0xFF2C2C3E)),
                                              ),
                                              child: Row(
                                                children: [
                                                  const Icon(LucideIcons.file, color: Color(0xFF00B4D8), size: 20),
                                                  const SizedBox(width: 10),
                                                  Expanded(
                                                    child: Text(
                                                      file.name,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: GoogleFonts.inter(fontSize: 12, color: Colors.white),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  IconButton(
                                                    icon: const Icon(LucideIcons.download, color: Colors.white, size: 14),
                                                    onPressed: () => _downloadFile(file),
                                                  ),
                                                ],
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      ElevatedButton.icon(
                                        icon: const Icon(LucideIcons.upload, size: 14),
                                        label: const Text('Share Another File'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF0077C0),
                                          foregroundColor: Colors.white,
                                          minimumSize: const Size(double.infinity, 44),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                        onPressed: _pickAndUploadFile,
                                      ),
                                    ],
                                  ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilesView() {
    final isRunning = _serverService.isRunning;
    final query = _fileSearchController.text.trim().toLowerCase();
    final filtered = _files.where((f) => f.name.toLowerCase().contains(query)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Shared Files Manager',
                  style: GoogleFonts.outfit(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Upload, download, or manage all files in this session.',
                  style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF8888A0)),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(LucideIcons.refresh_cw, color: Color(0xFF00B4D8)),
              onPressed: _loadFiles,
            ),
          ],
        ),
        const SizedBox(height: 24),

        if (isRunning) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF181824),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF262636)),
            ),
            child: _isUploading
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SHARING FILE...',
                        style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF00B4D8)),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _uploadProgressName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LinearProgressIndicator(
                          value: _uploadProgress,
                          minHeight: 6,
                          backgroundColor: Colors.white.withOpacity(0.1),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00B4D8)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_uploadSpeed, style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0))),
                          Text(_uploadEta, style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF00B4D8), fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  )
                : GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _pickAndUploadFile,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 36),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.02),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF2C2C3E),
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: Column(
                        children: [
                          const Icon(LucideIcons.cloud_upload, size: 36, color: Color(0xFF00B4D8)),
                          const SizedBox(height: 12),
                          Text(
                            'CHOOSE FILES TO SHARE',
                            style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Supports drag and drop or selection of files up to 10 GB+',
                            style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0)),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
          const SizedBox(height: 20),
        ],

        TextField(
          controller: _fileSearchController,
          onChanged: (_) => setState(() {}),
          style: GoogleFonts.inter(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Search shared files...',
            hintStyle: GoogleFonts.inter(color: const Color(0xFF60607F), fontSize: 13),
            prefixIcon: const Icon(LucideIcons.search, size: 16, color: Color(0xFF8888A0)),
            filled: true,
            fillColor: const Color(0xFF181824),
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF262636)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF262636)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF0077C0)),
            ),
          ),
        ),
        const SizedBox(height: 16),

        Expanded(
          child: !isRunning
              ? Center(
                  child: Text(
                    'Start local bridge to share and download files.',
                    style: GoogleFonts.inter(color: const Color(0xFF60607F)),
                  ),
                )
              : _loadingFiles
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF00B4D8)))
                  : filtered.isEmpty
                      ? Center(
                          child: Text(
                            'No matching files found.',
                            style: GoogleFonts.inter(color: const Color(0xFF60607F)),
                          ),
                        )
                      : ListView.builder(
                          itemCount: filtered.length,
                          itemBuilder: (context, idx) {
                            final file = filtered[idx];
                            final isDownloaded = _downloadedFileNames.contains(file.name);
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF181824),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFF262636)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.file, color: Color(0xFF00B4D8), size: 24),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          file.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _formatBytes(file.size),
                                          style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: Icon(
                                          isDownloaded ? LucideIcons.circle_check : LucideIcons.download,
                                          color: isDownloaded ? const Color(0xFF00C853) : Colors.white,
                                          size: 16,
                                        ),
                                        onPressed: () => _downloadFile(file),
                                      ),
                                      const SizedBox(width: 8),
                                      IconButton(
                                        icon: const Icon(LucideIcons.trash_2, color: Colors.redAccent, size: 16),
                                        onPressed: () => _deleteFile(file),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            );
                          },
                        ),
        ),
      ],
    );
  }

  Widget _buildHubsView() {
    final isRunning = _serverService.isRunning;
    if (!isRunning) {
      return Center(
        child: Text(
          'Start local bridge to view resources and hubs.',
          style: GoogleFonts.inter(color: const Color(0xFF60607F)),
        ),
      );
    }

    if (_selectedHub != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(LucideIcons.arrow_left, color: Colors.white),
                onPressed: () {
                  setState(() {
                    _selectedHub = null;
                    _resources = [];
                    _filteredResources = [];
                  });
                },
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _selectedHub!.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Visibility: ${_selectedHub!.visibility}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF8888A0)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          TextField(
            controller: _hubSearchController,
            onChanged: _filterHubResources,
            style: GoogleFonts.inter(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search resources inside this hub...',
              hintStyle: GoogleFonts.inter(color: const Color(0xFF60607F), fontSize: 13),
              prefixIcon: const Icon(LucideIcons.search, size: 16, color: Color(0xFF8888A0)),
              filled: true,
              fillColor: const Color(0xFF181824),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF262636)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF262636)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0077C0)),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: _loadingHubs
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00B4D8)))
                : _filteredResources.isEmpty
                    ? Center(
                        child: Text(
                          'No snippets found.',
                          style: GoogleFonts.inter(color: const Color(0xFF60607F)),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _filteredResources.length,
                        itemBuilder: (context, idx) {
                          final res = _filteredResources[idx];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF181824),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFF262636)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        res.title,
                                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(LucideIcons.copy, color: Color(0xFF00B4D8), size: 16),
                                      onPressed: () {
                                        Clipboard.setData(ClipboardData(text: res.content));
                                        _showToast('Copied content to clipboard!');
                                      },
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0B0B10),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFF20202F)),
                                  ),
                                  child: Text(
                                    res.content,
                                    maxLines: 6,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.firaCode(fontSize: 12, color: const Color(0xFFC0C0D0)),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hubs & Resources',
                  style: GoogleFonts.outfit(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Explore documentation, codes, or assets shared across your bridge.',
                  style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF8888A0)),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(LucideIcons.refresh_cw, color: Color(0xFF00B4D8)),
              onPressed: _loadHubs,
            ),
          ],
        ),
        const SizedBox(height: 24),

        Expanded(
          child: _loadingHubs
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF00B4D8)))
              : _hubs.isEmpty
                  ? Center(
                      child: Text(
                        'No resource hubs created yet.',
                        style: GoogleFonts.inter(color: const Color(0xFF60607F)),
                      ),
                    )
                  : GridView.builder(
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 280,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 1.25,
                      ),
                      itemCount: _hubs.length,
                      itemBuilder: (context, idx) {
                        final hub = _hubs[idx];
                        return GestureDetector(
                          onTap: () => _selectHub(hub),
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: const Color(0xFF181824),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFF262636)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0077C0).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(LucideIcons.book_open, color: Color(0xFF00B4D8), size: 20),
                                ),
                                const Spacer(),
                                Text(
                                  hub.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Visibility: ${hub.visibility}',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8888A0)),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Future<void> _requestAccessibility() async {
    const platform = MethodChannel('lanpad/system');
    try {
      await platform.invokeMethod('requestAccessibility');
      Future.delayed(const Duration(seconds: 2), () {
        _checkAccessibility();
      });
    } catch (_) {}
  }

  Future<void> _launchUrl(String urlString) async {
    final uri = Uri.parse(urlString);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _showToast('Could not launch browser for $urlString', isError: true);
      }
    } catch (e) {
      _showToast('Error opening page: $e', isError: true);
    }
  }

  Widget _buildSettingsView() {
    final isRunning = _serverService.isRunning;
    final String serverHost = _isDirectLan ? 'localhost' : (_localIp.isNotEmpty ? _localIp : 'localhost');
    final String serverBase = 'http://$serverHost:8000';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Settings & Legals',
          style: GoogleFonts.outfit(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Manage server details, access settings, and read compliance policies.',
          style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF8888A0)),
        ),
        const SizedBox(height: 24),

        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Device Info Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF181824),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF262636)),
                  ),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: Color(0xFF0077C0),
                        radius: 24,
                        child: Icon(LucideIcons.laptop, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _displayDeviceName,
                              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Local Bridge IP: $_localIp  |  Port: 8000',
                              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF8888A0)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 2. macOS Accessibility Permissions Section (Only on Mac)
                if (Platform.isMacOS) ...[
                  Text(
                    'SYSTEM ACCESSIBILITY',
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF8888A0), letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF181824),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF262636)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: _hasAccessibilityPermission ? const Color(0xFF00C853) : const Color(0xFFFFB300),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _hasAccessibilityPermission ? 'Accessibility Granted' : 'Accessibility Permission Needed',
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Required to simulate typing events from mobile input devices.',
                                style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF8888A0)),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: _requestAccessibility,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2C2C3E),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                          child: Text(
                            'Configure',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // 3. Web Interfaces Section
                Text(
                  'LOCAL WEB INTERFACES',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF8888A0), letterSpacing: 1.2),
                ),
                const SizedBox(height: 8),
                GridView(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 220,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2.1,
                  ),
                  children: [
                    _buildWebPageCard(
                      title: 'Pairing Portal',
                      desc: 'Pair mobile apps',
                      url: serverBase,
                      icon: LucideIcons.qr_code,
                      isEnabled: isRunning,
                    ),
                    _buildWebPageCard(
                      title: 'Command Center',
                      desc: 'Web text pasting',
                      url: '$serverBase/center',
                      icon: LucideIcons.terminal,
                      isEnabled: isRunning,
                    ),
                    _buildWebPageCard(
                      title: 'File Exchange',
                      desc: 'Web file management',
                      url: '$serverBase/files',
                      icon: LucideIcons.files,
                      isEnabled: isRunning,
                    ),
                    _buildWebPageCard(
                      title: 'Resources Hub',
                      desc: 'Web code assets',
                      url: '$serverBase/resources',
                      icon: LucideIcons.book_open,
                      isEnabled: isRunning,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // 4. Compliance & Policy Documents
                Text(
                  'COMPLIANCE & LEGAL POLICIES',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF8888A0), letterSpacing: 1.2),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF181824),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF262636)),
                  ),
                  child: Column(
                    children: [
                      _buildPolicyTile(
                        title: 'Terms of Service',
                        desc: 'Terms of using the bridge services',
                        url: isRunning ? '$serverBase/terms' : 'https://lanpad.app/terms_of_service',
                      ),
                      const Divider(color: Color(0xFF262636), height: 1),
                      _buildPolicyTile(
                        title: 'Privacy Policy',
                        desc: 'Data transmission & privacy standards',
                        url: isRunning ? '$serverBase/privacy' : 'https://lanpad.app/privacy_policy',
                      ),
                      const Divider(color: Color(0xFF262636), height: 1),
                      _buildPolicyTile(
                        title: 'Content Policy',
                        desc: 'Transfer guidelines and restrictions',
                        url: isRunning ? '$serverBase/content-policy' : 'https://lanpad.app/content_policy',
                      ),
                      const Divider(color: Color(0xFF262636), height: 1),
                      _buildPolicyTile(
                        title: 'Copyright Takedown',
                        desc: 'DMCA / Intellectual property claims',
                        url: isRunning ? '$serverBase/copyright-takedown' : 'https://lanpad.app/copyright_takedown',
                      ),
                      const Divider(color: Color(0xFF262636), height: 1),
                      _buildPolicyTile(
                        title: 'Refund Policy',
                        desc: 'Relay & license monetization guidelines',
                        url: isRunning ? '$serverBase/refund-policy' : 'https://lanpad.app/refund_policy',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWebPageCard({
    required String title,
    required String desc,
    required String url,
    required IconData icon,
    required bool isEnabled,
  }) {
    return GestureDetector(
      onTap: isEnabled ? () => _launchUrl(url) : null,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isEnabled ? const Color(0xFF181824) : const Color(0xFF13131A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isEnabled ? const Color(0xFF262636) : const Color(0xFF1C1C24),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isEnabled ? const Color(0xFF00B4D8) : const Color(0xFF60607F), size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: isEnabled ? Colors.white : const Color(0xFF60607F)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isEnabled ? desc : 'Server offline',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 9, color: const Color(0xFF8888A0)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPolicyTile({
    required String title,
    required String desc,
    required String url,
  }) {
    return ListTile(
      dense: true,
      leading: const Icon(LucideIcons.file_text, color: Color(0xFFFF7A45), size: 18),
      title: Text(
        title,
        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
      ),
      subtitle: Text(
        desc,
        style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF8888A0)),
      ),
      trailing: const Icon(LucideIcons.external_link, color: Color(0xFF8888A0), size: 14),
      onTap: () => _launchUrl(url),
    );
  }
}
