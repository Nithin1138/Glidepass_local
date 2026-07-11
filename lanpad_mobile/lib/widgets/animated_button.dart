import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/theme.dart';

class AnimatedButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final double scaleOnPressed;
  final Duration duration;
  final Decoration? decoration;
  final EdgeInsetsGeometry padding;

  const AnimatedButton({
    super.key,
    required this.child,
    required this.onTap,
    this.scaleOnPressed = 0.95,
    this.duration = const Duration(milliseconds: 100),
    this.decoration,
    this.padding = const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
  });

  @override
  State<AnimatedButton> createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<AnimatedButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: widget.scaleOnPressed).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _triggerHaptic() {
    final haptic = AppTheme.hapticLevelNotifier.value;
    if (haptic == 'light') {
      HapticFeedback.lightImpact();
    } else if (haptic == 'medium') {
      HapticFeedback.mediumImpact();
    }
  }

  void _onTapDown(TapDownDetails details) {
    _controller.forward();
    _triggerHaptic();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          padding: widget.padding,
          decoration: widget.decoration,
          child: Center(child: widget.child),
        ),
      ),
    );
  }
}
