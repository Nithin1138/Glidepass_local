import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Represents the resolved admin state returned by the backend.
class AdminStatus {
  final String tier;
  final bool monetizationEnabled;
  final Map<String, dynamic> featureLimits;
  final String version;
  final bool isLoaded;

  const AdminStatus({
    this.tier = 'FREE',
    this.monetizationEnabled = false,
    this.featureLimits = const {},
    this.version = '',
    this.isLoaded = false,
  });

  /// Returns human-readable feature limit string for a given key.
  String limitLabel(String key) {
    final val = featureLimits[key];
    if (val == null) return '—';
    if (val is int) {
      if (val == 0) return 'Unlimited';
      if (val == -1) return 'Disabled';
      return '$val uses';
    }
    return val.toString();
  }

  bool get isFreeTier => tier == 'FREE';
  bool get isPro => tier == 'PRO';
  bool get isDeveloper => tier == 'DEVELOPER';
}

/// Holds information about a pending update.
class UpdateInfo {
  final bool updateAvailable;
  final String latestVersion;
  final String localVersion;
  final bool forceUpdate;
  final String macUrl;
  final String windowsUrl;
  final String releaseNotes;

  const UpdateInfo({
    required this.updateAvailable,
    required this.latestVersion,
    required this.localVersion,
    required this.forceUpdate,
    required this.macUrl,
    required this.windowsUrl,
    required this.releaseNotes,
  });

  factory UpdateInfo.fromJson(Map<String, dynamic> json) => UpdateInfo(
        updateAvailable: json['update_available'] == true,
        latestVersion: json['latest_version'] ?? '',
        localVersion: json['local_version'] ?? '',
        forceUpdate: json['force_update'] == true,
        macUrl: json['mac_url'] ?? '',
        windowsUrl: json['windows_url'] ?? '',
        releaseNotes: json['release_notes'] ?? '',
      );
}

/// Singleton service that polls the backend admin endpoint and exposes
/// reactive status for both the licenses view and the desktop shell.
class AdminService {
  AdminService._internal();
  static final AdminService _instance = AdminService._internal();
  factory AdminService() => _instance;

  late ApiService _apiService;
  Timer? _pollTimer;

  final ValueNotifier<AdminStatus> status =
      ValueNotifier(const AdminStatus());
  final ValueNotifier<UpdateInfo?> updateInfo = ValueNotifier(null);

  void init(ApiService apiService) {
    _apiService = apiService;
    _fetchAll();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) => _fetchStatus());
  }

  void dispose() {
    _pollTimer?.cancel();
  }

  Future<void> _fetchAll() async {
    await Future.wait([_fetchStatus(), _fetchUpdate()]);
  }

  Future<void> _fetchStatus() async {
    try {
      final data = await _apiService.fetchAdminStatus();
      if (data['status'] == 'success') {
        status.value = AdminStatus(
          tier: (data['tier'] ?? 'FREE').toString().toUpperCase(),
          monetizationEnabled: data['monetization_enabled'] == true,
          featureLimits: Map<String, dynamic>.from(data['feature_limits'] ?? {}),
          version: data['version'] ?? '',
          isLoaded: true,
        );
      }
    } catch (e) {
      debugPrint('[AdminService] status fetch failed: $e');
    }
  }

  Future<void> _fetchUpdate() async {
    try {
      final data = await _apiService.checkForUpdates();
      if (data['status'] == 'success') {
        updateInfo.value = UpdateInfo.fromJson(data);
      }
    } catch (e) {
      debugPrint('[AdminService] update check failed: $e');
    }
  }

  /// Forces an immediate refresh of admin status and update info.
  Future<void> refresh() => _fetchAll();

  /// Fires a telemetry event asynchronously. Does not block caller.
  void logEvent(String event) {
    _apiService.logTelemetryEvent(event);
  }
}
