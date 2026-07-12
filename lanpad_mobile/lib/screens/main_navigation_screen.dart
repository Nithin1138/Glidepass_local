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
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final screenWidth = MediaQuery.of(context).size.width;

    const double barMargin = 16.0;
    final double barWidth = screenWidth - (barMargin * 2);

    return AnimatedBuilder(
      animation: Listenable.merge([
        AppTheme.themeModeNotifier,
        AppTheme.accentColorNotifier,
      ]),
      builder: (context, _) {
        return Scaffold(
          resizeToAvoidBottomInset: false,
          body: Stack(
            children: [
              IndexedStack(
                index: _currentIndex,
                children: _pages,
              ),
              Positioned(
                bottom: 8.0 + MediaQuery.of(context).padding.bottom * 0.3,
                left: barMargin,
                right: barMargin,
                child: SizedBox(
                  height: 72,
                  child: LiquidGlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    borderRadius: 38, // Beautiful circular capsule bar matching image 1
                    isFlat: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildTabItem(context, 0, Icons.home_outlined, 'Home'),
                        _buildTabItem(context, 1, LucideIcons.keyboard, 'Control'),
                        _buildTabItem(context, 2, LucideIcons.folder_up, 'Transfer'),
                        _buildTabItem(context, 3, LucideIcons.book_open, 'Hubs'),
                        _buildTabItem(context, 4, LucideIcons.user, 'Settings'),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTabItem(BuildContext context, int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    final isDark = context.isDark;
    final double itemWidth = isSelected 
        ? (label.length > 6 ? 104.0 : 88.0) 
        : 40.0;

    return GestureDetector(
      onTap: () => setIndex(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        width: itemWidth,
        height: 44,
        padding: EdgeInsets.symmetric(horizontal: isSelected ? 12 : 0),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark 
                  ? context.accentColor.withOpacity(0.25) 
                  : const Color(0xFF111111))
              : (isDark 
                  ? Colors.white.withOpacity(0.04) 
                  : Colors.white),
          borderRadius: BorderRadius.circular(22),
          border: isDark
              ? Border.all(
                  color: isSelected 
                      ? context.accentColor.withOpacity(0.4) 
                      : Colors.white.withOpacity(0.06), 
                  width: 0.8,
                )
              : Border.all(
                  color: isSelected 
                      ? Colors.transparent 
                      : Colors.black.withOpacity(0.04), 
                  width: 0.8,
                ),
          boxShadow: (isSelected || isDark)
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Center(
          child: OverflowBox(
            maxWidth: 150,
            minWidth: 0,
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  color: isSelected 
                      ? Colors.white 
                      : (isDark ? Colors.white60 : const Color(0xFF1E293B)),
                  size: 18,
                ),
                if (isSelected) ...[
                  const SizedBox(width: 6),
                  Text(
                    label,
                    overflow: TextOverflow.clip,
                    maxLines: 1,
                    softWrap: false,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
