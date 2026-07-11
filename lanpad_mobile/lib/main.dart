import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'screens/splash_screen.dart';
import 'screens/connect_screen.dart';
import 'screens/home_screen.dart';
import 'screens/command_center_screen.dart';
import 'screens/resources_screen.dart';
import 'screens/files_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LanpadApp());
}

class LanpadApp extends StatelessWidget {
  const LanpadApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LANpad',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/connect': (context) => const ConnectScreen(),
        '/home': (context) => const HomeScreen(),
        '/center': (context) => const CommandCenterScreen(),
        '/resources': (context) => const ResourcesScreen(),
        '/files': (context) => const FilesScreen(),
      },
    );
  }
}
