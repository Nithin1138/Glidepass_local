import 'dart:io';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'config/theme.dart';
import 'screens/splash_screen.dart';
import 'screens/connect_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/desktop_dashboard.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppTheme.init();
  await NotificationService().init();

  if (Platform.isMacOS || Platform.isWindows) {
    await windowManager.ensureInitialized();
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1000, 650),
      minimumSize: Size(950, 600),
      center: true,
      title: 'LANpad',
      titleBarStyle: TitleBarStyle.normal,
    );
    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(const LanpadApp());
}

class LanpadApp extends StatelessWidget {
  const LanpadApp({super.key});

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
            '/': (context) => isDesktop ? const DesktopDashboard() : const SplashScreen(),
            '/connect': (context) => const ConnectScreen(),
            '/home': (context) => const MainNavigationScreen(),
          },
        );
      },
    );
  }
}
