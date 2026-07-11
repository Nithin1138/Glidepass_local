import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/aurora_background.dart';
import '../widgets/app_logo.dart';
import '../services/connection_service.dart';
import '../config/theme.dart';
import 'main_navigation_screen.dart';
import 'connect_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _scaleAnimation;
  
  // Staggered letters fade animation controllers
  final List<double> _letterOpacityStops = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  final String _logoText = "LANPAD";

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );
    
    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
      ),
    );

    _controller.forward();
    _animateLetters();
    _navigateToNext();
  }

  void _animateLetters() async {
    for (int i = 0; i < _logoText.length; i++) {
      await Future.delayed(const Duration(milliseconds: 100));
      if (mounted) {
        setState(() {
          _letterOpacityStops[i] = 1.0;
        });
      }
    }
  }

  Future<void> _navigateToNext() async {
    // 1. Load preferences early before displaying dashboard
    final prefs = await SharedPreferences.getInstance();
    final hexColor = prefs.getInt('accent_color');
    if (hexColor != null) {
      AppTheme.accentColorNotifier.value = Color(hexColor);
    }
    final themeModeVal = prefs.getInt('theme_mode');
    if (themeModeVal != null) {
      AppTheme.themeModeNotifier.value = themeModeVal == 1 ? ThemeMode.dark : ThemeMode.light;
    }
    final hapticVal = prefs.getString('haptic_level');
    if (hapticVal != null) {
      AppTheme.hapticLevelNotifier.value = hapticVal;
    }

    final connectionService = ConnectionService();
    await connectionService.init();

    await Future.delayed(const Duration(milliseconds: 2200));
    
    if (mounted) {
      // Choose target screen
      final Widget targetScreen = connectionService.isConnected 
          ? const MainNavigationScreen() 
          : const ConnectScreen();

      // Custom Zoom reveal transition
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (context, animation, secondaryAnimation) => targetScreen,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final scaleCurve = CurvedAnimation(parent: animation, curve: Curves.easeInOutCubic);
            final fadeCurve = CurvedAnimation(parent: animation, curve: Curves.easeInOut);
            
            return FadeTransition(
              opacity: Tween<double>(begin: 0.0, end: 1.0).animate(fadeCurve),
              child: ScaleTransition(
                scale: Tween<double>(begin: 1.15, end: 1.0).animate(scaleCurve),
                child: child,
              ),
            );
          },
          transitionDuration: const Duration(milliseconds: 800),
        ),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const AuroraBackground(),
          
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // App Logo Widget
                        const AppLogo(size: 90, animate: true),
                        const SizedBox(height: 24),
                        
                        // Staggered letters row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(_logoText.length, (index) {
                            final isDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark
                                || AppTheme.isDark;
                            final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
                            return AnimatedOpacity(
                              duration: const Duration(milliseconds: 400),
                              opacity: _letterOpacityStops[index],
                              child: Text(
                                _logoText[index],
                                style: TextStyle(
                                  fontFamily: 'Outfit',
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 6.0,
                                  color: textColor,
                                  shadows: isDark
                                      ? const [
                                          Shadow(
                                            color: Colors.white24,
                                            blurRadius: 15,
                                          ),
                                        ]
                                      : const [
                                          Shadow(
                                            color: Color(0x220F172A),
                                            blurRadius: 6,
                                          ),
                                        ],
                                ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
