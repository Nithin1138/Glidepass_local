import 'dart:io';
import 'package:flutter/material.dart';
import '../../models/file_model.dart';
import '../../models/history_model.dart';
import '../../models/resource_model.dart';
import '../../services/server_service.dart';
import '../../services/tunnel_service.dart';
import '../../services/api_service.dart';
import '../../services/connection_service.dart';
import '../../services/websocket_service.dart';

/// Shared state object passed to every desktop view.
/// The shell owns mutation; views receive this as a read-only snapshot
/// plus a set of callback functions.
class DesktopState {
  // ── Services (singletons) ───────────────────────────────────────
  final ServerService serverService;
  final TunnelService tunnelService;
  final ApiService apiService;
  final ConnectionService connectionService;
  final WebSocketService webSocketService;

  // ── Read state ──────────────────────────────────────────────────
  final String localIp;
  final bool isDirectLan;
  final String sessionTimeFormatted;

  // File state
  final List<SharedFile> files;
  final bool loadingFiles;
  final bool isUploading;
  final double uploadProgress;
  final String uploadProgressName;
  final String uploadSpeed;
  final String uploadEta;
  final Set<String> downloadedFileNames;

  // History state
  final List<HistoryItem> history;
  final bool loadingHistory;

  // Hub / Resource state
  final List<Hub> hubs;
  final bool loadingHubs;
  final Hub? selectedHub;
  final List<ResourceSnippet> resources;
  final List<ResourceSnippet> filteredResources;

  // System
  final bool hasAccessibilityPermission;

  // ── Callbacks ────────────────────────────────────────────────────
  final VoidCallback onToggleServer;
  final VoidCallback onReconnect;
  final VoidCallback onPickAndUpload;
  final VoidCallback onPickFolder;
  final ValueChanged<bool> onToggleLanMode;
  final Future<void> Function(SharedFile) onDownloadFile;
  final Future<void> Function(SharedFile) onDeleteFile;
  final Future<void> Function(Hub) onSelectHub;
  final ValueChanged<String> onFilterHubResources;
  final VoidCallback onRequestAccessibility;
  final void Function(String, {bool isError}) onShowToast;

  // ── Formatters ────────────────────────────────────────────────────
  final String Function(int bytes) formatBytes;

  const DesktopState({
    required this.serverService,
    required this.tunnelService,
    required this.apiService,
    required this.connectionService,
    required this.webSocketService,
    required this.localIp,
    required this.isDirectLan,
    required this.sessionTimeFormatted,
    required this.files,
    required this.loadingFiles,
    required this.isUploading,
    required this.uploadProgress,
    required this.uploadProgressName,
    required this.uploadSpeed,
    required this.uploadEta,
    required this.downloadedFileNames,
    required this.history,
    required this.loadingHistory,
    required this.hubs,
    required this.loadingHubs,
    required this.selectedHub,
    required this.resources,
    required this.filteredResources,
    required this.hasAccessibilityPermission,
    required this.onToggleServer,
    required this.onReconnect,
    required this.onPickAndUpload,
    required this.onPickFolder,
    required this.onToggleLanMode,
    required this.onDownloadFile,
    required this.onDeleteFile,
    required this.onSelectHub,
    required this.onFilterHubResources,
    required this.onRequestAccessibility,
    required this.onShowToast,
    required this.formatBytes,
  });

  String get displayDeviceName {
    if (serverService.deviceName.isNotEmpty) return serverService.deviceName;
    return Platform.localHostname.split('.').first;
  }
}
