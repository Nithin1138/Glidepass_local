import 'dart:io';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config/theme.dart';
import 'screens/splash_screen.dart';
import 'screens/connect_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/desktop/desktop_shell.dart';
import 'services/notification_service.dart';

import 'services/mobile_server_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await AppTheme.init();
  } catch (e) {
    debugPrint('AppTheme.init notice: $e');
  }

  try {
    await NotificationService().init();
  } catch (e) {
    debugPrint('NotificationService.init notice: $e');
  }

  try {
    await MobileServerService().start();
  } catch (e) {
    debugPrint('MobileServerService.start notice: $e');
  }

  if (Platform.isMacOS || Platform.isWindows) {
    try {
      await windowManager.ensureInitialized();
      WindowOptions windowOptions = const WindowOptions(
        size: Size(1000, 650),
        minimumSize: Size(950, 600),
        center: true,
        title: 'LANpad',
        titleBarStyle: TitleBarStyle.normal,
      );
      await windowManager.waitUntilReadyToShow(windowOptions, () async {
        await windowManager.show();
        await windowManager.focus();
      });
      await windowManager.setPreventClose(true);
    } catch (e) {
      debugPrint('windowManager notice: $e');
    }
  }

  bool hasAcceptedAgreement = false;
  try {
    final prefs = await SharedPreferences.getInstance();
    hasAcceptedAgreement = prefs.getBool('has_accepted_agreement') ?? false;
  } catch (e) {
    debugPrint('SharedPreferences notice: $e');
  }

  runApp(LanpadApp(hasAcceptedAgreement: hasAcceptedAgreement));
}

class LanpadApp extends StatelessWidget {
  final bool hasAcceptedAgreement;
  const LanpadApp({super.key, required this.hasAcceptedAgreement});

  @override
  Widget build(BuildContext context) {
    final bool isDesktop = Platform.isMacOS || Platform.isWindows;

    return AnimatedBuilder(
      animation: Listenable.merge([
        AppTheme.themeModeNotifier,
        AppTheme.accentColorNotifier,
      ]),
      builder: (context, _) {
        return MaterialApp(
          title: 'LANpad',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: AppTheme.themeModeNotifier.value,
          initialRoute: '/',
          routes: {
            '/': (context) => isDesktop ? DesktopShell(hasAcceptedAgreement: hasAcceptedAgreement) : const SplashScreen(),
            '/connect': (context) => const ConnectScreen(),
            '/home': (context) => const MainNavigationScreen(),
          },
        );
      },
    );
  }
}
