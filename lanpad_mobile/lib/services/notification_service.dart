import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    if (!Platform.isAndroid && !Platform.isIOS && !Platform.isMacOS) {
      _initialized = true;
      return;
    }

    try {
      const androidSettings =
          AndroidInitializationSettings('@mipmap/launcher_icon');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: darwinSettings,
        macOS: darwinSettings,
      );

      // v22 API: all named parameters
      await _plugin.initialize(settings: initSettings);

      // Request Android 13+ permissions
      await _plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();

      _initialized = true;
    } catch (e) {
      print('NotificationService init notice: $e');
    }
  }

  Future<bool> get notificationsEnabled async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(AppConstants.keyNotificationsEnabled) ?? true;
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    if (!Platform.isAndroid && !Platform.isIOS && !Platform.isMacOS) return;
    if (!await notificationsEnabled) return;

    const androidDetails = AndroidNotificationDetails(
      'lanpad_main',
      'LANpad Alerts',
      channelDescription: 'Notifications for LANpad activity',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/launcher_icon',
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // v22 API: all named parameters
    await _plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  Future<void> showFileReceivedNotification() async {
    await showNotification(
      id: 1001,
      title: '📁 New File Received',
      body: 'A file was sent from your laptop via LANpad.',
    );
  }

  Future<void> showPasteReceivedNotification(String preview) async {
    final body = preview.length > 60
        ? '${preview.substring(0, 57)}...'
        : preview;
    await showNotification(
      id: 1002,
      title: '📋 Clipboard Synced',
      body: body.isNotEmpty ? body : 'Text was sent from your laptop.',
    );
  }

  Future<void> showConnectedNotification(String deviceName) async {
    await showNotification(
      id: 1000,
      title: '🔗 Connected to $deviceName',
      body: 'LANpad is ready. Start typing or sharing files!',
    );
  }
}
