import 'package:flutter/material.dart';
import '../config/theme.dart';
import 'liquid_glass_card.dart';

class AppLogo extends StatefulWidget {
  final double size;
  final bool animate;

  const AppLogo({
    super.key,
    this.size = 80,
    this.animate = true,
  });

  @override
  State<AppLogo> createState() => _AppLogoState();
}

class _AppLogoState extends State<AppLogo> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _bobbingAnimation;
  late final Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    _bobbingAnimation = Tween<double>(begin: -4.0, end: 4.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _glowAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    if (widget.animate) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final bobValue = widget.animate ? _bobbingAnimation.value : 0.0;
        final glowValue = widget.animate ? _glowAnimation.value : 0.8;

        return Transform.translate(
          offset: Offset(0, bobValue),
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(widget.size * 0.25),
            ),
            child: LiquidGlassCard(
              padding: EdgeInsets.zero,
              borderRadius: widget.size * 0.25,
              hasGlow: true,
              glowIntensity: glowValue,
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(widget.size * 0.15),
                  child: Image.asset(
                    Theme.of(context).brightness == Brightness.dark
                        ? 'assets/logo_dark_theme.png'
                        : 'assets/logo.png',
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Image.asset(
                        'assets/logo_final_square.png',
                        fit: BoxFit.contain,
                        errorBuilder: (c, e, s) => Icon(
                          Icons.bolt,
                          size: widget.size * 0.55,
                          color: AppTheme.accentColor,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
