import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../config/theme.dart';
import '../widgets/liquid_glass_card.dart';
import 'home_screen.dart';
import 'command_center_screen.dart';
import 'files_screen.dart';
import 'resources_screen.dart';
import 'profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  static _MainNavigationScreenState? of(BuildContext context) {
    return context.findAncestorStateOfType<_MainNavigationScreenState>();
  }

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const HomeScreen(),
    const CommandCenterScreen(),
    const FilesScreen(),
    const ResourcesScreen(),
    const ProfileScreen(),
  ];

  void setIndex(int index) {
    if (index == _currentIndex) return;
    
    // Trigger haptic response
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }

    setState(() {
      _currentIndex = index;
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark;
    final screenWidth = MediaQuery.of(context).size.width;
    
    // Bottom bar padding and layout calculation
    const double barPadding = 12.0;
    const double barMargin = 16.0;
    final double barWidth = screenWidth - (barMargin * 2);
    final double itemWidth = (barWidth - (barPadding * 2)) / 5;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          // Screen Content Stack
          IndexedStack(
            index: _currentIndex,
            children: _pages,
          ),
          
          // Floating Liquid Glass Tab Bar
          Positioned(
            bottom: barMargin + MediaQuery.of(context).padding.bottom,
            left: barMargin,
            right: barMargin,
            child: SizedBox(
              height: 72,
              child: LiquidGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: barPadding),
                borderRadius: 24,
                isFlat: false, // Include soft neumorphic depth
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildTabItem(0, Icons.home_outlined, 'Home', itemWidth),
                    _buildTabItem(1, LucideIcons.keyboard, 'Control', itemWidth),
                    _buildTabItem(2, LucideIcons.folder_up, 'Transfer', itemWidth),
                    _buildTabItem(3, LucideIcons.book_open, 'Hubs', itemWidth),
                    _buildTabItem(4, LucideIcons.user, 'Settings', itemWidth),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem(int index, IconData icon, String label, double width) {
    final isSelected = _currentIndex == index;
    final isDark = AppTheme.isDark;

    if (index == 2) {
      // Elevated action button in the center (from 1st image design)
      return GestureDetector(
        onTap: () => setIndex(index),
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: 52,
          height: 48,
          decoration: BoxDecoration(
            color: AppTheme.accentColor,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppTheme.accentColor.withOpacity(isDark ? 0.4 : 0.25),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Icon(
              icon,
              size: 22,
              color: Colors.white,
            ),
          ),
        ),
      );
    }

    final activeColor = isDark ? Colors.white : AppTheme.accentColor;
    final inactiveColor = isDark ? Colors.white30 : Colors.black38;

    return GestureDetector(
      onTap: () => setIndex(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: width,
        height: 60,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedScale(
              scale: isSelected ? 1.15 : 1.0,
              duration: const Duration(milliseconds: 150),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: 5),
            // Glowing Active Dot Indicator below the active icon
            AnimatedOpacity(
              opacity: isSelected ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 150),
              child: Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: activeColor,
                  boxShadow: [
                    if (isDark)
                      BoxShadow(
                        color: activeColor.withOpacity(0.5),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
