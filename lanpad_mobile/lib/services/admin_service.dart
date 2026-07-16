import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// Represents the resolved admin state returned by the backend.
class AdminStatus {
  final String tier;
  final bool monetizationEnabled;
  final bool freeEnabled;
  final Map<String, dynamic> featureLimits;
  final String version;
  final bool isLoaded;

  const AdminStatus({
    this.tier = 'FREE',
    this.monetizationEnabled = false,
    this.freeEnabled = true,
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

  Future<void> _fetchAll({bool force = false}) async {
    await Future.wait([_fetchStatus(force: force), _fetchUpdate()]);
  }

  Future<void> _fetchStatus({bool force = false}) async {
    try {
      final data = await _apiService.fetchAdminStatus(force: force);
      if (data['status'] == 'success') {
        status.value = AdminStatus(
          tier: (data['tier'] ?? 'FREE').toString().toUpperCase(),
          monetizationEnabled: data['monetization_enabled'] == true,
          freeEnabled: data['free_enabled'] ?? true,
          featureLimits: Map<String, dynamic>.from(data['feature_limits'] ?? {}),
          version: data['version'] ?? '',
          isLoaded: true,
        );
        return;
      }
    } catch (e) {
      debugPrint('[AdminService] status fetch failed from server: $e');
    }

    // Fallback: If server is unreachable, check monetization and license locally
    try {
      String homeDir = Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'] ?? '';
      bool monetizationEnabled = false;
      bool freeEnabled = true;
      String tier = 'UNLICENSED';

      // 1. Fetch monetization status
      try {
        final url = 'https://lanpad.app/api/monetization/status';
        final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 3));
        if (response.statusCode == 200) {
          final res = jsonDecode(response.body);
          monetizationEnabled = res['monetization_enabled'] == true;
          freeEnabled = res['free_enabled'] ?? true;
        }
      } catch (e) {
        final file = File('$homeDir/.lanpad_monetization.json');
        if (await file.exists()) {
          final cache = jsonDecode(await file.readAsString());
          monetizationEnabled = cache['monetization_enabled'] == true;
          freeEnabled = cache['free_enabled'] ?? true;
        }
      }

      // 2. Read local license
      final licenseFile = File('$homeDir/.lanpad_license.json');
      if (await licenseFile.exists()) {
        final lic = jsonDecode(await licenseFile.readAsString());
        // For UI purposes, just check if tier is there. The python enforcer does the strict HWID check.
        tier = (lic['tier'] ?? 'UNLICENSED').toString().toUpperCase();
      }

      status.value = AdminStatus(
        tier: tier,
        monetizationEnabled: monetizationEnabled,
        freeEnabled: freeEnabled,
        featureLimits: const {},
        version: '',
        isLoaded: true,
      );
    } catch (e) {
      debugPrint('[AdminService] Fallback status fetch failed: $e');
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
  Future<void> refresh({bool force = false}) => _fetchAll(force: force);

  /// Fires a telemetry event asynchronously. Does not block caller.
  void logEvent(String event) {
    _apiService.logTelemetryEvent(event);
  }
}
