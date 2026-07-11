import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'screens/splash_screen.dart';
import 'screens/connect_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LanpadApp());
}

class LanpadApp extends StatelessWidget {
  const LanpadApp({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        AppTheme.themeModeNotifier,
        AppTheme.accentColorNotifier,
      ]),
      builder: (context, _) {
        return MaterialApp(
          title: 'LANpad',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.activeTheme,
          themeMode: AppTheme.themeModeNotifier.value,
          builder: (context, child) {
            return AnimatedTheme(
              data: AppTheme.activeTheme,
              duration: const Duration(milliseconds: 600),
              curve: Curves.easeInOut,
              child: child!,
            );
          },
          initialRoute: '/',
          routes: {
            '/': (context) => const SplashScreen(),
            '/connect': (context) => const ConnectScreen(),
            '/home': (context) => const MainNavigationScreen(),
          },
        );
      },
    );
  }
}
